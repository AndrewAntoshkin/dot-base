import { getFalClient } from '@/lib/fal/client';
import logger from '@/lib/logger';
import type { Model } from '@/lib/models-config';
import type {
  GenerationProvider,
  ProviderSubmitParams,
  GenerationResult,
  WebhookResult,
} from './types';

/**
 * FAL.ai Provider
 *
 * Async webhook-based provider. Used as:
 * - Primary provider for Kling video models (fal-ai/kling-video/*)
 * - Fallback (3rd level) for Google-primary models (fal-ai/gemini-3-pro-image-preview)
 */
export class FalProvider implements GenerationProvider {
  name = 'fal' as const;

  /**
   * Map generic input to FAL-specific format.
   *
   * When FAL is used as a fallback for Google-primary models (gemini),
   * the input comes in Replicate/Google format and needs remapping:
   * - image_input → image_urls (array)
   * - image → image_url (for edit actions)
   * - aspect_ratio: 'match_input_image' → 'auto'
   * - output_format: 'jpg' → 'jpeg'
   *
   * When FAL is primary (Kling models), the underlying FalClient.validateAndCleanInput()
   * handles field remapping (image→image_url, video→video_url, etc.).
   */
  mapInput(input: Record<string, any>, model: Model): Record<string, any> {
    const isGeminiFallback = model.provider === 'google' || model.id.includes('nano-banana');

    if (isGeminiFallback) {
      // Build clean FAL Gemini input — only accepted fields
      const mapped: Record<string, any> = {
        prompt: input.prompt,
      };

      // image_input → image_urls (reference images)
      if (input.image_input) {
        mapped.image_urls = Array.isArray(input.image_input)
          ? input.image_input
          : [input.image_input];
      }

      // image → image_url (for edit actions)
      if (input.image) {
        mapped.image_url = input.image;
      }

      // aspect_ratio: 'match_input_image' → 'auto'
      if (input.aspect_ratio) {
        mapped.aspect_ratio =
          input.aspect_ratio === 'match_input_image' ? 'auto' : input.aspect_ratio;
      }

      if (input.resolution) mapped.resolution = input.resolution;

      // output_format: 'jpg' → 'jpeg'
      if (input.output_format) {
        mapped.output_format =
          input.output_format === 'jpg' ? 'jpeg' : input.output_format;
      }

      if (input.seed) mapped.seed = input.seed;

      return mapped;
    }

    // For fal-primary models (Kling, etc.) — pass through as-is.
    // FalClient.validateAndCleanInput() handles field remapping internally.
    return { ...input };
  }

  async submit(params: ProviderSubmitParams): Promise<GenerationResult> {
    const falClient = getFalClient();

    logger.info(`[FalProvider] Submitting to ${params.providerModel}`);

    const { requestId } = await falClient.submitToQueue({
      model: params.providerModel,
      input: params.input,
      webhook: this.getWebhookUrl(),
    });

    return {
      type: 'async',
      status: 'processing',
      predictionId: requestId,
      provider: 'fal',
    };
  }

  getWebhookUrl(): string | undefined {
    return process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/webhook/fal`
      : undefined;
  }

  /**
   * Parse FAL webhook payload.
   *
   * Payload structure:
   * - request_id: string
   * - status: 'COMPLETED' | 'OK' | 'FAILED'
   * - payload: { video?: { url }, images?: [{ url }], image?: { url } }
   * - error?: string
   */
  parseWebhook(body: any): WebhookResult {
    const { request_id: requestId, status, payload, error } = body;

    if (status === 'COMPLETED' || status === 'OK') {
      const mediaUrls = extractFalMediaUrls(payload);
      if (mediaUrls.length === 0) {
        return { requestId, status: 'failed', error: 'No media URLs in FAL response' };
      }
      return { requestId, status: 'completed', mediaUrls };
    }

    return {
      requestId,
      status: 'failed',
      error: error || 'FAL generation failed',
    };
  }
}

function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('http://') && !value.startsWith('https://')) return false;

  const lc = value.toLowerCase();
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov'];
  if (exts.some(ext => lc.includes(ext))) return true;

  const hosts = ['fal.media', 'fal.run', 'fal-cdn', 'storage.googleapis.com', 'supabase.co/storage'];
  if (hosts.some(h => lc.includes(h))) return true;

  return false;
}

function extractFalMediaUrls(payload: any): string[] {
  if (!payload) return [];

  // { video: { url } }
  if (payload.video?.url && isMediaUrl(payload.video.url)) {
    return [payload.video.url];
  }
  // { images: [{ url }] }
  if (payload.images && Array.isArray(payload.images)) {
    return payload.images
      .filter((img: any) => img?.url && isMediaUrl(img.url))
      .map((img: any) => img.url);
  }
  // { image: { url } }
  if (payload.image?.url && isMediaUrl(payload.image.url)) {
    return [payload.image.url];
  }
  // Direct URL string
  if (typeof payload === 'string' && isMediaUrl(payload)) {
    return [payload];
  }
  // Array of outputs
  if (Array.isArray(payload)) {
    return payload
      .filter((item: any) => {
        if (typeof item === 'string') return isMediaUrl(item);
        if (item?.url) return isMediaUrl(item.url);
        return false;
      })
      .map((item: any) => (typeof item === 'string' ? item : item.url));
  }

  return [];
}
