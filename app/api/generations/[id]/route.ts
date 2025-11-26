import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    // ВРЕМЕННО: убрана авторизация для разработки
    // Получить генерацию
    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Если генерация еще в процессе, проверить статус на Replicate
    if (
      generation.status === 'processing' &&
      generation.replicate_prediction_id
    ) {
      try {
        const replicateClient = getReplicateClient();
        const prediction = await replicateClient.getPrediction(
          generation.replicate_prediction_id
        );

        // Обновить статус если изменился
        if (prediction.status === 'succeeded') {
          const outputUrls = Array.isArray(prediction.output)
            ? prediction.output
            : [prediction.output];

          await supabase
            .from('generations')
            .update({
              status: 'completed',
              output_urls: outputUrls,
              replicate_output: prediction,
            })
            .eq('id', id);

          generation.status = 'completed';
          generation.output_urls = outputUrls;
        } else if (prediction.status === 'failed') {
          await supabase
            .from('generations')
            .update({
              status: 'failed',
              error_message: prediction.error || 'Unknown error',
              replicate_output: prediction,
            })
            .eq('id', id);

          generation.status = 'failed';
          generation.error_message = prediction.error || 'Unknown error';
        }
      } catch (replicateError: any) {
        console.error('Error checking Replicate status:', replicateError);
      }
    }

    return NextResponse.json(generation);
  } catch (error: any) {
    console.error('Get generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    // ВРЕМЕННО: убрана авторизация для разработки
    // Получить генерацию
    const { data: generation } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .single();

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Если генерация в процессе, отменить на Replicate
    if (
      generation.status === 'processing' &&
      generation.replicate_prediction_id
    ) {
      try {
        const replicateClient = getReplicateClient();
        await replicateClient.cancelPrediction(
          generation.replicate_prediction_id
        );
      } catch (error) {
        console.error('Error canceling Replicate prediction:', error);
      }
    }

    // Обновить статус на cancelled
    await supabase
      .from('generations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

