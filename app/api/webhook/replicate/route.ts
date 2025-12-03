import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';

// Type for generation from DB
interface GenerationRecord {
  id: string;
  user_id: string;
  status: string;
  replicate_prediction_id?: string;
  output_urls?: string[];
  output_text?: string;
  error_message?: string;
  action: string;
  model_id: string;
  settings?: Record<string, any>;
  cost_credits?: number;
  replicate_input?: Record<string, any>;
  [key: string]: any;
}

/**
 * Выполнить операцию с ретраями
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Максимальное количество автоматических ретраев для нестабильных моделей
const MAX_AUTO_RETRIES = 2;

// Модели, которые могут быть нестабильными и заслуживают автоматического ретрая
const UNSTABLE_MODELS = ['nano-banana', 'gemini'];

/**
 * Проверяет, является ли модель нестабильной и заслуживает автоматического ретрая
 */
function isUnstableModel(modelId: string): boolean {
  const modelLower = (modelId || '').toLowerCase();
  return UNSTABLE_MODELS.some(m => modelLower.includes(m));
}

/**
 * Проверяет, можно ли сделать автоматический ретрай
 */
function canAutoRetry(generation: any): boolean {
  // Проверяем, что это нестабильная модель
  if (!isUnstableModel(generation.model_id)) {
    return false;
  }
  
  // Проверяем количество предыдущих ретраев
  const currentRetryCount = generation.settings?.auto_retry_count || 0;
  return currentRetryCount < MAX_AUTO_RETRIES;
}

/**
 * Выполняет автоматический ретрай генерации
 */
async function performAutoRetry(
  generation: any,
  supabase: any
): Promise<{ success: boolean; newPredictionId?: string }> {
  try {
    console.log('=== AUTO RETRY ===');
    console.log('Generation ID:', generation.id);
    console.log('Model:', generation.model_id);
    console.log('Current retry count:', generation.settings?.auto_retry_count || 0);
    
    const model = getModelById(generation.model_id);
    if (!model) {
      console.error('Model not found for retry:', generation.model_id);
      return { success: false };
    }
    
    const replicateClient = getReplicateClient();
    
    // Webhook URL
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
      : undefined;
    
    // Восстанавливаем input для Replicate
    const replicateInput = generation.replicate_input || {
      prompt: generation.prompt,
      ...generation.settings,
    };
    
    // Удаляем наши внутренние поля
    delete replicateInput.auto_retry_count;
    
    const { prediction, tokenId } = await replicateClient.run({
      model: model.replicateModel,
      version: model.version,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: webhookUrl ? ['completed'] : undefined,
    });
    
    // Обновляем генерацию с новым prediction ID и увеличиваем счётчик ретраев
    const newRetryCount = (generation.settings?.auto_retry_count || 0) + 1;
    
    await (supabase
      .from('generations') as any)
      .update({
        replicate_prediction_id: prediction.id,
        replicate_token_index: tokenId,
        status: 'processing',
        error_message: null,
        settings: {
          ...generation.settings,
          auto_retry_count: newRetryCount,
        },
      })
      .eq('id', generation.id);
    
    console.log('Auto retry started:', {
      generationId: generation.id,
      newPredictionId: prediction.id,
      retryCount: newRetryCount,
    });
    
    return { success: true, newPredictionId: prediction.id };
  } catch (error: any) {
    console.error('Auto retry failed:', error.message);
    return { success: false };
  }
}

// Проверяем, является ли action текстовым (analyze)
function isTextAction(action: string): boolean {
  return action.startsWith('analyze_');
}

// Проверяем, является ли вывод URL-ом медиа файла
function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Проверяем, начинается ли с http/https
  if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('data:')) {
    return false;
  }
  
  // Проверяем расширения медиа файлов
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov'];
  const lowerValue = value.toLowerCase();
  return mediaExtensions.some(ext => lowerValue.includes(ext));
}

// Извлекаем текст из различных форматов вывода
function extractTextOutput(output: any): string | null {
  if (!output) return null;
  
  // Если уже строка - возвращаем
  if (typeof output === 'string') {
    // Но проверяем что это не URL
    if (!isMediaUrl(output)) {
      return output;
    }
    return null;
  }
  
  // Если массив - объединяем текстовые элементы
  if (Array.isArray(output)) {
    const textParts = output.filter(item => typeof item === 'string' && !isMediaUrl(item));
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
    return null;
  }
  
  // Если объект - ищем текстовые поля
  if (typeof output === 'object') {
    const textFields = ['text', 'caption', 'description', 'prompt', 'output', 'result', 'content', 'answer'];
    for (const field of textFields) {
      if (output[field] && typeof output[field] === 'string' && !isMediaUrl(output[field])) {
        return output[field];
      }
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: predictionId, status, output, error } = body;

    console.log('Webhook received:', { predictionId, status, outputType: typeof output });

    if (!predictionId) {
      return NextResponse.json({ error: 'Missing prediction ID' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Найти генерацию по prediction ID (с ретраями на случай проблем с БД)
    const findGeneration = async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('replicate_prediction_id', predictionId)
        .single();
      
      if (error) throw error;
      return data;
    };
    
    let generation: GenerationRecord | null = null;
    try {
      generation = await withRetry(findGeneration, 3, 1000, 'Find generation') as GenerationRecord;
    } catch (findError) {
      console.error('Generation not found for prediction after retries:', predictionId);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (!generation) {
      console.error('Generation not found for prediction:', predictionId);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    console.log('Found generation:', { 
      id: generation.id, 
      action: generation.action,
      model: generation.model_id 
    });

    // Обновить статус генерации
    const updateData: any = {
      replicate_output: body,
    };

    if (status === 'succeeded') {
      const isAnalyze = isTextAction(generation.action);
      
      if (isAnalyze) {
        // Обработка текстового вывода для analyze моделей
        console.log('Processing text output for analyze action...');
        
        const textOutput = extractTextOutput(output);
        
        if (textOutput) {
          console.log('Text output extracted:', textOutput.substring(0, 200));
          updateData.status = 'completed';
          updateData.output_text = textOutput;
          // Также сохраняем в output_urls для совместимости (если нет текста)
          updateData.output_urls = [textOutput];
        } else {
          console.error('No text output found for analyze action:', output);
          updateData.status = 'failed';
          updateData.error_message = 'No text output received';
        }
      } else {
        // Обработка медиа вывода (изображения/видео)
        let replicateUrls: string[] = [];
        
        if (typeof output === 'string' && isMediaUrl(output)) {
          replicateUrls = [output];
        } else if (Array.isArray(output)) {
          replicateUrls = output.filter(url => typeof url === 'string' && isMediaUrl(url));
        } else if (output && typeof output === 'object') {
          // Некоторые модели возвращают объект с URL внутри
          const possibleUrlFields = ['url', 'video', 'output', 'result'];
          for (const field of possibleUrlFields) {
            if (output[field] && typeof output[field] === 'string' && isMediaUrl(output[field])) {
              replicateUrls = [output[field]];
              break;
            }
          }
        }
        
        console.log('Replicate output URLs:', replicateUrls);
        
        if (replicateUrls.length === 0) {
          console.error('No valid URLs found in output:', output);
          updateData.status = 'failed';
          updateData.error_message = 'Не удалось получить результат генерации';
        } else {
          console.log('Saving media to storage...', { 
            count: replicateUrls.length,
            firstUrl: replicateUrls[0]?.substring(0, 100)
          });
          
          // Сохранить медиа файлы в Supabase Storage (изображения или видео)
          const savedUrls = await saveGenerationMedia(replicateUrls, generation.id);
          
          console.log('Media saved:', { 
            savedCount: savedUrls.length,
            firstSavedUrl: savedUrls[0]?.substring(0, 100)
          });
          
          updateData.status = 'completed';
          // Используем сохранённые URL если есть, иначе временные от Replicate
          updateData.output_urls = savedUrls.length > 0 ? savedUrls : replicateUrls;
        }
      }

      // Вычесть кредиты у пользователя (если функция существует)
      if (updateData.status === 'completed') {
        try {
          await (supabase.rpc as any)('decrement_credits', {
            user_id_param: generation.user_id,
            credits_param: generation.cost_credits || 1,
          });
        } catch (creditsError) {
          console.log('Credits deduction skipped (function may not exist)');
        }
      }
    } else if (status === 'failed') {
      // Детальный разбор ошибки
      let errorMessage = error || 'Unknown error';
      
      // Логируем полный ответ для отладки
      console.error('=== REPLICATE PREDICTION FAILED ===');
      console.error('Prediction ID:', predictionId);
      console.error('Generation ID:', generation.id);
      console.error('Model:', generation.model_id);
      console.error('Error field:', error);
      console.error('Full body:', JSON.stringify(body, null, 2));
      
      // Определяем, является ли это ошибкой, которую можно повторить
      const isRetryableError = !error || error === '' || 
        error.includes('timeout') || 
        error.includes('overloaded') ||
        error.includes('temporarily');
      
      // Пробуем автоматический ретрай для нестабильных моделей
      if (isRetryableError && canAutoRetry(generation)) {
        console.log('Attempting auto-retry for unstable model...');
        const retryResult = await performAutoRetry(generation, supabase);
        
        if (retryResult.success) {
          // Ретрай успешно запущен - не обновляем статус как failed
          console.log('Auto-retry initiated, skipping failed status update');
          return NextResponse.json({ 
            success: true, 
            retried: true,
            newPredictionId: retryResult.newPredictionId 
          });
        }
        console.log('Auto-retry failed, proceeding with failure status');
      }
      
      updateData.status = 'failed';
      
      // Улучшенные сообщения об ошибках
      if (!error || error === '') {
        // Replicate часто не даёт причину - проверяем типичные случаи
        const modelName = (generation.model_id || '').toLowerCase();
        
        if (modelName.includes('nano-banana') || modelName.includes('gemini')) {
          errorMessage = 'Генерация не удалась. Попробуйте изменить параметры';
        } else if (body.logs?.includes('NSFW') || body.logs?.includes('safety')) {
          errorMessage = 'Контент заблокирован фильтром безопасности';
        } else if (body.logs?.includes('timeout') || body.logs?.includes('exceeded')) {
          errorMessage = 'Превышено время генерации. Попробуйте снова';
        } else if (body.logs?.includes('memory') || body.logs?.includes('OOM')) {
          errorMessage = 'Недостаточно ресурсов. Попробуйте уменьшить разрешение';
        } else {
          errorMessage = 'Генерация не удалась. Попробуйте изменить параметры';
        }
      }
      
      updateData.error_message = errorMessage;
    }

    // Обновить БД с ретраями
    const updateGeneration = async () => {
      const { error } = await (supabase
        .from('generations') as any)
        .update(updateData)
        .eq('id', generation.id);
      
      if (error) throw error;
    };
    
    try {
      await withRetry(updateGeneration, 3, 1000, 'Update generation');
      console.log('Webhook completed successfully for generation:', generation.id);
    } catch (updateError: any) {
      console.error('Failed to update generation after retries:', updateError.message);
      // Возвращаем 500 чтобы Replicate попробовал снова
      return NextResponse.json(
        { error: 'Failed to save result' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Возвращаем 500 чтобы Replicate попробовал отправить webhook снова
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}


