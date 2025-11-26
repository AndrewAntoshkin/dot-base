import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: predictionId, status, output, error } = body;

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
      const outputUrls = Array.isArray(output) ? output : [output];
      updateData.status = 'completed';
      updateData.output_urls = outputUrls;

      // Вычесть кредиты у пользователя
      await supabase.rpc('decrement_credits', {
        user_id_param: generation.user_id,
        credits_param: generation.cost_credits,
      });
    } else if (status === 'failed') {
      updateData.status = 'failed';
      updateData.error_message = error || 'Unknown error';
    }

    await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generation.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


