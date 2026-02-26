import { getGoogleAIClient } from '@/lib/google/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import type { Model } from '@/lib/models-config';
import type {
  GenerationProvider,
  ProviderSubmitParams,
  GenerationResult,
  WebhookResult,
} from './types';

/**
 * Google Generative AI Provider (synchronous)
 *
 * Unlike other providers, Google returns the result inline (base64 image)
 * rather than via webhook. The submit() method handles the full lifecycle:
 *   call API → upload to Storage → return SyncResult with public URL.
 */
export class GoogleProvider implements GenerationProvider {
  name = 'google' as const;

  /**
   * Map generic input to Google-specific format.
   * Google accepts the generic input format (prompt, image_input, aspect_ratio, resolution)
   * so no transformation is needed — the GoogleAIClient handles it internally.
   */
  mapInput(input: Record<string, any>, _model: Model): Record<string, any> {
    return { ...input };
  }

  async submit(params: ProviderSubmitParams): Promise<GenerationResult> {
    const googleClient = getGoogleAIClient();

    logger.info(`[GoogleProvider] Generating with model: ${params.providerModel}`);

    const result = await googleClient.generate({
      model: params.model.name,
      input: params.input,
    });

    if (!result.success || !result.imageBase64) {
      throw new Error(result.error || 'Google AI generation failed');
    }

    // Upload base64 image to Supabase Storage
    const supabase = createServiceRoleClient();
    const buffer = Buffer.from(result.imageBase64, 'base64');
    const extension = result.mimeType?.includes('png') ? 'png' : 'jpg';
    const fileName = `${params.generationId}.${extension}`;
    const filePath = `generations/${params.userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(filePath, buffer, {
        contentType: result.mimeType || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      logger.error('[GoogleProvider] Storage upload error:', uploadError);
      throw new Error('Failed to save image');
    }

    const { data: urlData } = supabase.storage
      .from('generations')
      .getPublicUrl(filePath);

    const outputUrl = process.env.STORAGE_PROXY_URL
      ? urlData.publicUrl.replace(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.STORAGE_PROXY_URL,
        )
      : urlData.publicUrl;

    logger.info(`[GoogleProvider] Completed in ${result.timeMs}ms:`, params.generationId);

    return {
      type: 'sync',
      status: 'completed',
      outputUrls: [outputUrl],
      timeMs: result.timeMs || 0,
    };
  }

  /** Google is synchronous — no webhook needed. */
  getWebhookUrl(): string | undefined {
    return undefined;
  }

  /** Google doesn't use webhooks, so parseWebhook is not applicable. */
  parseWebhook(_body: any): WebhookResult {
    throw new Error('Google provider is synchronous — no webhook parsing');
  }
}
