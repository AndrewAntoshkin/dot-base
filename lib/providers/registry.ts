import logger from '@/lib/logger';
import { writeWarningLog, classifyError } from '@/lib/api-log';
import { resolveChain } from './chain';
import { FalProvider } from './fal';
import { GoogleProvider } from './google';
import { ReplicateProvider } from './replicate';
import { HiggsfieldProvider } from './higgsfield';
import type { GenerationProvider, GenerationParams, GenerationResult } from './types';

// --- Provider Registry ---

const providers = new Map<string, GenerationProvider>();

function registerProvider(provider: GenerationProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): GenerationProvider | undefined {
  return providers.get(name);
}

// Register all providers on module load
registerProvider(new FalProvider());
registerProvider(new GoogleProvider());
registerProvider(new ReplicateProvider());
registerProvider(new HiggsfieldProvider());

// --- Generate with Fallback ---

/**
 * Generate using the model's provider chain with automatic fallback.
 *
 * Iterates through `model.providers[]` (filtered by resolveChain),
 * starting from `startFrom` index. Each provider maps the input itself
 * via `mapInput()` — route.ts has no provider-specific logic.
 *
 * @param params - Generation params (model, input, generationId, userId)
 * @param startFrom - Index in the chain to start from (used by webhook retry
 *                     to continue from the next provider after a failure)
 */
export async function generate(
  params: GenerationParams,
  startFrom = 0,
): Promise<GenerationResult> {
  const chain = resolveChain(params.model);
  const errors: { provider: string; error: string }[] = [];

  for (let i = startFrom; i < chain.length; i++) {
    const entry = chain[i];
    const provider = providers.get(entry.provider);
    if (!provider) continue;

    try {
      const mappedInput = provider.mapInput(params.input, params.model);

      const result = await provider.submit({
        ...params,
        providerModel: entry.model,
        input: mappedInput,
      });

      return result;
    } catch (err: any) {
      errors.push({ provider: entry.provider, error: err.message });

      const nextEntry = chain[i + 1];

      // Log fallback switch in api_logs
      writeWarningLog({
        path: '/api/generations/create',
        provider: entry.provider,
        model_name: params.model.displayName,
        generation_id: params.generationId,
        user_id: params.userId,
        message: nextEntry
          ? `Chain fallback ${i + 1}/${chain.length}: ${entry.provider} -> ${nextEntry.provider}. Reason: ${err.message}`
          : `Last provider in chain failed: ${entry.provider}. Reason: ${err.message}`,
        details: {
          original_provider: chain[0].provider,
          failed_provider: entry.provider,
          fallback_provider: nextEntry?.provider ?? null,
          chain_position: i,
          chain_length: chain.length,
          error: err.message,
          error_category: classifyError(err.message),
        },
      });

      logger.warn(`[${entry.provider}] failed: ${err.message}, trying next...`);
    }
  }

  throw new Error(
    `All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(' | ')}`,
  );
}
