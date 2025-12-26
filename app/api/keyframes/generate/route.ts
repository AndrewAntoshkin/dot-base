import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { KEYFRAME_MODELS } from '@/lib/keyframes';
import { cookies } from 'next/headers';
import { z } from 'zod';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const partSchema = z.object({
  id: z.string(),
  model: z.enum([
    // I2V модели (Начало – Конец) - поддерживают first+last frame
    'hailuo-02', 'seedance-1-pro', 'seedance-1.5-pro', 'veo-3.1-fast',
    // T2V модели (Без изображений) - только промпт
    'veo-3.1-fast-t2v', 'seedance-1.5-pro-t2v', 'kling-v2.5-turbo-pro', 'hailuo-2.3', 'wan-2.5-t2v'
  ]),
  mode: z.enum(['i2v', 't2v']),
  startImage: z.string().url().nullable().optional(),
  endImage: z.string().url().nullable().optional(),
  prompt: z.string().min(1),
  duration: z.number().optional(),
  aspectRatio: z.string().optional(),
});

const requestSchema = z.object({
  parts: z.array(partSchema).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    logger.info('=== KEYFRAMES GENERATE START ===');
    
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

    logger.info(`Creating keyframe generation with ${parts.length} parts`);

    // Create unique group ID for this keyframe session
    const keyframeGroupId = crypto.randomUUID();

    // Create generation records for ALL segments (pending status)
    const segmentGenerations: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const modelConfig = KEYFRAME_MODELS[part.model];
      const isI2V = part.mode === 'i2v';

      const { data: generation, error } = await (supabase
        .from('generations') as any)
        .insert({
          user_id: userId,
          action: isI2V ? 'video_i2v' : 'video_create',
          model_id: modelConfig.modelId,
          model_name: modelConfig.modelName,
          replicate_model: modelConfig.replicateModel,
          prompt: part.prompt,
          input_image_url: isI2V ? part.startImage : null,
          settings: {
            keyframe_group_id: keyframeGroupId,
            keyframe_index: i,
            keyframe_total: parts.length,
            keyframe_mode: part.mode,
            last_frame_image: isI2V ? part.endImage : null,
            duration: part.duration,
            aspect_ratio: part.aspectRatio,
            // Store original input for potential restart
            keyframe_input: {
              model: part.model,
              mode: part.mode,
              startImage: part.startImage,
              endImage: part.endImage,
              prompt: part.prompt,
              duration: part.duration,
              aspectRatio: part.aspectRatio,
            },
          },
          status: 'pending',
          replicate_input: modelConfig.inputMapper(part),
          is_keyframe_segment: true,
        })
        .select()
        .single();

      if (error || !generation) {
        logger.error('Failed to create segment generation:', error?.message, error?.code);
        return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
      }

      segmentGenerations.push(generation.id);
      logger.info(`Created segment ${i + 1}/${parts.length} generation: ${generation.id}`);
    }

    // Start ONLY the first segment - subsequent segments will be started by webhook
    const firstSegmentId = segmentGenerations[0];
    const firstPart = parts[0];
    const firstModelConfig = KEYFRAME_MODELS[firstPart.model];

    try {
      const replicateClient = getReplicateClient();
      
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
        : undefined;

      const mappedInput = firstModelConfig.inputMapper(firstPart);
      logger.info(`[Keyframes] First part input:`, { 
        model: firstPart.model,
        duration: firstPart.duration,
        mode: firstPart.mode,
      });
      logger.info(`[Keyframes] Mapped input for Replicate:`, mappedInput);

      const { prediction, tokenId } = await replicateClient.run({
        model: firstModelConfig.replicateModel,
        input: mappedInput,
        webhook: webhookUrl,
        webhook_events_filter: webhookUrl ? ['completed'] : undefined,
      });

      // Update first segment to processing
      await (supabase.from('generations') as any)
        .update({
          replicate_prediction_id: prediction.id,
          replicate_token_index: tokenId,
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', firstSegmentId);

      logger.info(`Started first segment: ${firstSegmentId}, prediction: ${prediction.id}`);

    } catch (replicateError: any) {
      logger.error('Failed to start first segment:', replicateError.message);
      
      // Mark first segment as failed
      await (supabase.from('generations') as any)
        .update({ 
          status: 'failed', 
          error_message: replicateError.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', firstSegmentId);

      return NextResponse.json({ error: replicateError.message }, { status: 500 });
    }

    // Return immediately - webhook will handle progress
    return NextResponse.json({
      keyframeGroupId,
      segmentGenerationIds: segmentGenerations,
      status: 'processing',
      message: `Started keyframe generation with ${parts.length} parts`,
    });

  } catch (error: any) {
    logger.error('Keyframes generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}



