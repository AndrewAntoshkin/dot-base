import type { Model, ProviderType, ProviderChainEntry } from '@/lib/models-config';

// Re-export ProviderChainEntry from models-config (single source of truth)
export type { ProviderChainEntry } from '@/lib/models-config';

// --- Generation Params ---

export interface GenerationParams {
  model: Model;
  input: Record<string, any>;
  generationId: string;
  userId: string;
}

/**
 * Params passed to provider.submit() — includes the resolved provider model.
 */
export interface ProviderSubmitParams extends GenerationParams {
  providerModel: string;
}

// --- Generation Results ---

/** Synchronous result (Google) — generation completed inline. */
export interface SyncResult {
  type: 'sync';
  status: 'completed';
  outputUrls: string[];
  timeMs: number;
}

/** Async result (Replicate, FAL, Higgsfield) — generation submitted to queue. */
export interface AsyncResult {
  type: 'async';
  status: 'processing';
  predictionId: string;
  provider: ProviderType;
  /** Replicate token pool index (for later polling). */
  tokenId?: number;
}

export type GenerationResult = SyncResult | AsyncResult;

// --- Webhook ---

export interface WebhookResult {
  requestId: string;
  status: 'completed' | 'failed';
  mediaUrls?: string[];
  error?: string;
}

// --- Provider Interface ---

export interface GenerationProvider {
  name: ProviderType;

  /**
   * Transform generic input to provider-specific format.
   * Each provider knows its own field mappings (prompt, image, aspect_ratio, etc.).
   */
  mapInput(input: Record<string, any>, model: Model): Record<string, any>;

  /**
   * Submit generation to the provider.
   * Sync providers (Google) return SyncResult immediately.
   * Async providers return AsyncResult with a predictionId for webhook callbacks.
   */
  submit(params: ProviderSubmitParams): Promise<GenerationResult>;

  /**
   * Build webhook URL for this provider (undefined = no webhook / sync provider).
   */
  getWebhookUrl(): string | undefined;

  /**
   * Parse webhook payload into unified format.
   */
  parseWebhook(body: any): WebhookResult;
}
