import logger from '@/lib/logger';

/**
 * Higgsfield API Client
 * https://docs.higgsfield.ai
 */

const HIGGSFIELD_API_URL = 'https://platform.higgsfield.ai';

export interface HiggsfieldRunOptions {
  model: string;
  input: Record<string, any>;
  webhook?: string;
}

export interface HiggsfieldPrediction {
  request_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw';
  status_url?: string;
  cancel_url?: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: string;
}

/**
 * Higgsfield Client для работы с Higgsfield API
 */
export class HiggsfieldClient {
  private apiKey: string;
  private apiSecret: string;
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor() {
    const apiKey = process.env.HIGGSFIELD_API_KEY;
    const apiSecret = process.env.HIGGSFIELD_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET environment variables are required');
    }
    
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private get authHeader(): string {
    return `Key ${this.apiKey}:${this.apiSecret}`;
  }

  private validateAndCleanInput(input: Record<string, any>, modelName?: string): Record<string, any> {
    const cleaned = { ...input };
    
    // Map our standard field names to Higgsfield expected names
    // For image-to-video, use image_url
    if (cleaned.image && !cleaned.image_url) {
      cleaned.image_url = cleaned.image;
      delete cleaned.image;
    }
    
    // For First Last Frame models - tail_image for last frame
    if (cleaned.tail_image && !cleaned.tail_image_url) {
      cleaned.tail_image_url = cleaned.tail_image;
      delete cleaned.tail_image;
    }
    
    // For Soul Reference - reference_images array
    if (cleaned.reference_images && Array.isArray(cleaned.reference_images)) {
      // Higgsfield expects reference images in a specific format
      // Keep as is if already URLs, otherwise process
    }
    
    // Duration validation for DoP models
    if (cleaned.duration !== undefined) {
      const duration = Number(cleaned.duration);
      // Higgsfield DoP accepts 5 seconds for Lite, up to 10 for others
      cleaned.duration = Math.max(1, Math.min(10, Math.round(duration)));
    }
    
    // Numeric fields conversion
    const numericFields = ['duration', 'seed', 'width', 'height', 'steps', 'guidance_scale'];
    const integerFields = ['duration', 'seed', 'width', 'height', 'steps'];
    
    for (const field of numericFields) {
      if (cleaned[field] !== undefined && typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        if (!isNaN(parsed)) {
          cleaned[field] = integerFields.includes(field) ? Math.round(parsed) : parsed;
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
    let message = error.message || 'Generation failed';

    // Remove technical details
    message = message.replace(/https?:\/\/[^\s]*higgsfield[^\s]*/gi, '');
    message = message.replace(/platform\.higgsfield\.ai[^\s]*/gi, '');

    const errorMappings: [RegExp, string][] = [
      [/image_url is required/i, 'This model requires an input image'],
      [/prompt is required/i, 'A prompt is required'],
      [/rate limit/i, 'Too many requests. Please wait'],
      [/timeout/i, 'Request timed out. Please try again'],
      [/model.*not found/i, 'Model temporarily unavailable'],
      [/authentication/i, 'Authentication error. Contact support'],
      [/nsfw|safety|blocked|flagged/i, 'Content blocked by safety filter'],
      [/validation failed/i, 'Input validation failed'],
      [/insufficient.*credits/i, 'Insufficient credits on Higgsfield account'],
    ];

    for (const [pattern, replacement] of errorMappings) {
      if (pattern.test(message)) {
        return replacement;
      }
    }

    if (message.length > 200 || /status\s*\d+|response|request|http/i.test(message)) {
      return 'Generation error. Try changing parameters';
    }

    return message.trim() || 'Generation failed';
  }

  /**
   * Submit a generation request to Higgsfield API
   */
  async submit(options: HiggsfieldRunOptions): Promise<{ requestId: string }> {
    const cleanedInput = this.validateAndCleanInput(options.input, options.model);
    
    let lastError: any = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Build URL with optional webhook
        let url = `${HIGGSFIELD_API_URL}/${options.model}`;
        if (options.webhook) {
          url += `?hf_webhook=${encodeURIComponent(options.webhook)}`;
        }

        logger.info(`[Higgsfield] Submitting request, model: ${options.model}, attempt: ${attempt}`);
        logger.debug('[Higgsfield] Input:', JSON.stringify(cleanedInput, null, 2));

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(cleanedInput),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.detail || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result: HiggsfieldPrediction = await response.json();
        
        logger.info(`[Higgsfield] Request submitted, request_id: ${result.request_id}`);
        
        return { requestId: result.request_id };
      } catch (error: any) {
        lastError = error;
        logger.error('[Higgsfield] Submit failed:', attempt, 'Model:', options.model, 'Error:', error.message);

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
   * Get the status of a request
   */
  async getStatus(requestId: string): Promise<HiggsfieldPrediction> {
    try {
      const response = await fetch(`${HIGGSFIELD_API_URL}/requests/${requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Normalize response: extract video/images from payload if nested
      // Some Higgsfield responses have media at top level, others in payload
      const normalized: HiggsfieldPrediction = {
        request_id: data.request_id,
        status: data.status,
        error: data.error,
        video: data.video || data.payload?.video,
        images: data.images || data.payload?.images,
        status_url: data.status_url,
        cancel_url: data.cancel_url,
      };
      
      return normalized;
    } catch (error: any) {
      logger.error('[Higgsfield] Get status failed:', error.message);
      throw error;
    }
  }

  /**
   * Cancel a queued request
   */
  async cancel(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(`${HIGGSFIELD_API_URL}/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      return response.status === 202;
    } catch (error: any) {
      logger.error('[Higgsfield] Cancel failed:', error.message);
      return false;
    }
  }

  /**
   * Poll for result with timeout
   */
  async waitForResult(
    requestId: string,
    maxWaitTime = 300000,
    pollInterval = 3000
  ): Promise<HiggsfieldPrediction> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getStatus(requestId);

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'nsfw') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Generation timed out');
  }
}

// Singleton instance
let higgsfieldClientInstance: HiggsfieldClient | null = null;

export function getHiggsfieldClient(): HiggsfieldClient {
  if (!higgsfieldClientInstance) {
    higgsfieldClientInstance = new HiggsfieldClient();
  }
  return higgsfieldClientInstance;
}
