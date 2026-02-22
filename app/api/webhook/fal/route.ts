import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';

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

function getUserFriendlyErrorMessage(error: string | null | undefined): string {
  const errorLower = (error || '').toLowerCase();

  if (errorLower.includes('nsfw') || errorLower.includes('safety')) {
    return 'Content blocked by safety filter. Try changing your prompt';
  }
  if (errorLower.includes('timeout')) {
    return 'Generation timed out. Try reducing resolution';
  }
  if (errorLower.includes('memory') || errorLower.includes('oom')) {
    return 'Not enough resources. Try reducing resolution';
  }
  if (errorLower.includes('overload') || errorLower.includes('rate limit')) {
    return 'Server overloaded. Try again in a few minutes';
  }
  if (errorLower.includes('invalid') || errorLower.includes('validation')) {
    return 'Invalid parameters. Check your settings';
  }
  if (!error || error === '' || error === 'null') {
    return 'Generation failed. Try a different model';
  }
  if (error.length > 150 || error.includes('stack') || error.includes('Error:')) {
    return 'An error occurred. Please try again';
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
      }
    } else if (status === 'FAILED' || error) {
      updateData.status = 'failed';
      updateData.error_message = getUserFriendlyErrorMessage(error || 'Generation failed');
      
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
