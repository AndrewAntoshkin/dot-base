import { getProviderChain, type Model } from '@/lib/models-config';
import type { ProviderChainEntry } from './types';

/**
 * Resolve the provider chain for a model, applying runtime env-flag filters.
 *
 * Uses model.providers if defined, otherwise derives chain from legacy fields
 * (provider, fallbackModel, falFallbackModel) via getProviderChain().
 *
 * The order of entries in the returned array = fallback priority.
 * Filters are composable and applied sequentially.
 */
export function resolveChain(model: Model): ProviderChainEntry[] {
  const baseChain = getProviderChain(model);

  if (baseChain.length === 0) {
    throw new Error(`No providers configured for model ${model.id}`);
  }

  let chain = [...baseChain];

  // FAL_ONLY — keep only fal providers (skip Google and Replicate)
  const falOnly = process.env.FAL_ONLY === '1' || process.env.FAL_ONLY === 'true';
  if (falOnly) {
    chain = chain.filter(e => e.provider === 'fal');
  }

  // SKIP_PROVIDER — exclude specific providers (comma-separated)
  // Example: SKIP_PROVIDER=google,replicate
  if (process.env.SKIP_PROVIDER) {
    const skip = process.env.SKIP_PROVIDER.split(',').map(s => s.trim());
    chain = chain.filter(e => !skip.includes(e.provider));
  }

  // PRIMARY_PROVIDER — force a provider to the front of the chain
  // Example: PRIMARY_PROVIDER=fal
  if (process.env.PRIMARY_PROVIDER) {
    const primary = process.env.PRIMARY_PROVIDER.trim();
    const prioritized = chain.filter(e => e.provider === primary);
    const rest = chain.filter(e => e.provider !== primary);
    chain = [...prioritized, ...rest];
  }

  if (chain.length === 0) {
    throw new Error(`No providers available for model ${model.id} after filtering`);
  }

  return chain;
}
