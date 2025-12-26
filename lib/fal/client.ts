import { fal } from '@fal-ai/client';
import logger from '@/lib/logger';

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
});

export interface FalRunOptions {
  model: string;
  input: Record<string, any>;
  webhook?: string;
}

export interface FalPrediction {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: {
    video?: {
      url: string;
    };
  };
  error?: string;
  logs?: Array<{ message: string }>;
}

/**
 * Fal.ai Client для работы с моделями fal.ai
 */
export class FalClient {
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  private validateAndCleanInput(input: Record<string, any>, modelName?: string): Record<string, any> {
    const cleaned = { ...input };
    
    // Map our standard field names to fal.ai expected names
    // image -> image_url
    if (cleaned.image && !cleaned.image_url) {
      cleaned.image_url = cleaned.image;
      delete cleaned.image;
    }
    
    // video -> video_url (for video-to-video models)
    if (cleaned.video && !cleaned.video_url) {
      cleaned.video_url = cleaned.video;
      delete cleaned.video;
    }
    
    // tail_image -> tail_image_url (last frame for interpolation)
    if (cleaned.tail_image && !cleaned.tail_image_url) {
      cleaned.tail_image_url = cleaned.tail_image;
      delete cleaned.tail_image;
    }
    
    // static_mask -> static_mask_url (motion brush)
    if (cleaned.static_mask && !cleaned.static_mask_url) {
      cleaned.static_mask_url = cleaned.static_mask;
      delete cleaned.static_mask;
    }
    
    // Duration validation for Kling
    if (cleaned.duration !== undefined) {
      const duration = Number(cleaned.duration);
      // Kling accepts only 5 or 10
      cleaned.duration = duration <= 7 ? '5' : '10';
    }
    
    // Set defaults for Kling
    if (!cleaned.negative_prompt) {
      cleaned.negative_prompt = 'blur, distort, and low quality';
    }
    
    if (cleaned.cfg_scale === undefined) {
      cleaned.cfg_scale = 0.5;
    }
    
    // Remove empty values
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  }
  
  private sanitizeErrorMessage(error: any): string {
    let message = error.message || 'Произошла ошибка при генерации';
    
    // Remove technical details
    message = message.replace(/https?:\/\/[^\s]*fal[^\s]*/gi, '');
    message = message.replace(/fal\.ai[^\s]*/gi, '');
    message = message.replace(/fal-ai[^\s]*/gi, '');
    
    const errorMappings: [RegExp, string][] = [
      [/image_url is required/i, 'Для этой модели требуется входное изображение'],
      [/prompt is required/i, 'Требуется ввести описание (prompt)'],
      [/rate limit/i, 'Слишком много запросов. Подождите немного'],
      [/timeout/i, 'Превышено время ожидания. Попробуйте ещё раз'],
      [/model.*not found/i, 'Модель временно недоступна'],
      [/authentication/i, 'Ошибка авторизации. Обратитесь в поддержку'],
      [/nsfw|safety|blocked|flagged/i, 'Контент заблокирован фильтром безопасности'],
      [/validation failed/i, 'Ошибка валидации параметров'],
    ];
    
    for (const [pattern, replacement] of errorMappings) {
      if (pattern.test(message)) {
        return replacement;
      }
    }
    
    if (message.length > 200 || /status\s*\d+|response|request|http/i.test(message)) {
      return 'Ошибка при генерации. Попробуйте изменить параметры';
    }
    
    return message.trim() || 'Произошла ошибка при генерации';
  }

  /**
   * Submit a request to fal.ai queue and return immediately
   */
  async submitToQueue(options: FalRunOptions): Promise<{ requestId: string }> {
    const cleanedInput = this.validateAndCleanInput(options.input, options.model);
    
    let lastError: any = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`[Fal.ai] Submitting to queue, model: ${options.model}, attempt: ${attempt}`);
        logger.debug('[Fal.ai] Input:', JSON.stringify(cleanedInput, null, 2));

        const queueOptions: any = {
          input: cleanedInput,
        };
        
        if (options.webhook) {
          queueOptions.webhookUrl = options.webhook;
        }

        const { request_id } = await fal.queue.submit(options.model, queueOptions);

        logger.info(`[Fal.ai] Request submitted, request_id: ${request_id}`);
        
        return { requestId: request_id };
      } catch (error: any) {
        lastError = error;
        logger.error('[Fal.ai] Submit failed:', attempt, 'Model:', options.model, 'Error:', error.message);

        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    const sanitizedMessage = this.sanitizeErrorMessage(lastError);
    const cleanError = new Error(sanitizedMessage);
    (cleanError as any).originalError = lastError;
    throw cleanError;
  }

  /**
   * Get the status of a queued request
   */
  async getQueueStatus(model: string, requestId: string): Promise<FalPrediction> {
    try {
      const status = await fal.queue.status(model, {
        requestId,
        logs: true,
      });
      
      return {
        request_id: requestId,
        status: status.status as FalPrediction['status'],
        logs: (status as any).logs,
      };
    } catch (error: any) {
      logger.error('[Fal.ai] Get status failed:', error.message);
      throw error;
    }
  }

  /**
   * Get the result of a completed request
   */
  async getResult(model: string, requestId: string): Promise<FalPrediction> {
    try {
      const result = await fal.queue.result(model, { requestId });
      
      return {
        request_id: requestId,
        status: 'COMPLETED',
        output: result.data as any,
      };
    } catch (error: any) {
      logger.error('[Fal.ai] Get result failed:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe and wait for result (blocking)
   */
  async subscribe(options: FalRunOptions): Promise<FalPrediction> {
    const cleanedInput = this.validateAndCleanInput(options.input, options.model);
    
    try {
      logger.info(`[Fal.ai] Subscribe (blocking), model: ${options.model}`);
      
      const result = await fal.subscribe(options.model, {
        input: cleanedInput,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            logger.debug('[Fal.ai] Progress:', update.logs?.map((log) => log.message).join(', '));
          }
        },
      });

      return {
        request_id: result.requestId,
        status: 'COMPLETED',
        output: result.data as any,
      };
    } catch (error: any) {
      const sanitizedMessage = this.sanitizeErrorMessage(error);
      const cleanError = new Error(sanitizedMessage);
      (cleanError as any).originalError = error;
      throw cleanError;
    }
  }

  /**
   * Poll for result with timeout
   */
  async waitForResult(
    model: string,
    requestId: string,
    maxWaitTime = 300000,
    pollInterval = 3000
  ): Promise<FalPrediction> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getQueueStatus(model, requestId);

      if (status.status === 'COMPLETED') {
        return await this.getResult(model, requestId);
      }
      
      if (status.status === 'FAILED') {
        throw new Error('Генерация не удалась');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Превышено время ожидания генерации');
  }
}

// Singleton instance
let falClientInstance: FalClient | null = null;

export function getFalClient(): FalClient {
  if (!falClientInstance) {
    falClientInstance = new FalClient();
  }
  return falClientInstance;
}

