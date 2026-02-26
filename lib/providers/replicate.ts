import { getReplicateClient } from '@/lib/replicate/client';
import logger from '@/lib/logger';
import type { Model } from '@/lib/models-config';
import type {
  GenerationProvider,
  ProviderSubmitParams,
  GenerationResult,
  WebhookResult,
} from './types';

/**
 * Replicate Provider
 *
 * Async webhook-based provider. Uses a token pool for multi-key rotation.
 * Used as:
 * - Default provider for most models
 * - Fallback (2nd level) for Google-primary models
 */
export class ReplicateProvider implements GenerationProvider {
  name = 'replicate' as const;

  /**
   * Map generic input to Replicate format.
   * Replicate accepts the generic input format as-is.
   * The ReplicateClient.validateAndCleanInput() handles model-specific normalization
   * (aspect_ratio coercion, duration validation, field cleanup, etc.).
   */
  mapInput(input: Record<string, any>, _model: Model): Record<string, any> {
    return { ...input };
  }

  async submit(params: ProviderSubmitParams): Promise<GenerationResult> {
    const replicateClient = getReplicateClient();

    const webhookUrl = this.getWebhookUrl();

    logger.info(`[ReplicateProvider] Submitting ${params.providerModel}`);

    const { prediction, tokenId } = await replicateClient.run({
      model: params.providerModel,
      version: params.model.version,
      input: params.input,
      webhook: webhookUrl,
      webhook_events_filter: webhookUrl ? ['completed'] : undefined,
    });

    return {
      type: 'async',
      status: 'processing',
      predictionId: prediction.id,
      provider: 'replicate',
      tokenId,
    };
  }

  getWebhookUrl(): string | undefined {
    return process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
      : undefined;
  }

  /**
   * Parse Replicate webhook payload.
   *
   * Payload structure:
   * - id: string (prediction ID)
   * - status: 'succeeded' | 'failed' | 'canceled'
   * - output: string | string[] | object
   * - error: string | null
   */
  parseWebhook(body: any): WebhookResult {
    const { id: requestId, status, output, error } = body;

    if (status === 'succeeded') {
      const mediaUrls = extractReplicateMediaUrls(output);
      if (mediaUrls.length === 0) {
        return { requestId, status: 'failed', error: 'No media URLs in Replicate response' };
      }
      return { requestId, status: 'completed', mediaUrls };
    }

    return {
      requestId,
      status: 'failed',
      error: error || 'Replicate generation failed',
    };
  }
}

function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('data:')) {
    return false;
  }

  const lc = value.toLowerCase();
  const exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv'];
  if (exts.some(ext => lc.includes(ext))) return true;

  const hosts = [
    'replicate.delivery', 'pbxt.replicate.delivery', 'luma-labs', 'cdn.luma.ai',
    'runway', 'fal.media', 'storage.googleapis.com', 'supabase.co/storage',
  ];
  if (hosts.some(h => lc.includes(h))) return true;

  return false;
}

function extractReplicateMediaUrls(output: any): string[] {
  if (!output) return [];

  if (typeof output === 'string' && isMediaUrl(output)) {
    return [output];
  }
  if (Array.isArray(output)) {
    return output.filter(url => typeof url === 'string' && isMediaUrl(url));
  }
  if (typeof output === 'object') {
    const fields = ['url', 'video', 'output', 'result'];
    for (const field of fields) {
      if (output[field] && typeof output[field] === 'string' && isMediaUrl(output[field])) {
        return [output[field]];
      }
    }
  }

  return [];
}
