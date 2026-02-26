/**
 * PM2 entrypoint for the generation queue worker.
 *
 * Usage:
 *   npx tsx worker.ts
 *
 * PM2:
 *   pm2 start ecosystem.config.cjs --only gen-worker
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { QueueWorker } from '@/lib/providers/worker';
import { closeRedis } from '@/lib/redis/client';
import logger from '@/lib/logger';

const worker = new QueueWorker();

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`[Worker] Received ${signal}, shutting down...`);
  worker.stop();

  // Give the current tick time to finish
  setTimeout(async () => {
    await closeRedis();
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

worker.start().catch((err) => {
  logger.error('[Worker] Fatal error:', err);
  process.exit(1);
});
