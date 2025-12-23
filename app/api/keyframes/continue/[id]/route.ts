import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { KEYFRAME_MODELS } from '@/lib/keyframes';
import logger from '@/lib/logger';

// Note: Video merge is disabled for now - segments are played sequentially in the client

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

    // All segments done - no merge needed, segments are the final result
    return NextResponse.json({ success: true, type: 'completed' });

  } catch (error: any) {
    logger.error('Continue keyframe error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

