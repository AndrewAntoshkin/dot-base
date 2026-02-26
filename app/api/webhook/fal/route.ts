import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';
import { writeWarningLog } from '@/lib/api-log';
import { reportSuccess, reportError } from '@/lib/providers/dispatcher';

interface GenerationRecord {
  id: string;
  user_id: string;
  status: string;
  replicate_prediction_id?: string;
  output_urls?: string[];
  error_message?: string;
  action: string;
  model_id: string;
  replicate_model: string;
  settings?: Record<string, any>;
  cost_credits?: number;
  cost_usd?: number;
  [key: string]: any;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

function formatErrorMessage(error: string | null | undefined): string {
  if (!error || error === '' || error === 'null' || error === 'undefined') {
    return 'Generation failed';
  }
  if (error.length > 300) {
    return error.slice(0, 300) + '...';
  }
  return error;
}

function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return false;
  }
  
  const lowercaseUrl = value.toLowerCase();
  
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv'];
  if (mediaExtensions.some(ext => lowercaseUrl.includes(ext))) {
    return true;
  }
  
  const trustedMediaHosts = [
    'fal.media',
    'fal.run',
    'fal-cdn',
    'storage.googleapis.com',
    'supabase.co/storage',
  ];
  if (trustedMediaHosts.some(host => lowercaseUrl.includes(host))) {
    return true;
  }
  
  return false;
}

/**
 * Fal.ai Webhook Handler
 * Handles completion callbacks from fal.ai
 */
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();

    // Fal.ai webhook payload structure
    const { request_id: requestId, status, payload, error } = body;

    logger.info('[Fal Webhook] Received:', JSON.stringify({ requestId, status, hasPayload: !!payload, error }));

    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find generation by fal request_id (stored in replicate_prediction_id field)
    let generation: GenerationRecord | null = null;
    try {
      generation = await withRetry(async () => {
        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .eq('replicate_prediction_id', requestId)
          .single();
        if (error) throw error;
        return data;
      }) as GenerationRecord;
    } catch {
      logger.warn('[Fal Webhook] Generation not found:', requestId);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Idempotency check
    if (generation.status === 'completed' || generation.status === 'failed') {
      logger.info('[Fal Webhook] Already processed, skipping:', generation.id);
      return NextResponse.json({ success: true, skipped: true });
    }

    const updateData: any = { replicate_output: body };  // Use same column for both providers

    if ((status === 'COMPLETED' || status === 'OK') && payload) {
      let mediaUrls: string[] = [];
      
      // Extract video URL from fal.ai response
      // Kling returns: { video: { url: "..." } }
      if (payload.video?.url && isMediaUrl(payload.video.url)) {
        mediaUrls = [payload.video.url];
      }
      // Nano Banana Pro returns: { images: [{ url: "...", content_type: "..." }] }
      else if (payload.images && Array.isArray(payload.images)) {
        mediaUrls = payload.images
          .filter((img: any) => img?.url && isMediaUrl(img.url))
          .map((img: any) => img.url);
      }
      // Some models return: { image: { url: "..." } }
      else if (payload.image?.url && isMediaUrl(payload.image.url)) {
        mediaUrls = [payload.image.url];
      }
      // Some models return direct URL
      else if (typeof payload === 'string' && isMediaUrl(payload)) {
        mediaUrls = [payload];
      }
      // Array of outputs
      else if (Array.isArray(payload)) {
        mediaUrls = payload
          .filter((item: any) => {
            if (typeof item === 'string') return isMediaUrl(item);
            if (item?.url) return isMediaUrl(item.url);
            return false;
          })
          .map((item: any) => typeof item === 'string' ? item : item.url);
      }
      
      if (mediaUrls.length === 0) {
        logger.error('[Fal Webhook] No media URLs found in payload:', JSON.stringify(payload));
        updateData.status = 'failed';
        updateData.error_message = 'Failed to extract generation output';
      } else {
        logger.info('[Fal Webhook] Generation completed, saving media:', generation.id);
        
        // Синхронное сохранение медиа в Supabase Storage
        // Важно: в serverless среде (Vercel) background tasks не работают после отправки ответа
        const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(mediaUrls, generation.id);
        
        if (savedUrls.length > 0) {
          updateData.status = 'completed';
          updateData.output_urls = savedUrls;
          updateData.output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
          
          logger.info('[Fal Webhook] Media saved successfully:', generation.id, 'URLs:', savedUrls);
          
          // Обновляем flow_nodes с постоянными URL
          const { data: flowNodes } = await (supabase.from('flow_nodes') as any)
            .select('id')
            .eq('generation_id', generation.id);
          
          if (flowNodes && flowNodes.length > 0) {
            for (const node of flowNodes) {
              await (supabase.from('flow_nodes') as any)
                .update({ output_url: savedUrls[0] })
                .eq('id', node.id);
            }
            logger.debug(`[Fal Webhook] Updated ${flowNodes.length} flow node(s) with permanent URL for generation ${generation.id}`);
          }
        } else {
          // Если не удалось сохранить в Storage, используем временные URL
          logger.warn('[Fal Webhook] Media save failed, using temporary Fal URLs:', generation.id);
          updateData.status = 'completed';
          updateData.output_urls = mediaUrls;
          updateData.output_thumbs = null;
        }
        
        // Deduct credits
        try {
          await (supabase.rpc as any)('decrement_credits', {
            user_id_param: generation.user_id,
            credits_param: generation.cost_credits || 1,
          });
        } catch {}

        // Report success to dispatcher (clears cooldown)
        await reportSuccess('fal').catch(() => {});
      }
    } else if (status === 'FAILED' || error) {
      const currentRetryCount = generation.settings?.auto_retry_count || 0;
      const errorMsg = error || 'Generation failed';

      // Chain retry for google-primary models (nano-banana-pro): Fal failed → retry Replicate
      const model = getModelById(generation.model_id);
      const isChainModel = model?.provider === 'google' && !!model.falFallbackModel;
      const MAX_CHAIN_RETRIES = 3;

      if (isChainModel && currentRetryCount < MAX_CHAIN_RETRIES) {
        const replicateModel = model.fallbackModel;
        if (replicateModel) {
          try {
            const replicateClient = getReplicateClient();
            const webhookUrl = process.env.NEXTAUTH_URL
              ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
              : undefined;

            const replicateInput = generation.replicate_input || {};
            delete replicateInput.auto_retry_count;

            const { prediction, tokenId } = await replicateClient.run({
              model: replicateModel,
              version: model.version,
              input: replicateInput,
              webhook: webhookUrl,
              webhook_events_filter: webhookUrl ? ['completed'] : undefined,
            });

            const newRetryCount = currentRetryCount + 1;
            await (supabase.from('generations') as any)
              .update({
                replicate_prediction_id: prediction.id,
                replicate_token_index: tokenId,
                replicate_model: replicateModel,
                status: 'processing',
                error_message: null,
                settings: {
                  ...generation.settings,
                  fallback_provider: 'replicate',
                  original_provider: 'google',
                  fal_error: errorMsg,
                  auto_retry_count: newRetryCount,
                },
              })
              .eq('id', generation.id);

            writeWarningLog({
              path: '/api/webhook/fal',
              provider: 'fal',
              model_name: generation.model_name,
              generation_id: generation.id,
              user_id: generation.user_id,
              message: `Chain fallback attempt ${newRetryCount}: Fal -> Replicate. Reason: ${errorMsg}`,
              details: {
                original_provider: 'google',
                fallback_provider: 'replicate',
                retry_count: newRetryCount,
                error: errorMsg,
              },
            });

            logger.info(`[Chain Fallback] Fal -> Replicate (attempt ${newRetryCount}):`, generation.id, prediction.id);

            return NextResponse.json({
              success: true,
              retried: true,
              fallback: 'replicate',
              retryCount: newRetryCount,
              newPredictionId: prediction.id,
            });
          } catch (retryError: any) {
            logger.error('[Chain Fallback] Replicate also failed:', retryError.message);
          }
        }
      }

      updateData.status = 'failed';
      updateData.error_message = formatErrorMessage(errorMsg);

      // Report error to dispatcher (triggers cooldown)
      await reportError('fal').catch(() => {});

      // Log failed generation to api_logs for admin visibility
      writeWarningLog({
        path: '/api/webhook/fal',
        provider: 'fal',
        model_name: generation.model_name,
        generation_id: generation.id,
        user_id: generation.user_id,
        message: `Generation failed: ${errorMsg}${currentRetryCount > 0 ? ` (after ${currentRetryCount} retries)` : ''}`,
        details: {
          error: errorMsg,
          retry_count: currentRetryCount,
          request_id: requestId,
        },
      });

      logger.error('[Fal Webhook] Generation failed:', generation.id, error);
    }

    // Update DB
    try {
      await withRetry(async () => {
        const { error: updateError } = await (supabase.from('generations') as any)
          .update(updateData)
          .eq('id', generation.id);
        if (updateError) throw updateError;
      });
    } catch (updateError: any) {
      logger.error('[Fal Webhook] Failed to update generation:', updateError.message);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler, { provider: 'fal' });
