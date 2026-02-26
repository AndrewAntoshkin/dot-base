export interface ProviderLimits {
  /** Max concurrent active requests to this provider. */
  maxConcurrent: number;
  /** Max requests per minute. undefined = no RPM limit. */
  rpm?: number;
  /** Base cooldown in ms after first error. Scales with consecutive errors. */
  cooldownMs: number;
}

/**
 * Provider rate limits (based on official docs).
 *
 * Google: IPM (images per minute) = 10 (Tier 1) / 20 (Tier 2). Concurrent not documented.
 *         Real-world reports: 2-5 RPM effective for image gen. Conservative: 10 IPM, 3 concurrent.
 *         https://ai.google.dev/gemini-api/docs/rate-limits
 *
 * Replicate: 600 RPM for create prediction. Concurrent per-account (depends on token pool size).
 *            https://replicate.com/docs/topics/predictions/rate-limits
 *
 * Fal: Standard tier = 2 concurrent tasks. Premium ($1000+ credits) = 40. No RPM limit.
 *      https://docs.fal.ai/model-apis/faq
 *
 * Higgsfield: Not documented. Free = 2 concurrent image + 2 concurrent video.
 *             Paid tiers higher but exact numbers not published.
 */
export const PROVIDER_LIMITS: Record<string, ProviderLimits> = {
  google: {
    maxConcurrent: 3,
    rpm: 10,
    cooldownMs: 10_000,
  },
  replicate: {
    maxConcurrent: 10,
    rpm: 600,
    cooldownMs: 10_000,
  },
  fal: {
    maxConcurrent: 2,
    cooldownMs: 10_000,
  },
  higgsfield: {
    maxConcurrent: 2,
    cooldownMs: 10_000,
  },
};

/**
 * Cooldown multipliers for consecutive errors.
 * 1 error → base × 1, 2 → base × 3, 3 → base × 6, 4+ → base × 12
 */
export const COOLDOWN_MULTIPLIERS = [1, 3, 6, 12];

export const MAX_RETRIES = 9;
