import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationImages } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: predictionId, status, output, error } = body;

    console.log('Webhook received:', { predictionId, status });

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

    // Обновить статус генерации
    const updateData: any = {
      replicate_output: body,
    };

    if (status === 'succeeded') {
      const replicateUrls = Array.isArray(output) ? output : [output];
      
      console.log('Saving images to storage...', { count: replicateUrls.length });
      
      // Сохранить изображения в Supabase Storage
      const savedUrls = await saveGenerationImages(replicateUrls, generation.id);
      
      console.log('Images saved:', { savedCount: savedUrls.length });
      
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
    } else if (status === 'failed') {
      updateData.status = 'failed';
      updateData.error_message = error || 'Unknown error';
    }

    await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generation.id);

    console.log('Webhook completed successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


