import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { KEYFRAME_MODELS } from '@/lib/keyframes';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: generationId } = await params;
    const supabase = createServiceRoleClient();

    // Get the completed generation
    const { data: completedGen, error } = await (supabase
      .from('generations') as any)
      .select('*')
      .eq('id', generationId)
      .single();

    if (error || !completedGen) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (!completedGen.is_keyframe_segment) {
      return NextResponse.json({ error: 'Not a keyframe segment' }, { status: 400 });
    }

    const keyframeGroupId = completedGen.settings?.keyframe_group_id;
    const currentIndex = completedGen.settings?.keyframe_index ?? 0;
    const totalSegments = completedGen.settings?.keyframe_total ?? 1;

    // Check if there's a next segment to start
    if (currentIndex < totalSegments - 1) {
      // Find next pending segment
      const { data: nextSegment } = await (supabase
        .from('generations') as any)
        .select('*')
        .eq('user_id', completedGen.user_id)
        .eq('status', 'pending')
        .eq('is_keyframe_segment', true)
        .contains('settings', { 
          keyframe_group_id: keyframeGroupId,
          keyframe_index: currentIndex + 1 
        })
        .single();

      if (nextSegment) {
        // Start next segment
        const modelId = nextSegment.replicate_input?.model_id as keyof typeof KEYFRAME_MODELS | undefined;
        const modelConfig = (modelId ? KEYFRAME_MODELS[modelId] : null) || 
                           Object.values(KEYFRAME_MODELS).find(m => 
                             m.replicateModel === nextSegment.replicate_model
                           );

        if (modelConfig) {
          const replicateClient = getReplicateClient();
          
          const webhookUrl = process.env.NODE_ENV === 'production' 
            ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
            : undefined;

          const { prediction, tokenId } = await replicateClient.run({
            model: nextSegment.replicate_model,
            input: nextSegment.replicate_input,
            webhook: webhookUrl,
            webhook_events_filter: webhookUrl ? ['completed'] : undefined,
          });

          await (supabase.from('generations') as any)
            .update({
              replicate_prediction_id: prediction.id,
              replicate_token_index: tokenId,
              status: 'processing',
              started_at: new Date().toISOString(),
            })
            .eq('id', nextSegment.id);

          logger.info(`Continue: Started next segment ${nextSegment.id}`);
          return NextResponse.json({ 
            success: true, 
            type: 'segment', 
            generationId: nextSegment.id 
          });
        }
      }
    }

    // All segments done - check if we need to start merge
    const { data: allSegments } = await (supabase
      .from('generations') as any)
      .select('*')
      .eq('user_id', completedGen.user_id)
      .eq('is_keyframe_segment', true)
      .contains('settings', { keyframe_group_id: keyframeGroupId })
      .order('created_at', { ascending: true });

    const completedSegments = allSegments?.filter((s: any) => s.status === 'completed') || [];
    
    if (completedSegments.length === totalSegments) {
      // Check if merge already exists
      const { data: existingMerge } = await (supabase
        .from('generations') as any)
        .select('id')
        .eq('user_id', completedGen.user_id)
        .contains('settings', { 
          keyframe_group_id: keyframeGroupId,
          keyframe_merge: true 
        })
        .single();

      if (existingMerge) {
        return NextResponse.json({ 
          success: true, 
          type: 'merge_exists', 
          generationId: existingMerge.id 
        });
      }

      // Start merge
      const videoUrls = completedSegments.map((s: any) => s.output_urls?.[0]).filter(Boolean);
      
      if (videoUrls.length < 2) {
        // Only one video - no merge needed
        return NextResponse.json({ 
          success: true, 
          type: 'single_video',
          videoUrl: videoUrls[0]
        });
      }

      // Create merge generation
      const { data: mergeGen, error: mergeError } = await (supabase
        .from('generations') as any)
        .insert({
          user_id: completedGen.user_id,
          action: 'video_merge',
          model_id: 'video-merge',
          model_name: 'Video Merge',
          replicate_model: 'fofr/video-to-video:53afdce37ffa38fbd2b1c6e2c6e8b93b5cb3a0ce4dfb3c79a5ebb6cbe0c2d9cc',
          settings: {
            keyframe_group_id: keyframeGroupId,
            keyframe_merge: true,
            segment_count: videoUrls.length,
          },
          status: 'pending',
          cost_credits: 1,
        })
        .select()
        .single();

      if (mergeError || !mergeGen) {
        logger.error('Failed to create merge generation:', mergeError);
        return NextResponse.json({ error: 'Failed to create merge' }, { status: 500 });
      }

      // Start merge on Replicate
      const replicateClient = getReplicateClient();
      
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
        : undefined;

      const { prediction, tokenId } = await replicateClient.run({
        model: 'fofr/video-merge',
        input: {
          video_files: videoUrls.join('\n'),
          transition: 'crossfade',
          transition_duration: 0.5,
        },
        webhook: webhookUrl,
        webhook_events_filter: webhookUrl ? ['completed'] : undefined,
      });

      await (supabase.from('generations') as any)
        .update({
          replicate_prediction_id: prediction.id,
          replicate_token_index: tokenId,
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', mergeGen.id);

      logger.info(`Continue: Started merge ${mergeGen.id}`);
      return NextResponse.json({ 
        success: true, 
        type: 'merge', 
        generationId: mergeGen.id 
      });
    }

    return NextResponse.json({ success: true, type: 'waiting' });

  } catch (error: any) {
    logger.error('Continue keyframe error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

