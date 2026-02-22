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
  if (errorLower.includes('credits') || errorLower.includes('balance')) {
    return 'Insufficient credits. Top up Higgsfield balance';
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
  
  // Trust Higgsfield CDN and common storage hosts
  const trustedMediaHosts = [
    'higgsfield',
    'storage.googleapis.com',
    'supabase.co/storage',
    's3.amazonaws.com',
    'cloudfront.net',
  ];
  if (trustedMediaHosts.some(host => lowercaseUrl.includes(host))) {
    return true;
  }
  
  return false;
}

/**
 * Higgsfield Webhook Handler
 * Handles completion callbacks from Higgsfield API
 * 
 * Payload structure:
 * - status: 'completed' | 'failed' | 'nsfw'
 * - request_id: string
 * - images?: [{ url: string }] (for image generation)
 * - video?: { url: string } (for video generation)
 * - error?: string (for failed status)
 */
async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both direct and nested payload structures
    // Some Higgsfield responses have video/images at top level, others in payload
    const { request_id: requestId, status, error, payload } = body;
    const images = body.images || payload?.images;
    const video = body.video || payload?.video;

    logger.info('[Higgsfield Webhook] Received:', JSON.stringify({ 
      requestId, 
      status, 
      hasImages: !!images, 
      hasVideo: !!video, 
      hasPayload: !!payload,
      error 
    }));

    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find generation by Higgsfield request_id (stored in replicate_prediction_id field)
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
      logger.warn('[Higgsfield Webhook] Generation not found:', requestId);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Idempotency check
    if (generation.status === 'completed' || generation.status === 'failed') {
      logger.info('[Higgsfield Webhook] Already processed, skipping:', generation.id);
      return NextResponse.json({ success: true, skipped: true });
    }

    const updateData: any = { replicate_output: body };  // Use same column for all providers

    if (status === 'completed') {
      let mediaUrls: string[] = [];
      
      // Extract URLs from Higgsfield response
      // Video generation: { video: { url: "..." } }
      if (video?.url && isMediaUrl(video.url)) {
        mediaUrls = [video.url];
      }
      // Image generation: { images: [{ url: "..." }] }
      else if (images && Array.isArray(images)) {
        mediaUrls = images
          .filter((item: any) => item?.url && isMediaUrl(item.url))
          .map((item: any) => item.url);
      }
      
      if (mediaUrls.length === 0) {
        logger.error('[Higgsfield Webhook] No media URLs found in payload:', JSON.stringify(body));
        updateData.status = 'failed';
        updateData.error_message = 'Failed to extract generation output';
      } else {
        logger.info('[Higgsfield Webhook] Generation completed, saving media:', generation.id);
        
        // Save media to Supabase Storage
        const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(mediaUrls, generation.id);
        
        if (savedUrls.length > 0) {
          updateData.status = 'completed';
          updateData.output_urls = savedUrls;
          updateData.output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
          
          logger.info('[Higgsfield Webhook] Media saved successfully:', generation.id, 'URLs:', savedUrls);
          
          // Update flow_nodes with permanent URLs
          const { data: flowNodes } = await (supabase.from('flow_nodes') as any)
            .select('id')
            .eq('generation_id', generation.id);
          
          if (flowNodes && flowNodes.length > 0) {
            for (const node of flowNodes) {
              await (supabase.from('flow_nodes') as any)
                .update({ output_url: savedUrls[0] })
                .eq('id', node.id);
            }
            logger.debug(`[Higgsfield Webhook] Updated ${flowNodes.length} flow node(s) with permanent URL for generation ${generation.id}`);
          }
        } else {
          // If storage save failed, use temporary URLs
          logger.warn('[Higgsfield Webhook] Media save failed, using temporary Higgsfield URLs:', generation.id);
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
    } else if (status === 'failed' || error) {
      updateData.status = 'failed';
      updateData.error_message = getUserFriendlyErrorMessage(error || 'Generation failed');
      
      logger.error('[Higgsfield Webhook] Generation failed:', generation.id, error);
    } else if (status === 'nsfw') {
      updateData.status = 'failed';
      updateData.error_message = 'Content blocked by safety filter';
      
      logger.warn('[Higgsfield Webhook] Generation flagged as NSFW:', generation.id);
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
      logger.error('[Higgsfield Webhook] Failed to update generation:', updateError.message);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler, { provider: 'higgsfield' });
