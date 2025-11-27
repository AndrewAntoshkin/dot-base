import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';

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
      // Обработка вывода от Replicate (может быть строка, массив или объект)
      let replicateUrls: string[] = [];
      
      if (typeof output === 'string') {
        replicateUrls = [output];
      } else if (Array.isArray(output)) {
        replicateUrls = output.filter(url => typeof url === 'string');
      } else if (output && typeof output === 'object') {
        // Некоторые модели возвращают объект с URL внутри
        const possibleUrlFields = ['url', 'video', 'output', 'result'];
        for (const field of possibleUrlFields) {
          if (output[field] && typeof output[field] === 'string') {
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

        // Вычесть кредиты у пользователя (если функция существует)
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
      updateData.error_message = error || 'Unknown error';
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


