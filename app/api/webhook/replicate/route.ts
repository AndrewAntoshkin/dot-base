import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';

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

    // Найти генерацию по prediction ID
    const { data: generation } = await supabase
      .from('generations')
      .select('*')
      .eq('replicate_prediction_id', predictionId)
      .single();

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
          updateData.error_message = 'No output URLs received from Replicate';
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
          await supabase.rpc('decrement_credits', {
            user_id_param: generation.user_id,
            credits_param: generation.cost_credits || 1,
          });
        } catch (creditsError) {
          console.log('Credits deduction skipped (function may not exist)');
        }
      }
    } else if (status === 'failed') {
      updateData.status = 'failed';
      
      // Детальный разбор ошибки
      let errorMessage = error || 'Unknown error';
      
      // Логируем полный ответ для отладки
      console.error('=== REPLICATE PREDICTION FAILED ===');
      console.error('Prediction ID:', predictionId);
      console.error('Generation ID:', generation.id);
      console.error('Model:', generation.model_id);
      console.error('Error field:', error);
      console.error('Full body:', JSON.stringify(body, null, 2));
      
      // Улучшенные сообщения об ошибках
      if (!error || error === '') {
        // Replicate часто не даёт причину - проверяем типичные случаи
        const modelName = (generation.model_id || '').toLowerCase();
        
        if (modelName.includes('nano-banana') || modelName.includes('gemini')) {
          errorMessage = 'Контент заблокирован фильтром безопасности Google. Попробуйте изменить запрос';
        } else if (body.logs?.includes('NSFW') || body.logs?.includes('safety')) {
          errorMessage = 'Контент заблокирован фильтром безопасности';
        } else if (body.logs?.includes('timeout') || body.logs?.includes('exceeded')) {
          errorMessage = 'Превышено время генерации. Попробуйте снова';
        } else if (body.logs?.includes('memory') || body.logs?.includes('OOM')) {
          errorMessage = 'Недостаточно ресурсов. Попробуйте уменьшить разрешение';
        } else {
          errorMessage = 'Генерация не удалась. Попробуйте изменить параметры или выбрать другую модель';
        }
      }
      
      updateData.error_message = errorMessage;
    }

    await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generation.id);

    console.log('Webhook completed successfully for generation:', generation.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


