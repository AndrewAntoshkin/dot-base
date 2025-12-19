import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface GenerationRecord {
  id: string;
  status: string;
  replicate_prediction_id: string | null;
  action: string;
  [key: string]: any;
}

/**
 * Синхронизирует статусы processing генераций с Replicate
 * Вызывается с фронтенда при показе страницы истории
 */
export async function POST() {
  try {
    // Get current user
    const cookieStore = await cookies();
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

    // Получить все processing генерации пользователя
    const { data } = await supabase
      .from('generations')
      .select('id, status, replicate_prediction_id, action')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .not('replicate_prediction_id', 'is', null);

    const generations = (data || []) as GenerationRecord[];

    logger.info(`[Sync] Found ${generations.length} processing generations for user ${user.id}`);

    if (generations.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const replicateClient = getReplicateClient();
    let syncedCount = 0;

    // Проверяем статус каждой генерации в Replicate
    for (const gen of generations) {
      if (!gen.replicate_prediction_id) continue;

      try {
        const prediction = await replicateClient.getPrediction(gen.replicate_prediction_id);

        if (prediction.status === 'succeeded') {
          const output = prediction.output;
          const isAnalyze = gen.action?.startsWith('analyze_');

          if (isAnalyze) {
            // Текстовый вывод
            let textOutput: string | null = null;
            if (typeof output === 'string') {
              textOutput = output;
            } else if (Array.isArray(output)) {
              textOutput = output.filter(item => typeof item === 'string').join('\n');
            } else if (output && typeof output === 'object') {
              const textFields = ['text', 'caption', 'description', 'prompt', 'output', 'result', 'content', 'answer'];
              for (const field of textFields) {
                if ((output as any)[field] && typeof (output as any)[field] === 'string') {
                  textOutput = (output as any)[field];
                  break;
                }
              }
            }

            if (textOutput) {
              await (supabase.from('generations') as any)
                .update({
                  status: 'completed',
                  output_text: textOutput,
                  output_urls: [textOutput],
                  replicate_output: prediction,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', gen.id);
              syncedCount++;
            }
          } else {
            // Медиа вывод
            let replicateUrls: string[] = [];
            if (typeof output === 'string') {
              replicateUrls = [output];
            } else if (Array.isArray(output)) {
              replicateUrls = output.filter(url => typeof url === 'string');
            } else if (output && typeof output === 'object') {
              const possibleUrlFields = ['url', 'video', 'output', 'result'];
              for (const field of possibleUrlFields) {
                if ((output as any)[field] && typeof (output as any)[field] === 'string') {
                  replicateUrls = [(output as any)[field]];
                  break;
                }
              }
            }

            let outputUrls = replicateUrls;
            let outputThumbs: string[] | null = null;
            if (replicateUrls.length > 0) {
              const { urls, thumbs } = await saveGenerationMedia(replicateUrls, gen.id);
              if (urls.length > 0) {
                outputUrls = urls;
              }
              if (thumbs.length > 0) {
                outputThumbs = thumbs;
              }
            }

            await (supabase.from('generations') as any)
              .update({
                status: 'completed',
                output_urls: outputUrls,
                output_thumbs: outputThumbs,
                replicate_output: prediction,
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            syncedCount++;
          }
        } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
          let errorMessage = 'Генерация не удалась';
          if (prediction.error) {
            const errorLower = prediction.error.toLowerCase();
            if (errorLower.includes('nsfw') || errorLower.includes('safety')) {
              errorMessage = 'Контент заблокирован фильтром безопасности';
            } else if (errorLower.includes('timeout')) {
              errorMessage = 'Превышено время генерации';
            }
          }

          await (supabase.from('generations') as any)
            .update({
              status: prediction.status === 'canceled' ? 'cancelled' : 'failed',
              error_message: errorMessage,
              replicate_output: prediction,
              completed_at: new Date().toISOString(),
            })
            .eq('id', gen.id);
          syncedCount++;
        }
        // Если статус всё ещё 'starting' или 'processing' - ничего не делаем
      } catch (err: any) {
        console.error(`Error syncing generation ${gen.id}:`, err.message);
      }
    }

    logger.info(`[Sync] Completed: synced ${syncedCount} of ${generations.length} generations`);

    return NextResponse.json({ 
      synced: syncedCount,
      total: generations.length 
    });
  } catch (error: any) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Ошибка синхронизации' },
      { status: 500 }
    );
  }
}










