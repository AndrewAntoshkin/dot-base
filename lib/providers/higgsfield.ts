import { getHiggsfieldClient } from '@/lib/higgsfield/client';
import logger from '@/lib/logger';
import type { Model } from '@/lib/models-config';
import type {
  GenerationProvider,
  ProviderSubmitParams,
  GenerationResult,
  WebhookResult,
} from './types';

/**
 * Higgsfield Provider
 *
 * Async webhook-based provider for Higgsfield Soul / DoP models.
 * No fallback chain — single provider only (all models are adminOnly).
 */
export class HiggsfieldProvider implements GenerationProvider {
  name = 'higgsfield' as const;

  /**
   * Map generic input to Higgsfield format.
   * Higgsfield accepts the generic input format as-is.
   * The HiggsfieldClient.validateAndCleanInput() handles field remapping
   * (image→image_url, tail_image→tail_image_url, duration clamping, etc.).
   */
  mapInput(input: Record<string, any>, _model: Model): Record<string, any> {
    return { ...input };
  }

  async submit(params: ProviderSubmitParams): Promise<GenerationResult> {
    const higgsfieldClient = getHiggsfieldClient();

    logger.info(`[HiggsfieldProvider] Submitting to ${params.providerModel}`);

    const { requestId } = await higgsfieldClient.submit({
      model: params.providerModel,
      input: params.input,
      webhook: this.getWebhookUrl(),
    });

    return {
      type: 'async',
      status: 'processing',
      predictionId: requestId,
      provider: 'higgsfield',
    };
  }

  getWebhookUrl(): string | undefined {
    return process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/webhook/higgsfield`
      : undefined;
  }

  /**
   * Parse Higgsfield webhook payload.
   *
   * Payload structure:
   * - request_id: string
   * - status: 'completed' | 'failed' | 'nsfw'
   * - images?: [{ url }]  (top-level or in payload)
   * - video?: { url }     (top-level or in payload)
   * - error?: string
   */
  parseWebhook(body: any): WebhookResult {
    const { request_id: requestId, status, error, payload } = body;
    const images = body.images || payload?.images;
    const video = body.video || payload?.video;

    if (status === 'completed') {
      const mediaUrls = extractHiggsfieldMediaUrls(video, images);
      if (mediaUrls.length === 0) {
        return { requestId, status: 'failed', error: 'No media URLs in Higgsfield response' };
      }
      return { requestId, status: 'completed', mediaUrls };
    }

    if (status === 'nsfw') {
      return { requestId, status: 'failed', error: 'Content blocked by safety filter' };
    }

    return {
      requestId,
      status: 'failed',
      error: getUserFriendlyErrorMessage(error),
    };
  }
}

function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('http://') && !value.startsWith('https://')) return false;

  const lc = value.toLowerCase();
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv'];
  if (exts.some(ext => lc.includes(ext))) return true;

  const hosts = ['higgsfield', 'storage.googleapis.com', 'supabase.co/storage', 's3.amazonaws.com', 'cloudfront.net'];
  if (hosts.some(h => lc.includes(h))) return true;

  return false;
}

function extractHiggsfieldMediaUrls(video: any, images: any): string[] {
  if (video?.url && isMediaUrl(video.url)) {
    return [video.url];
  }
  if (images && Array.isArray(images)) {
    return images
      .filter((item: any) => item?.url && isMediaUrl(item.url))
      .map((item: any) => item.url);
  }
  return [];
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
