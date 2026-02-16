/**
 * Google Generative AI Client for direct Nano Banana Pro generation
 * Uses gemini-3-pro-image-preview for image generation
 */

import logger from '@/lib/logger';

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;
const BASE_URL = process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

// Model mapping
export const GOOGLE_MODELS = {
  'nano-banana-pro': 'gemini-3-pro-image-preview',
  'nano-banana': 'gemini-2.5-flash-image',
} as const;

export interface GoogleGenerateOptions {
  model: string;
  input: Record<string, any>;
}

export interface GoogleGenerateResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
  timeMs?: number;
}

/**
 * Google AI Client for image generation
 */
export class GoogleAIClient {
  private apiKey: string;

  constructor() {
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }
    this.apiKey = GOOGLE_API_KEY;
  }

  /**
   * Generate image using Google Generative AI
   * Returns base64 encoded image data
   */
  async generate(options: GoogleGenerateOptions): Promise<GoogleGenerateResult> {
    const startTime = Date.now();
    
    // Map model name to Google model
    const googleModel = GOOGLE_MODELS[options.model as keyof typeof GOOGLE_MODELS] || options.model;
    
    logger.info(`[Google AI] Starting generation with model: ${googleModel}, base: ${BASE_URL}`);
    logger.debug('[Google AI] Input:', JSON.stringify(options.input, null, 2));

    // Validate prompt
    const prompt = options.input.prompt;
    if (!prompt || typeof prompt !== 'string') {
      return {
        success: false,
        error: 'Требуется ввести описание (prompt)',
        timeMs: 0,
      };
    }

    try {
      // Build content parts
      const parts: any[] = [];
      
      // Add reference images if provided
      if (options.input.image_input) {
        const images = Array.isArray(options.input.image_input) 
          ? options.input.image_input 
          : [options.input.image_input];
        
        for (const imageUrl of images) {
          // Fetch and convert to base64 if it's a URL
          if (imageUrl.startsWith('http')) {
            try {
              const imageResponse = await fetch(imageUrl);
              const imageBuffer = await imageResponse.arrayBuffer();
              const base64 = Buffer.from(imageBuffer).toString('base64');
              const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
              
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64,
                },
              });
            } catch (imgError: any) {
              logger.warn(`[Google AI] Failed to fetch reference image: ${imgError.message}`);
            }
          } else if (imageUrl.startsWith('data:')) {
            // Already base64 data URL
            const [header, data] = imageUrl.split(',');
            const mimeType = header.match(/data:(.*);/)?.[1] || 'image/jpeg';
            parts.push({
              inlineData: {
                mimeType,
                data,
              },
            });
          }
        }
      }
      
      // Add prompt
      parts.push({ text: prompt });

      // Build imageConfig from input settings
      const imageConfig: Record<string, any> = {};
      
      // Map aspect_ratio
      if (options.input.aspect_ratio && options.input.aspect_ratio !== 'match_input_image') {
        imageConfig.aspectRatio = options.input.aspect_ratio;
      }
      
      // Map resolution to imageSize (Google uses uppercase: 1K, 2K, 4K)
      if (options.input.resolution) {
        imageConfig.imageSize = options.input.resolution;
      }

      // Build request body
      const requestBody: Record<string, any> = {
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };
      
      // Add imageConfig if we have any settings
      if (Object.keys(imageConfig).length > 0) {
        requestBody.generationConfig.imageConfig = imageConfig;
      }
      
      logger.debug('[Google AI] Request body:', JSON.stringify(requestBody.generationConfig, null, 2));

      // Make API call
      const response = await fetch(
        `${BASE_URL}/models/${googleModel}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      const elapsed = Date.now() - startTime;

      // Проверяем HTTP статус до парсинга JSON — при блокировке/недоступности
      // API возвращает HTML-страницу, и response.json() падает
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const isHtml = text.trimStart().startsWith('<');
        logger.error(`[Google AI] HTTP ${response.status}:`, isHtml ? '(HTML response — API blocked or unavailable)' : text.substring(0, 200));
        return {
          success: false,
          error: response.status === 403
            ? 'Google API заблокирован. Используется fallback модель'
            : `Google API недоступен (HTTP ${response.status})`,
          timeMs: elapsed,
        };
      }

      const data = await response.json();

      if (data.error) {
        logger.error(`[Google AI] API error:`, data.error);
        return {
          success: false,
          error: this.sanitizeError(data.error.message || 'Google API error'),
          timeMs: elapsed,
        };
      }

      // Extract image from response
      const responseParts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = responseParts.find((p: any) => p.inlineData);

      if (imagePart?.inlineData) {
        logger.info(`[Google AI] Generation successful in ${elapsed}ms`);
        return {
          success: true,
          imageBase64: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType || 'image/png',
          timeMs: elapsed,
        };
      }

      // No image in response
      const textResponse = responseParts.find((p: any) => p.text)?.text;
      logger.warn(`[Google AI] No image in response. Text: ${textResponse?.substring(0, 200)}`);
      
      return {
        success: false,
        error: textResponse || 'No image generated',
        timeMs: elapsed,
      };
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      logger.error(`[Google AI] Error:`, error.message);
      
      return {
        success: false,
        error: this.sanitizeError(error.message),
        timeMs: elapsed,
      };
    }
  }

  /**
   * Sanitize error message for user display
   */
  private sanitizeError(message: string): string {
    const errorMappings: [RegExp, string][] = [
      [/quota|limit|exceeded/i, 'Превышен лимит запросов. Попробуйте позже'],
      [/invalid.*key|authentication|unauthorized/i, 'Ошибка авторизации Google API'],
      [/safety|blocked|harmful|nsfw/i, 'Контент заблокирован фильтром безопасности'],
      [/timeout/i, 'Превышено время ожидания'],
      [/not found|unavailable/i, 'Модель временно недоступна'],
      [/rate limit/i, 'Слишком много запросов. Подождите немного'],
    ];

    for (const [pattern, replacement] of errorMappings) {
      if (pattern.test(message)) {
        return replacement;
      }
    }

    // Remove technical details
    if (message.length > 150 || /http|api|key|token/i.test(message)) {
      return 'Ошибка при генерации. Попробуйте изменить промпт';
    }

    return message;
  }
}

// Singleton instance
let googleClientInstance: GoogleAIClient | null = null;

export function getGoogleAIClient(): GoogleAIClient {
  if (!googleClientInstance) {
    googleClientInstance = new GoogleAIClient();
  }
  return googleClientInstance;
}
