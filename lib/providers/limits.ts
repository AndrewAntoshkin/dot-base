export interface ProviderLimits {
  /** Max concurrent active requests to this provider. */
  maxConcurrent: number;
  /** Max requests per minute. undefined = no RPM limit. */
  rpm?: number;
  /** Base cooldown in ms after first error. Scales with consecutive errors. */
  cooldownMs: number;
}

/**
 * Provider rate limits.
 * TODO: verify actual limits from each provider's dashboard/docs.
 */
export const PROVIDER_LIMITS: Record<string, ProviderLimits> = {
  google: {
    maxConcurrent: 5,
    rpm: 30,
    cooldownMs: 10_000,
  },
  replicate: {
    maxConcurrent: 10,
    // RPM managed by Replicate token pool
    cooldownMs: 10_000,
  },
  fal: {
    maxConcurrent: 5,
    rpm: 60,
    cooldownMs: 10_000,
  },
  higgsfield: {
    maxConcurrent: 3,
    cooldownMs: 10_000,
  },
};

/**
 * Cooldown multipliers for consecutive errors.
 * 1 error → base × 1, 2 → base × 3, 3 → base × 6, 4+ → base × 12
 */
export const COOLDOWN_MULTIPLIERS = [1, 3, 6, 12];

export const MAX_RETRIES = 9;
