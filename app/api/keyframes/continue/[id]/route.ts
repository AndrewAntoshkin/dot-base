import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { KEYFRAME_MODELS } from '@/lib/keyframes';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';

export const dynamic = 'force-dynamic';

async function postHandler(
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
    
    if (completedSegments.length === totalSegments && totalSegments > 1) {
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

      // Get video URLs
      const videoUrls = completedSegments
        .sort((a: any, b: any) => (a.settings?.keyframe_index || 0) - (b.settings?.keyframe_index || 0))
        .map((s: any) => s.output_urls?.[0])
        .filter(Boolean);
      
      if (videoUrls.length < 2) {
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
          action: 'video_edit',
          model_id: 'video-merge',
          model_name: 'video-merge',
          replicate_model: 'lucataco/video-merge',
          settings: {
            keyframe_group_id: keyframeGroupId,
            keyframe_merge: true,
            segment_count: videoUrls.length,
          },
          status: 'pending',
          cost_credits: 1,
          replicate_input: {
            video_files: videoUrls,
            keep_audio: true,
          },
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

      logger.info('Continue: Starting video merge with URLs:', videoUrls);

      const { prediction, tokenId } = await replicateClient.run({
        model: 'lucataco/video-merge',
        version: '65c81d0d0689d8608af8c2f59728135925419f4b5e62065c37fc350130fed67a',
        input: {
          video_files: videoUrls,
          keep_audio: true,
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

    return NextResponse.json({ success: true, type: 'completed' });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(postHandler, { provider: 'replicate' });
