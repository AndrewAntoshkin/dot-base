import type { ProviderChainEntry } from '@/lib/models-config';
import { PROVIDER_LIMITS, COOLDOWN_MULTIPLIERS } from './limits';
import { getRedisClient } from '@/lib/redis/client';
import logger from '@/lib/logger';

// Redis key helpers
const key = {
  active: (p: string) => `provider:${p}:active`,
  rpm: (p: string) => `provider:${p}:rpm`,
  lastError: (p: string) => `provider:${p}:lastError`,
  errors: (p: string) => `provider:${p}:errors`,
};

export interface PickResult {
  entry: ProviderChainEntry;
  /** Index in the chain (for logging). */
  index: number;
}

/**
 * Pick the first available provider from the chain.
 *
 * Checks each provider in order:
 * 1. Not over maxConcurrent
 * 2. Not over RPM (if defined)
 * 3. Not in cooldown after errors
 *
 * Returns null if all providers are busy/cooling down.
 */
export async function pickProvider(
  chain: ProviderChainEntry[],
): Promise<PickResult | null> {
  const redis = getRedisClient();

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const limits = PROVIDER_LIMITS[entry.provider];
    if (!limits) {
      // No limits defined — allow by default
      return { entry, index: i };
    }

    // 1. Check concurrent limit
    const active = parseInt((await redis.get(key.active(entry.provider))) || '0', 10);
    if (active >= limits.maxConcurrent) {
      logger.debug(`[Dispatcher] ${entry.provider}: at max concurrent (${active}/${limits.maxConcurrent})`);
      continue;
    }

    // 2. Check RPM limit
    if (limits.rpm !== undefined) {
      const rpmCount = parseInt((await redis.get(key.rpm(entry.provider))) || '0', 10);
      if (rpmCount >= limits.rpm) {
        logger.debug(`[Dispatcher] ${entry.provider}: at RPM limit (${rpmCount}/${limits.rpm})`);
        continue;
      }
    }

    // 3. Check cooldown
    const lastErrorTs = await redis.get(key.lastError(entry.provider));
    if (lastErrorTs) {
      const errorCount = parseInt((await redis.get(key.errors(entry.provider))) || '1', 10);
      const multiplierIndex = Math.min(errorCount - 1, COOLDOWN_MULTIPLIERS.length - 1);
      const cooldown = limits.cooldownMs * COOLDOWN_MULTIPLIERS[multiplierIndex];
      const elapsed = Date.now() - parseInt(lastErrorTs, 10);

      if (elapsed < cooldown) {
        logger.debug(
          `[Dispatcher] ${entry.provider}: cooling down (${Math.round((cooldown - elapsed) / 1000)}s remaining)`,
        );
        continue;
      }
    }

    return { entry, index: i };
  }

  return null;
}

/**
 * Increment active counter and RPM before submitting to a provider.
 * Call this right before provider.submit().
 */
export async function reportSubmit(provider: string): Promise<void> {
  const redis = getRedisClient();

  // Increment active requests
  await redis.incr(key.active(provider));

  // Increment RPM counter with 60s TTL
  const rpmKey = key.rpm(provider);
  const exists = await redis.exists(rpmKey);
  await redis.incr(rpmKey);
  if (!exists) {
    await redis.expire(rpmKey, 60);
  }

  logger.debug(`[Dispatcher] ${provider}: submit recorded`);
}

/**
 * Report a successful completion.
 * Decrements active counter and clears error state.
 */
export async function reportSuccess(provider: string): Promise<void> {
  const redis = getRedisClient();

  // Decrement active (floor at 0)
  const active = await redis.decr(key.active(provider));
  if (active < 0) {
    await redis.set(key.active(provider), '0');
  }

  // Clear error state
  await redis.del(key.lastError(provider));
  await redis.del(key.errors(provider));

  logger.debug(`[Dispatcher] ${provider}: success reported`);
}

/**
 * Report an error from a provider.
 * Decrements active counter, increments consecutive error count, sets cooldown.
 */
export async function reportError(provider: string): Promise<void> {
  const redis = getRedisClient();

  // Decrement active (floor at 0)
  const active = await redis.decr(key.active(provider));
  if (active < 0) {
    await redis.set(key.active(provider), '0');
  }

  // Set last error timestamp
  await redis.set(key.lastError(provider), Date.now().toString());

  // Increment consecutive errors (TTL 600s — auto-reset after 10 min of no errors)
  const errKey = key.errors(provider);
  const errCount = await redis.incr(errKey);
  if (errCount === 1) {
    await redis.expire(errKey, 600);
  }

  const limits = PROVIDER_LIMITS[provider];
  if (limits) {
    const multiplierIndex = Math.min(errCount - 1, COOLDOWN_MULTIPLIERS.length - 1);
    const cooldown = limits.cooldownMs * COOLDOWN_MULTIPLIERS[multiplierIndex];
    logger.warn(`[Dispatcher] ${provider}: error #${errCount}, cooldown ${cooldown / 1000}s`);
  } else {
    logger.warn(`[Dispatcher] ${provider}: error #${errCount}`);
  }
}

/**
 * Get current state of all providers (for admin dashboard).
 */
export async function getProviderStates(): Promise<
  Record<string, { active: number; rpm: number; errors: number; cooldownRemaining: number }>
> {
  const redis = getRedisClient();
  const result: Record<string, { active: number; rpm: number; errors: number; cooldownRemaining: number }> = {};

  for (const [name, limits] of Object.entries(PROVIDER_LIMITS)) {
    const active = parseInt((await redis.get(key.active(name))) || '0', 10);
    const rpm = parseInt((await redis.get(key.rpm(name))) || '0', 10);
    const errorCount = parseInt((await redis.get(key.errors(name))) || '0', 10);

    let cooldownRemaining = 0;
    if (errorCount > 0) {
      const lastErrorTs = await redis.get(key.lastError(name));
      if (lastErrorTs) {
        const multiplierIndex = Math.min(errorCount - 1, COOLDOWN_MULTIPLIERS.length - 1);
        const cooldown = limits.cooldownMs * COOLDOWN_MULTIPLIERS[multiplierIndex];
        const elapsed = Date.now() - parseInt(lastErrorTs, 10);
        cooldownRemaining = Math.max(0, cooldown - elapsed);
      }
    }

    result[name] = { active, rpm, errors: errorCount, cooldownRemaining };
  }

  return result;
}
