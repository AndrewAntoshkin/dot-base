import Redis from 'ioredis';
import logger from '@/lib/logger';

let redisInstance: Redis | null = null;

/**
 * Singleton Redis client.
 * Follows the same pattern as createServiceRoleClient() in lib/supabase/server.ts.
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null; // stop retrying after 10 attempts
        return Math.min(times * 200, 5000);
      },
      lazyConnect: false,
    });

    redisInstance.on('connect', () => {
      logger.info('[Redis] Connected');
    });

    redisInstance.on('error', (err) => {
      logger.error('[Redis] Connection error:', err.message);
    });

    redisInstance.on('close', () => {
      logger.warn('[Redis] Connection closed');
    });
  }

  return redisInstance;
}

/**
 * Gracefully close the Redis connection.
 * Called on worker shutdown.
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('[Redis] Disconnected');
  }
}
