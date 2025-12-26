/**
 * Keyframe generation utilities
 * Extracted to lib to avoid circular dependencies between API routes
 */

import { getReplicateClient } from '@/lib/replicate/client';
import logger from '@/lib/logger';

// Input type for keyframe parts
export interface KeyframePartInput {
  startImage?: string | null;
  endImage?: string | null;
  prompt: string;
  duration?: number;
  aspectRatio?: string;
  mode?: 'i2v' | 't2v';
}

// Veo 3.1 only accepts 4, 6, 8 as NUMBER - normalize to closest valid value
function normalizeVeoDuration(duration?: number | string): number {
  const d = typeof duration === 'string' ? parseInt(duration, 10) : duration;
  if (!d || isNaN(d)) return 8;
  if (d <= 5) return 4;
  if (d <= 7) return 6;
  return 8;
}

// I2V Model configurations (Начало – Конец) - модели с поддержкой first+last frame
export const I2V_KEYFRAME_MODELS = {
  'hailuo-02': {
    replicateModel: 'minimax/hailuo-02',
    modelId: 'hailuo-02-i2v',
    modelName: 'hailuo-02',
    inputMapper: (part: KeyframePartInput) => ({
      first_frame_image: part.startImage,
      last_frame_image: part.endImage,
      prompt: part.prompt,
      duration: String(part.duration || 6), // Hailuo expects string: "6" or "10"
      prompt_optimizer: true,
    }),
  },
  'seedance-1-pro': {
    replicateModel: 'bytedance/seedance-1-pro',
    modelId: 'seedance-1-pro',
    modelName: 'seedance-1-pro',
    inputMapper: (part: KeyframePartInput) => ({
      image: part.startImage,
      last_frame_image: part.endImage,
      prompt: part.prompt,
      duration: part.duration || 5,
    }),
  },
  'seedance-1.5-pro': {
    replicateModel: 'bytedance/seedance-1.5-pro',
    modelId: 'seedance-1.5-pro-i2v',
    modelName: 'seedance-1.5-pro',
    inputMapper: (part: KeyframePartInput) => ({
      image: part.startImage,
      prompt: part.prompt,
      duration: part.duration || 5,
      resolution: '1080p',
    }),
  },
  'veo-3.1-fast': {
    replicateModel: 'google/veo-3.1-fast',
    modelId: 'veo-3.1-fast-i2v',
    modelName: 'veo-3.1-fast',
    inputMapper: (part: KeyframePartInput) => ({
      image: part.startImage,
      last_frame: part.endImage, // Veo uses "last_frame" not "end_image"
      prompt: part.prompt,
      duration: normalizeVeoDuration(part.duration), // Veo only accepts 4, 6, 8
      aspect_ratio: part.aspectRatio || '16:9',
    }),
  },
} as const;

// T2V Model configurations (Без изображений)
export const T2V_KEYFRAME_MODELS = {
  'veo-3.1-fast-t2v': {
    replicateModel: 'google/veo-3.1-fast',
    modelId: 'veo-3.1-fast-t2v',
    modelName: 'veo-3.1-fast',
    inputMapper: (part: KeyframePartInput) => ({
      prompt: part.prompt,
      duration: normalizeVeoDuration(part.duration), // Veo only accepts 4, 6, 8
      aspect_ratio: part.aspectRatio || '16:9',
    }),
  },
  'seedance-1.5-pro-t2v': {
    replicateModel: 'bytedance/seedance-1.5-pro',
    modelId: 'seedance-1.5-pro-t2v',
    modelName: 'seedance-1.5-pro',
    inputMapper: (part: KeyframePartInput) => ({
      prompt: part.prompt,
      duration: part.duration || 5,
      resolution: '1080p',
      aspect_ratio: part.aspectRatio || '16:9',
    }),
  },
  'kling-v2.5-turbo-pro': {
    replicateModel: 'kwaivgi/kling-v2.5-turbo-pro',
    modelId: 'kling-v2.5-turbo-pro-t2v',
    modelName: 'kling-v2.5-turbo-pro',
    inputMapper: (part: KeyframePartInput) => ({
      prompt: part.prompt,
      duration: part.duration || 5,
      aspect_ratio: part.aspectRatio || '16:9',
    }),
  },
  'hailuo-2.3': {
    replicateModel: 'minimax/hailuo-2.3',
    modelId: 'hailuo-2.3-t2v',
    modelName: 'hailuo-2.3',
    inputMapper: (part: KeyframePartInput) => ({
      prompt: part.prompt,
      duration: part.duration || 6, // Hailuo 2.3 accepts integer (6 or 10)
      prompt_optimizer: true,
    }),
  },
  'wan-2.5-t2v': {
    replicateModel: 'wan-video/wan-2.5-t2v',
    modelId: 'wan-2.5-t2v',
    modelName: 'wan-2.5-t2v',
    inputMapper: (part: KeyframePartInput) => ({
      prompt: part.prompt,
      duration: part.duration || 5,
      size: part.aspectRatio === '9:16' ? '720*1280' : '1280*720', // Wan uses "size" not "aspect_ratio"
      enable_prompt_expansion: true,
    }),
  },
} as const;

// Combined models for backwards compatibility
export const KEYFRAME_MODELS = {
  ...I2V_KEYFRAME_MODELS,
  ...T2V_KEYFRAME_MODELS,
} as const;

export type KeyframeModelId = keyof typeof KEYFRAME_MODELS;

/**
 * Start the next keyframe segment or merge after a segment completes
 * Called from webhook when a keyframe segment finishes
 */
export async function startNextKeyframeSegment(
  completedGenerationId: string,
  supabase: any
): Promise<{ started: boolean; type?: 'segment' | 'merge'; generationId?: string }> {
  // Get completed generation details
  const { data: completedGen } = await (supabase
    .from('generations') as any)
    .select('*')
    .eq('id', completedGenerationId)
    .single();

  if (!completedGen || !completedGen.settings?.keyframe_group_id) {
    return { started: false };
  }

  const keyframeGroupId = completedGen.settings.keyframe_group_id;
  const currentIndex = completedGen.settings.keyframe_index;
  const totalSegments = completedGen.settings.keyframe_total;

  logger.info(`Keyframe segment ${currentIndex + 1}/${totalSegments} completed for group ${keyframeGroupId}`);

  // Get all segments for this group
  const { data: allSegments } = await (supabase
    .from('generations') as any)
    .select('*')
    .eq('user_id', completedGen.user_id)
    .eq('is_keyframe_segment', true)
    .contains('settings', { keyframe_group_id: keyframeGroupId })
    .order('created_at', { ascending: true });

  if (!allSegments) {
    return { started: false };
  }

  // Check if there's a next segment to start
  const nextSegment = allSegments.find((s: any) => 
    s.settings?.keyframe_index === currentIndex + 1 && s.status === 'pending'
  );

  if (nextSegment) {
    // Start next segment
    const keyframeInput = nextSegment.settings?.keyframe_input;
    if (!keyframeInput) {
      logger.error('Missing keyframe_input in next segment');
      return { started: false };
    }

    const modelConfig = KEYFRAME_MODELS[keyframeInput.model as KeyframeModelId];
    if (!modelConfig) {
      logger.error('Unknown model:', keyframeInput.model);
      return { started: false };
    }

    try {
      const replicateClient = getReplicateClient();
      
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
        : undefined;

      const { prediction, tokenId } = await replicateClient.run({
        model: modelConfig.replicateModel,
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

      logger.info(`Started next segment ${currentIndex + 2}/${totalSegments}: ${nextSegment.id}`);
      
      return { started: true, type: 'segment', generationId: nextSegment.id };

    } catch (error: any) {
      logger.error('Failed to start next segment:', error.message);
      
      await (supabase.from('generations') as any)
        .update({ 
          status: 'failed', 
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', nextSegment.id);
      
      return { started: false };
    }
  }

  // All segments completed - start merge if multiple segments
  const completedSegments = allSegments.filter((s: any) => s.status === 'completed');
  
  if (completedSegments.length === totalSegments) {
    logger.info(`All ${totalSegments} segments completed`);
    
    // If only 1 segment - no merge needed
    if (totalSegments === 1) {
      logger.info('Only 1 segment, no merge needed');
      return { started: false };
    }
    
    const segmentVideos = completedSegments
      .sort((a: any, b: any) => a.settings.keyframe_index - b.settings.keyframe_index)
      .map((s: any) => s.output_urls?.[0])
      .filter(Boolean);

    if (segmentVideos.length < 2) {
      logger.info('Less than 2 video URLs, skipping merge');
      return { started: false };
    }

    try {
      // Create merge generation record
      const { data: mergeGeneration, error: mergeError } = await (supabase
        .from('generations') as any)
        .insert({
          user_id: completedGen.user_id,
          workspace_id: completedGen.workspace_id,
          action: 'video_edit',
          model_id: 'video-merge',
          model_name: 'video-merge',
          replicate_model: 'lucataco/video-merge',
          prompt: `Merge ${totalSegments} keyframe segments`,
          settings: {
            keyframe_group_id: keyframeGroupId,
            keyframe_merge: true,
            segment_generation_ids: completedSegments.map((s: any) => s.id),
          },
          status: 'processing',
          started_at: new Date().toISOString(),
          replicate_input: {
            video_files: segmentVideos,
            keep_audio: true,
          },
          is_keyframe_segment: false,
        })
        .select()
        .single();

      if (mergeError || !mergeGeneration) {
        logger.error('Failed to create merge generation:', mergeError);
        return { started: false };
      }

      const replicateClient = getReplicateClient();
      
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
        : undefined;

      logger.info('Starting video merge with URLs:', segmentVideos);

      const { prediction, tokenId } = await replicateClient.run({
        model: 'lucataco/video-merge',
        version: '65c81d0d0689d8608af8c2f59728135925419f4b5e62065c37fc350130fed67a',
        input: {
          video_files: segmentVideos,
          keep_audio: true,
        },
        webhook: webhookUrl,
        webhook_events_filter: webhookUrl ? ['completed'] : undefined,
      });

      await (supabase.from('generations') as any)
        .update({ 
          replicate_prediction_id: prediction.id,
          replicate_token_index: tokenId,
        })
        .eq('id', mergeGeneration.id);

      logger.info(`Started merge generation: ${mergeGeneration.id}, prediction: ${prediction.id}`);
      
      return { started: true, type: 'merge', generationId: mergeGeneration.id };

    } catch (error: any) {
      logger.error('Failed to start merge:', error.message);
      // Merge failed to start - but segments are still available as fallback
      return { started: false };
    }
  }

  return { started: false };
}
