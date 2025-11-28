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
 * Включает retry логику и валидацию
 */
export class ReplicateClient {
  private tokenPool: ReplicateTokenPool;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 секунды

  constructor() {
    this.tokenPool = ReplicateTokenPool.getInstance();
  }

  /**
   * Валидация и очистка input параметров
   */
  private validateAndCleanInput(input: Record<string, any>): Record<string, any> {
    const cleaned = { ...input };
    
    // Fallback для aspect_ratio: если match_input_image но нет изображения
    if (cleaned.aspect_ratio === 'match_input_image') {
      const hasImage = cleaned.image || cleaned.input_image || cleaned.image_input || 
                       cleaned.start_image || cleaned.first_frame_image;
      if (!hasImage) {
        console.log('aspect_ratio fallback: match_input_image → 1:1 (no input image)');
        cleaned.aspect_ratio = '1:1';
      }
    }
    
    // Валидация URL полей
    const urlFields = ['image', 'input_image', 'image_input', 'video', 'mask', 'start_image', 'first_frame_image'];
    for (const field of urlFields) {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        try {
          // Проверяем что это валидный URL
          new URL(cleaned[field]);
        } catch {
          // Если не валидный URL и не base64 - удаляем
          if (!cleaned[field].startsWith('data:')) {
            console.warn(`Invalid URL in field ${field}, removing`);
            delete cleaned[field];
          }
        }
      }
    }
    
    // Удаляем undefined и null значения
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  }

  /**
   * Проверка, является ли ошибка временной (можно retry)
   */
  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const retryablePatterns = [
      'timeout',
      'rate limit',
      'too many requests',
      '429',
      '503',
      '502',
      'temporarily unavailable',
      'overloaded',
      'try again',
    ];
    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Запустить модель на Replicate с retry логикой
   */
  async run(options: ReplicateRunOptions): Promise<{
    prediction: ReplicatePrediction;
    tokenId: number;
  }> {
    // Валидация и очистка input
    const cleanedInput = this.validateAndCleanInput(options.input);
    
    let lastError: any = null;
    let lastTokenId: number | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const tokenData = await this.tokenPool.getNextToken();

      if (!tokenData) {
        throw new Error('No available Replicate tokens');
      }

      lastTokenId = tokenData.id;
      const replicate = new Replicate({ auth: tokenData.token });

      try {
        console.log(`Replicate attempt ${attempt}/${this.maxRetries}:`, {
          model: options.model,
          inputKeys: Object.keys(cleanedInput),
        });

        const prediction = await replicate.predictions.create({
          model: options.model,
          version: options.version,
          input: cleanedInput,
          webhook: options.webhook,
          webhook_events_filter: options.webhook_events_filter,
        });

        return {
          prediction: prediction as ReplicatePrediction,
          tokenId: tokenData.id,
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Replicate attempt ${attempt} failed:`, error.message);

        // Сообщить об ошибке токена
        await this.tokenPool.reportTokenError(
          tokenData.id,
          error.message || 'Unknown error'
        );

        // Если ошибка авторизации - деактивировать токен
        if (
          error.message?.includes('authentication') ||
          error.message?.includes('401') ||
          error.message?.includes('Invalid token')
        ) {
          await this.tokenPool.deactivateToken(tokenData.id);
        }

        // Если ошибка НЕ временная - не retry
        if (!this.isRetryableError(error) && attempt < this.maxRetries) {
          // Проверяем специфичные ошибки которые не стоит повторять
          const noRetryPatterns = ['invalid', 'not found', 'does not exist', 'permission'];
          const shouldNotRetry = noRetryPatterns.some(p => 
            error.message?.toLowerCase().includes(p)
          );
          if (shouldNotRetry) {
            console.log('Non-retryable error, stopping attempts');
            break;
          }
        }

        // Ждем перед следующей попыткой
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Все попытки исчерпаны
    throw lastError || new Error('Failed to create prediction after multiple retries');
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


