import Replicate from 'replicate';
import { ReplicateTokenPool } from './token-pool';

type WebhookEventType = 'start' | 'output' | 'logs' | 'completed';

export interface ReplicateRunOptions {
  model: string;
  input: Record<string, any>;
  version?: string;
  webhook?: string;
  webhook_events_filter?: WebhookEventType[];
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: any;
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Replicate Client с автоматическим выбором токена из пула
 */
export class ReplicateClient {
  private tokenPool: ReplicateTokenPool;

  constructor() {
    this.tokenPool = ReplicateTokenPool.getInstance();
  }

  /**
   * Запустить модель на Replicate
   */
  async run(options: ReplicateRunOptions): Promise<{
    prediction: ReplicatePrediction;
    tokenId: number;
  }> {
    const tokenData = await this.tokenPool.getNextToken();

    if (!tokenData) {
      throw new Error('No available Replicate tokens');
    }

    const replicate = new Replicate({ auth: tokenData.token });

    try {
      const prediction = await replicate.predictions.create({
        model: options.model,
        version: options.version,
        input: options.input,
        webhook: options.webhook,
        webhook_events_filter: options.webhook_events_filter,
      });

      return {
        prediction: prediction as ReplicatePrediction,
        tokenId: tokenData.id,
      };
    } catch (error: any) {
      // Сообщить об ошибке токена
      await this.tokenPool.reportTokenError(
        tokenData.id,
        error.message || 'Unknown error'
      );

      // Если ошибка авторизации - деактивировать токен
      if (
        error.message?.includes('authentication') ||
        error.message?.includes('401')
      ) {
        await this.tokenPool.deactivateToken(tokenData.id);
      }

      throw error;
    }
  }

  /**
   * Получить статус prediction
   */
  async getPrediction(
    predictionId: string,
    tokenOverride?: string
  ): Promise<ReplicatePrediction> {
    let token = tokenOverride;

    if (!token) {
      const tokenData = await this.tokenPool.getNextToken();
      if (!tokenData) {
        throw new Error('No available Replicate tokens');
      }
      token = tokenData.token;
    }

    const replicate = new Replicate({ auth: token });
    const prediction = await replicate.predictions.get(predictionId);

    return prediction as ReplicatePrediction;
  }

  /**
   * Отменить prediction
   */
  async cancelPrediction(
    predictionId: string,
    tokenOverride?: string
  ): Promise<void> {
    let token = tokenOverride;

    if (!token) {
      const tokenData = await this.tokenPool.getNextToken();
      if (!tokenData) {
        throw new Error('No available Replicate tokens');
      }
      token = tokenData.token;
    }

    const replicate = new Replicate({ auth: token });
    await replicate.predictions.cancel(predictionId);
  }

  /**
   * Ожидать завершения prediction с polling
   */
  async waitForPrediction(
    predictionId: string,
    tokenOverride?: string,
    maxWaitTime = 300000, // 5 минут
    pollInterval = 2000 // 2 секунды
  ): Promise<ReplicatePrediction> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.getPrediction(predictionId, tokenOverride);

      if (
        prediction.status === 'succeeded' ||
        prediction.status === 'failed' ||
        prediction.status === 'canceled'
      ) {
        return prediction;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Prediction timed out');
  }
}

// Singleton instance
let replicateClientInstance: ReplicateClient | null = null;

export function getReplicateClient(): ReplicateClient {
  if (!replicateClientInstance) {
    replicateClientInstance = new ReplicateClient();
  }
  return replicateClientInstance;
}


