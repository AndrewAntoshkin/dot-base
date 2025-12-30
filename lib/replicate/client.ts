import Replicate from 'replicate';
import { ReplicateTokenPool } from './token-pool';
import logger from '@/lib/logger';

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
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor() {
    this.tokenPool = ReplicateTokenPool.getInstance();
  }

  private validateAndCleanInput(input: Record<string, any>, modelName?: string): Record<string, any> {
    const cleaned = { ...input };
    
    // Модели, которые НЕ поддерживают match_input_image
    const modelsWithoutMatchInput = ['flux-2-pro', 'black-forest-labs/flux-2-pro'];
    // Модели, которые ЯВНО поддерживают match_input_image (не удаляем его)
    const modelsWithMatchInputSupport = ['nano-banana-pro', 'google/nano-banana-pro'];
    
    const modelLowerName = (modelName || '').toLowerCase();
    const modelDoesntSupportMatchInput = modelsWithoutMatchInput.some(m => modelLowerName.includes(m.toLowerCase()));
    const modelSupportsMatchInput = modelsWithMatchInputSupport.some(m => modelLowerName.includes(m.toLowerCase()));
    
    if (cleaned.aspect_ratio === 'match_input_image') {
      const hasImage = cleaned.image || cleaned.input_image || cleaned.image_input || 
                       cleaned.start_image || cleaned.first_frame_image;
      
      if (!hasImage || modelDoesntSupportMatchInput) {
        // Нет изображения или модель не поддерживает - заменяем на 1:1
        cleaned.aspect_ratio = '1:1';
      } else if (modelSupportsMatchInput) {
        // Модель явно поддерживает match_input_image - оставляем как есть
        // (не удаляем cleaned.aspect_ratio)
      } else {
        // Для остальных моделей удаляем, чтобы использовался дефолт
        delete cleaned.aspect_ratio;
      }
    }
    
    const numericFields = [
      'duration', 'fps', 'seed', 'width', 'height', 'steps', 'num_steps',
      'num_inference_steps', 'cfg_strength', 'guidance_scale', 'cfg_scale',
      'scale', 'scale_factor', 'creativity', 'resemblance', 'hdr', 'dynamic',
      'sharpen', 'tiling_width', 'tiling_height', 'fontsize', 'stroke_width',
      'target_fps', 'number_of_images', 'max_images', 'output_quality',
      'compression_quality', 'threshold'
    ];
    
    const integerFields = ['duration', 'fps', 'seed', 'width', 'height', 'steps', 
      'num_steps', 'num_inference_steps', 'number_of_images', 'max_images',
      'tiling_width', 'tiling_height', 'fontsize', 'target_fps', 'output_quality',
      'compression_quality'];
    
    for (const field of numericFields) {
      if (cleaned[field] !== undefined && typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        if (!isNaN(parsed)) {
          cleaned[field] = integerFields.includes(field) ? Math.round(parsed) : parsed;
        }
      }
    }
    
    // Duration validation
    if (cleaned.duration !== undefined) {
      const duration = Number(cleaned.duration);
      const modelLower = (modelName || '').toLowerCase();
      
      if (modelLower.includes('kling') || modelLower.includes('wan') || modelLower.includes('gen4')) {
        cleaned.duration = duration <= 7 ? 5 : 10;
      } else if (modelLower.includes('hailuo') || modelLower.includes('minimax')) {
        cleaned.duration = duration <= 8 ? 6 : 10;
      } else if (modelLower.includes('seedance')) {
        cleaned.duration = Math.max(2, Math.min(12, Math.round(duration)));
      } else if (modelLower.includes('veo')) {
        // Veo 3.1 only accepts 4, 6, 8
        if (duration <= 5) cleaned.duration = 4;
        else if (duration <= 7) cleaned.duration = 6;
        else cleaned.duration = 8;
      }
    }
    
    // Array fields conversion (for Bria Expand)
    const arrayFields = ['canvas_size', 'original_image_size', 'original_image_location'];
    for (const field of arrayFields) {
      if (cleaned[field] !== undefined) {
        if (typeof cleaned[field] === 'string') {
          try {
            const parsed = JSON.parse(cleaned[field]);
            if (Array.isArray(parsed) && parsed.length === 2) {
              cleaned[field] = parsed.map(Number);
            }
          } catch {
            delete cleaned[field];
          }
        } else if (Array.isArray(cleaned[field])) {
          // Already an array - ensure numbers
          cleaned[field] = cleaned[field].map(Number);
        }
      }
    }
    
    // URL validation
    const urlFields = ['image', 'input_image', 'image_input', 'video', 'mask', 'start_image', 'first_frame_image'];
    for (const field of urlFields) {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        try {
          new URL(cleaned[field]);
        } catch {
          if (!cleaned[field].startsWith('data:')) {
            delete cleaned[field];
          }
        }
      }
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
    
    message = message.replace(/https?:\/\/[^\s]*replicate[^\s]*/gi, '');
    message = message.replace(/api\.replicate\.com[^\s]*/gi, '');
    message = message.replace(/replicate/gi, 'API');
    message = message.replace(/Request to\s+failed/gi, 'Запрос не выполнен');
    
    const jsonMatch = message.match(/\{.*"detail":\s*"([^"]+)"/);
    if (jsonMatch && jsonMatch[1]) {
      message = jsonMatch[1];
    }
    
    const errorMappings: [RegExp, string][] = [
      [/start_image is required/i, 'Для этой модели требуется входное изображение'],
      [/first_frame_image is required/i, 'Для этой модели требуется входное изображение'],
      [/image is required/i, 'Требуется загрузить изображение'],
      [/prompt is required/i, 'Требуется ввести описание (prompt)'],
      [/Invalid type.*Expected: integer.*given: string/i, 'Ошибка параметров. Попробуйте ещё раз'],
      [/Invalid type.*Expected: number.*given: string/i, 'Ошибка параметров. Попробуйте ещё раз'],
      [/rate limit/i, 'Слишком много запросов. Подождите немного'],
      [/timeout/i, 'Превышено время ожидания. Попробуйте ещё раз'],
      [/model.*not found/i, 'Модель временно недоступна'],
      [/authentication/i, 'Ошибка авторизации. Обратитесь в поддержку'],
      [/nsfw|safety|blocked|flagged/i, 'Контент заблокирован фильтром безопасности'],
      [/422 Unprocessable Entity/i, 'Некорректные параметры запроса'],
      [/Input validation failed/i, 'Ошибка валидации параметров'],
    ];
    
    for (const [pattern, replacement] of errorMappings) {
      if (pattern.test(message)) {
        return replacement;
      }
    }
    
    message = message.replace(/\{[^}]+\}/g, '').replace(/\[[^\]]+\]/g, '').trim();
    
    if (message.length > 200 || /status\s*\d+|response|request|http/i.test(message)) {
      return 'Ошибка при генерации. Попробуйте изменить параметры';
    }
    
    return message.trim() || 'Произошла ошибка при генерации';
  }

  private isNonRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // These errors ARE retryable (network/connection issues)
    const retryablePatterns = [
      'socket', 'fetch failed', 'timeout', 'econnreset', 'econnrefused',
      'network', 'connection', 'aborted', 'other side closed',
    ];
    if (retryablePatterns.some(pattern => message.includes(pattern))) {
      return false; // IS retryable
    }
    
    // These errors are NOT retryable (auth/validation issues)
    const noRetryPatterns = [
      'invalid token', 'authentication', '401', '403', 'permission denied',
      'not found', '404', 'does not exist', 'is required', 'invalid type',
    ];
    return noRetryPatterns.some(pattern => message.includes(pattern));
  }

  private async getTokenWithRetry(maxAttempts: number = 3): Promise<{ id: number; token: string }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const tokenData = await this.tokenPool.getNextToken();
      
      if (tokenData) {
        return tokenData;
      }
      
      if (attempt < maxAttempts) {
        logger.warn(`No tokens available, attempt ${attempt}/${maxAttempts}. Forcing refresh...`);
        await this.tokenPool.forceRefresh();
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('No available Replicate tokens after retries');
  }

  async run(options: ReplicateRunOptions): Promise<{
    prediction: ReplicatePrediction;
    tokenId: number;
  }> {
    const cleanedInput = this.validateAndCleanInput(options.input, options.model);
    
    let lastError: any = null;
    let lastTokenId: number | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const tokenData = await this.getTokenWithRetry();

      lastTokenId = tokenData.id;
      const replicate = new Replicate({ auth: tokenData.token });

      try {
        const createOptions: any = {
          input: cleanedInput,
          webhook: options.webhook,
          webhook_events_filter: options.webhook_events_filter,
        };
        
        if (options.version) {
          createOptions.version = options.version;
        } else {
          createOptions.model = options.model;
        }

        const prediction = await replicate.predictions.create(createOptions);

        return {
          prediction: prediction as ReplicatePrediction,
          tokenId: tokenData.id,
        };
      } catch (error: any) {
        lastError = error;
        logger.error('Replicate attempt failed:', attempt, 'Model:', options.model, 'Error:', error.message);
        logger.error('Full error:', JSON.stringify(error, null, 2));

        await this.tokenPool.reportTokenError(tokenData.id, error.message || 'Unknown error');

        if (error.message?.includes('authentication') || 
            error.message?.includes('401') || 
            error.message?.includes('Invalid token')) {
          await this.tokenPool.deactivateToken(tokenData.id);
        }

        if (this.isNonRetryableError(error)) {
          break;
        }

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

  async getPrediction(predictionId: string, tokenOverride?: string): Promise<ReplicatePrediction> {
    let token = tokenOverride;

    if (!token) {
      const tokenData = await this.getTokenWithRetry();
      token = tokenData.token;
    }

    const replicate = new Replicate({ auth: token });
    return await replicate.predictions.get(predictionId) as ReplicatePrediction;
  }

  async cancelPrediction(predictionId: string, tokenOverride?: string): Promise<void> {
    let token = tokenOverride;

    if (!token) {
      const tokenData = await this.getTokenWithRetry();
      token = tokenData.token;
    }

    const replicate = new Replicate({ auth: token });
    await replicate.predictions.cancel(predictionId);
  }

  async waitForPrediction(
    predictionId: string,
    tokenOverride?: string,
    maxWaitTime = 300000,
    pollInterval = 2000
  ): Promise<ReplicatePrediction> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const prediction = await this.getPrediction(predictionId, tokenOverride);

      if (prediction.status === 'succeeded' || 
          prediction.status === 'failed' || 
          prediction.status === 'canceled') {
        return prediction;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
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
