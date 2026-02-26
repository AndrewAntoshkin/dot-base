import { getRedisClient } from '@/lib/redis/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getModelById } from '@/lib/models-config';
import { generate } from './registry';
import { reportSubmit, reportSuccess, reportError, pickProvider } from './dispatcher';
import { resolveChain } from './chain';
import { MAX_RETRIES } from './limits';
import logger from '@/lib/logger';

/** Job format pushed into the Redis queue. */
export interface QueueJob {
  generationId: string;
  modelId: string;
  input: Record<string, any>;
  userId: string;
}

const QUEUE_KEY = 'generation:queue';
/** How long to wait on BRPOP before re-checking (seconds). */
const BRPOP_TIMEOUT = 5;
/** Delay before re-enqueue when all providers are busy (ms). */
const REQUEUE_DELAY = 2000;

/**
 * Push a job into the generation queue.
 * Called from route.ts instead of direct generate().
 */
export async function enqueueJob(job: QueueJob): Promise<void> {
  const redis = getRedisClient();
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
  logger.info(`[Worker] Enqueued job ${job.generationId}`);
}

/**
 * Start the BRPOP worker loop.
 * Each iteration: pop job → pick provider → submit → update DB.
 * Runs until `stop()` is called.
 */
export class QueueWorker {
  private running = false;

  async start(): Promise<void> {
    this.running = true;
    logger.info('[Worker] Starting BRPOP loop');

    while (this.running) {
      try {
        await this.tick();
      } catch (err: any) {
        logger.error('[Worker] Unexpected error in tick:', err.message);
        // Brief pause to avoid tight error loop
        await sleep(1000);
      }
    }

    logger.info('[Worker] Stopped');
  }

  stop(): void {
    this.running = false;
  }

  private async tick(): Promise<void> {
    const redis = getRedisClient();

    // Blocking pop — waits up to BRPOP_TIMEOUT seconds
    const result = await redis.brpop(QUEUE_KEY, BRPOP_TIMEOUT);
    if (!result) return; // Timeout — no jobs, loop back

    const [, raw] = result;
    let job: QueueJob;
    try {
      job = JSON.parse(raw);
    } catch {
      logger.error('[Worker] Invalid job JSON:', raw);
      return;
    }

    logger.info(`[Worker] Processing job ${job.generationId}`);

    const model = getModelById(job.modelId);
    if (!model) {
      logger.error(`[Worker] Unknown model: ${job.modelId}`);
      await this.failGeneration(job.generationId, 'Unknown model');
      return;
    }

    // Check if all providers are busy/cooling down
    const chain = resolveChain(model);
    const picked = await pickProvider(chain);

    if (!picked) {
      // All providers busy — re-enqueue at the end
      logger.info(`[Worker] All providers busy for ${job.generationId}, re-enqueue`);
      await sleep(REQUEUE_DELAY);
      await redis.lpush(QUEUE_KEY, JSON.stringify(job));
      return;
    }

    // Submit through the provider chain (generate() handles fallback internally)
    const supabase = createServiceRoleClient();

    try {
      const genResult = await generate({
        model,
        input: job.input,
        generationId: job.generationId,
        userId: job.userId,
      });

      if (genResult.type === 'sync') {
        // Synchronous provider (Google) — completed inline
        await (supabase.from('generations') as any)
          .update({
            replicate_prediction_id: `google-${Date.now()}`,
            status: 'completed',
            output_urls: genResult.outputUrls,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.generationId);

        await reportSuccess(picked.entry.provider);
        logger.info(`[Worker] Job ${job.generationId} completed (sync)`);
      } else {
        // Async provider — waiting for webhook
        const updateData: Record<string, any> = {
          replicate_prediction_id: genResult.predictionId,
          status: 'processing',
        };
        if (genResult.tokenId !== undefined) {
          updateData.replicate_token_index = genResult.tokenId;
        }

        await (supabase.from('generations') as any)
          .update(updateData)
          .eq('id', job.generationId);

        // Note: reportSuccess for async providers is called from the webhook handler
        // when the actual result arrives. Here we only decrement active via reportSubmit.
        logger.info(`[Worker] Job ${job.generationId} submitted (async, ${genResult.provider})`);
      }
    } catch (err: any) {
      logger.error(`[Worker] Job ${job.generationId} failed: ${err.message}`);
      await reportError(picked.entry.provider);
      await this.failGeneration(job.generationId, err.message);
    }
  }

  private async failGeneration(generationId: string, errorMessage: string): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      await (supabase.from('generations') as any)
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generationId);
    } catch (err: any) {
      logger.error(`[Worker] Failed to update generation ${generationId}:`, err.message);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
