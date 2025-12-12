import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { saveMediaToStorage } from '@/lib/supabase/storage';
import { cookies } from 'next/headers';
import { z } from 'zod';

const partSchema = z.object({
  id: z.string(),
  model: z.enum(['hailuo-02', 'seedance-1-pro']),
  startImage: z.string().url(),
  endImage: z.string().url(),
  prompt: z.string().min(1),
});

const requestSchema = z.object({
  parts: z.array(partSchema).min(1).max(10),
});

// Model configurations
const MODELS = {
  'hailuo-02': {
    replicateModel: 'minimax/hailuo-02',
    modelId: 'hailuo-02-i2v',
    modelName: 'hailuo-02',
    inputMapper: (part: z.infer<typeof partSchema>) => ({
      first_frame_image: part.startImage,
      last_frame_image: part.endImage,
      prompt: part.prompt,
      duration: '6',
      resolution: '1080p',
      prompt_optimizer: true,
    }),
  },
  'seedance-1-pro': {
    replicateModel: 'bytedance/seedance-1-pro',
    modelId: 'seedance-1-pro',
    modelName: 'seedance-1-pro',
    inputMapper: (part: z.infer<typeof partSchema>) => ({
      image: part.startImage,
      last_frame_image: part.endImage,
      prompt: part.prompt,
      duration: 6,
      resolution: '1080p',
    }),
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log('=== KEYFRAMES GENERATE START ===');
    
    // Auth check
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const supabase = createServiceRoleClient();

    // Parse and validate request
    const body = await request.json();
    const { parts } = requestSchema.parse(body);

    console.log(`Creating keyframe generation with ${parts.length} parts`);

    // Create unique group ID for this keyframe session
    const keyframeGroupId = crypto.randomUUID();

    // Create generation records for each segment
    const segmentGenerations: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const modelConfig = MODELS[part.model];
      
      const { data: generation, error } = await (supabase
        .from('generations') as any)
        .insert({
          user_id: userId,
          action: 'video_i2v',
          model_id: modelConfig.modelId,
          model_name: modelConfig.modelName,
          replicate_model: modelConfig.replicateModel,
          prompt: part.prompt,
          input_image_url: part.startImage,
          settings: {
            keyframe_group_id: keyframeGroupId,
            keyframe_index: i,
            keyframe_total: parts.length,
            last_frame_image: part.endImage,
          },
          status: 'pending',
          replicate_input: modelConfig.inputMapper(part),
          // Note: keyframe_index in settings is used to filter from list (not is_keyframe_segment column)
        })
        .select()
        .single();

      if (error || !generation) {
        console.error('Failed to create segment generation:', error);
        return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
      }

      segmentGenerations.push(generation.id);
      console.log(`Created segment ${i + 1} generation: ${generation.id}`);
    }

    // Start processing in background
    processKeyframeGeneration(keyframeGroupId, userId, parts, segmentGenerations, supabase).catch(console.error);

    return NextResponse.json({
      keyframeGroupId,
      segmentGenerationIds: segmentGenerations,
      status: 'processing',
      message: 'Keyframe generation started',
    });

  } catch (error: any) {
    console.error('Keyframes generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processKeyframeGeneration(
  keyframeGroupId: string,
  userId: string,
  parts: z.infer<typeof partSchema>[],
  segmentGenerationIds: string[],
  supabase: any
) {
  const replicateClient = getReplicateClient();
  const segmentVideos: string[] = [];

  try {
    // Generate each segment sequentially
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const generationId = segmentGenerationIds[i];
      const modelConfig = MODELS[part.model];
      
      console.log(`Processing segment ${i + 1}/${parts.length}: ${part.model}`);
      
      // Update status to processing
      await (supabase.from('generations') as any)
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', generationId);

      try {
        const input = modelConfig.inputMapper(part);
        
        const { prediction, tokenId } = await replicateClient.run({
          model: modelConfig.replicateModel,
          input,
        });

        // Save prediction ID
        await (supabase.from('generations') as any)
          .update({ 
            replicate_prediction_id: prediction.id,
            replicate_token_index: tokenId,
          })
          .eq('id', generationId);

        console.log(`Segment ${i + 1} prediction created: ${prediction.id}`);

        // Wait for completion
        const result = await replicateClient.waitForPrediction(
          prediction.id,
          undefined,
          600000, // 10 min
          5000
        );

        if (result.status === 'succeeded' && result.output) {
          const replicateVideoUrl = typeof result.output === 'string' 
            ? result.output 
            : result.output.video || result.output[0];
          
          // Save video to permanent storage
          console.log(`Saving segment ${i + 1} video to storage...`);
          const savedVideoUrl = await saveMediaToStorage(replicateVideoUrl, generationId, 0);
          const videoUrl = savedVideoUrl || replicateVideoUrl;
          
          segmentVideos.push(videoUrl);
          
          // Update generation as completed
          await (supabase.from('generations') as any)
            .update({ 
              status: 'completed',
              output_urls: [videoUrl],
              replicate_output: result.output,
              completed_at: new Date().toISOString(),
            })
            .eq('id', generationId);

          console.log(`Segment ${i + 1} completed and saved: ${videoUrl}`);
        } else {
          throw new Error(result.error || 'Generation failed');
        }
      } catch (segmentError: any) {
        console.error(`Segment ${i + 1} failed:`, segmentError.message);
        
        await (supabase.from('generations') as any)
          .update({ 
            status: 'failed',
            error_message: segmentError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', generationId);
        
        return; // Stop if any segment fails
      }
    }

    // All segments completed - create merge generation
    console.log('All segments completed, creating merge generation...');

    const { data: mergeGeneration, error: mergeError } = await (supabase
      .from('generations') as any)
      .insert({
        user_id: userId,
        action: 'video_edit',
        model_id: 'video-merge',
        model_name: 'video-merge',
        replicate_model: 'lucataco/video-merge',
        prompt: `Merge ${parts.length} keyframe segments`,
        settings: {
          keyframe_group_id: keyframeGroupId,
          keyframe_merge: true,
          segment_generation_ids: segmentGenerationIds,
        },
        status: 'processing',
        started_at: new Date().toISOString(),
        replicate_input: {
          video_files: segmentVideos,
          keep_audio: true,
        },
        // Note: keyframe_merge=true in settings makes this show in list (not is_keyframe_segment column)
      })
      .select()
      .single();

    if (mergeError || !mergeGeneration) {
      console.error('Failed to create merge generation:', mergeError);
      return;
    }

    console.log(`Merge generation created: ${mergeGeneration.id}`);

    try {
      const { prediction: mergePrediction, tokenId } = await replicateClient.run({
        model: 'lucataco/video-merge',
        version: '65c81d0d0689d8608af8c2f59728135925419f4b5e62065c37fc350130fed67a',
        input: {
          video_files: segmentVideos,
          keep_audio: true,
        },
      });

      await (supabase.from('generations') as any)
        .update({ 
          replicate_prediction_id: mergePrediction.id,
          replicate_token_index: tokenId,
        })
        .eq('id', mergeGeneration.id);

      const mergeResult = await replicateClient.waitForPrediction(
        mergePrediction.id,
        undefined,
        600000,
        5000
      );

      if (mergeResult.status === 'succeeded' && mergeResult.output) {
        const replicateFinalUrl = typeof mergeResult.output === 'string' 
          ? mergeResult.output 
          : mergeResult.output[0];
        
        // Save merged video to permanent storage
        console.log('Saving merged video to storage...');
        const savedFinalUrl = await saveMediaToStorage(replicateFinalUrl, mergeGeneration.id, 0);
        const finalVideoUrl = savedFinalUrl || replicateFinalUrl;
        
        console.log('Merge completed and saved:', finalVideoUrl);
        
        await (supabase.from('generations') as any)
          .update({ 
            status: 'completed',
            output_urls: [finalVideoUrl],
            replicate_output: mergeResult.output,
            completed_at: new Date().toISOString(),
          })
          .eq('id', mergeGeneration.id);
      } else {
        throw new Error(mergeResult.error || 'Merge failed');
      }
    } catch (mergeErr: any) {
      console.error('Merge failed:', mergeErr.message);
      
      await (supabase.from('generations') as any)
        .update({ 
          status: 'failed',
          error_message: mergeErr.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', mergeGeneration.id);
    }

  } catch (error: any) {
    console.error('Keyframe generation failed:', error);
  }
}


