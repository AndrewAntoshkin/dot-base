import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Получить генерацию только своего пользователя
    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
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
          // Обработка вывода от Replicate (может быть строка, массив или объект)
          let replicateUrls: string[] = [];
          const output = prediction.output;
          
          if (typeof output === 'string') {
            replicateUrls = [output];
          } else if (Array.isArray(output)) {
            replicateUrls = output.filter(url => typeof url === 'string');
          } else if (output && typeof output === 'object') {
            // Некоторые модели возвращают объект с URL внутри
            const possibleUrlFields = ['url', 'video', 'output', 'result'];
            for (const field of possibleUrlFields) {
              if ((output as any)[field] && typeof (output as any)[field] === 'string') {
                replicateUrls = [(output as any)[field]];
                break;
              }
            }
          }

          // Сохранить медиа в storage
          let outputUrls = replicateUrls;
          if (replicateUrls.length > 0) {
            const savedUrls = await saveGenerationMedia(replicateUrls, generation.id);
            if (savedUrls.length > 0) {
              outputUrls = savedUrls;
            }
          }

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
    
    // Get current user
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Получить генерацию только своего пользователя
    const { data: generation } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
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

    // Удалить файлы из Storage (если есть)
    if (generation.output_urls && generation.output_urls.length > 0) {
      try {
        // Извлекаем имена файлов из URL
        const fileNames = generation.output_urls
          .map((url: string) => {
            // URL формата: https://xxx.supabase.co/storage/v1/object/public/generations/filename.ext
            const match = url.match(/\/generations\/([^?]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean);

        if (fileNames.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('generations')
            .remove(fileNames);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
      } catch (storageErr) {
        console.error('Error processing storage deletion:', storageErr);
      }
    }

    // Удалить запись из базы данных
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting generation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('Delete generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

