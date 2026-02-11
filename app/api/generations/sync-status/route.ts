import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getFalClient } from '@/lib/fal/client';
import { getHiggsfieldClient } from '@/lib/higgsfield/client';
import { getModelById } from '@/lib/models-config';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface GenerationRecord {
  id: string;
  status: string;
  replicate_prediction_id: string | null;
  replicate_model: string;
  model_id: string;
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
      .select('id, status, replicate_prediction_id, replicate_model, model_id, action')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .not('replicate_prediction_id', 'is', null);

    const generations = (data || []) as GenerationRecord[];

    logger.info(`[Sync] Found ${generations.length} processing generations for user ${user.id}`);

    if (generations.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const replicateClient = getReplicateClient();
    const falClient = getFalClient();
    let syncedCount = 0;

    // Проверяем статус каждой генерации
    for (const gen of generations) {
      if (!gen.replicate_prediction_id) continue;

      // Determine provider from model config
      const modelConfig = getModelById(gen.model_id);
      
      // Fallback: detect provider from replicate_model field if model not found
      let provider = modelConfig?.provider || 'replicate';
      if (!modelConfig && gen.replicate_model) {
        if (gen.replicate_model.includes('higgsfield')) {
          provider = 'higgsfield';
          logger.warn(`[Sync] Model not found for id "${gen.model_id}", falling back to higgsfield`);
        } else if (gen.replicate_model.startsWith('fal-ai/') || gen.replicate_model.includes('fal.ai')) {
          provider = 'fal';
          logger.warn(`[Sync] Model not found for id "${gen.model_id}", falling back to fal`);
        }
      }

      // Check if Google provider fell back to Replicate
      // If replicate_model is 'google/nano-banana-pro' (Replicate model), treat as Replicate
      const actualProvider = (provider === 'google' && gen.replicate_model === 'google/nano-banana-pro') 
        ? 'replicate' 
        : provider;

      try {
        if (actualProvider === 'google') {
          // Google AI is synchronous - skip status check, use database state
          logger.debug(`[Sync] Generation ${gen.id}: Google provider - skipping (synchronous)`);
          continue;
        }
        
        if (actualProvider === 'fal') {
          // Fal.ai sync
          const status = await falClient.getQueueStatus(gen.replicate_model, gen.replicate_prediction_id);
          
          logger.debug(`[Sync] Generation ${gen.id}: Fal status = ${status.status}`, {
            requestId: gen.replicate_prediction_id,
            action: gen.action,
          });

          if (status.status === 'COMPLETED') {
            const result = await falClient.getResult(gen.replicate_model, gen.replicate_prediction_id);
            const output = result.output;
            
            let outputUrls: string[] = [];
            if (output?.video?.url) {
              outputUrls = [output.video.url];
            }

            if (outputUrls.length > 0) {
              const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(outputUrls, gen.id);
              
              await (supabase.from('generations') as any)
                .update({
                  status: 'completed',
                  output_urls: savedUrls.length > 0 ? savedUrls : outputUrls,
                  output_thumbs: savedThumbs.length > 0 ? savedThumbs : null,
                  replicate_output: result,  // Use same column for both providers
                  completed_at: new Date().toISOString(),
                })
                .eq('id', gen.id);
              syncedCount++;
            }
          } else if (status.status === 'FAILED') {
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: 'Генерация не удалась',
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            syncedCount++;
          }
          // If IN_QUEUE or IN_PROGRESS - skip
          continue;
        }

        if (actualProvider === 'higgsfield') {
          // Higgsfield sync
          const higgsfieldClient = getHiggsfieldClient();
          const status = await higgsfieldClient.getStatus(gen.replicate_prediction_id);
          
          logger.debug(`[Sync] Generation ${gen.id}: Higgsfield status = ${status.status}`, {
            requestId: gen.replicate_prediction_id,
            action: gen.action,
          });

          if (status.status === 'completed') {
            let outputUrls: string[] = [];
            
            // Video output
            if (status.video?.url) {
              outputUrls = [status.video.url];
            }
            // Image output
            else if (status.images && status.images.length > 0) {
              outputUrls = status.images.map(img => img.url);
            }

            if (outputUrls.length > 0) {
              const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(outputUrls, gen.id);
              
              await (supabase.from('generations') as any)
                .update({
                  status: 'completed',
                  output_urls: savedUrls.length > 0 ? savedUrls : outputUrls,
                  output_thumbs: savedThumbs.length > 0 ? savedThumbs : null,
                  replicate_output: status,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', gen.id);
              syncedCount++;
            }
          } else if (status.status === 'failed') {
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: status.error || 'Генерация не удалась',
                replicate_output: status,
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            syncedCount++;
          } else if (status.status === 'nsfw') {
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: 'Контент заблокирован фильтром безопасности',
                replicate_output: status,
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            syncedCount++;
          }
          // If queued or in_progress - skip
          continue;
        }

        // Replicate sync (default)
        const prediction = await replicateClient.getPrediction(gen.replicate_prediction_id);
        
        // Log actual Replicate status for debugging
        logger.debug(`[Sync] Generation ${gen.id}: Replicate status = ${prediction.status}`, {
          predictionId: gen.replicate_prediction_id,
          action: gen.action,
          replicateStatus: prediction.status,
          error: prediction.error || null,
        });

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
            // Проверяем что URL валидный (http/https)
            const isValidUrl = (url: string): boolean => {
              return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
            };
            
            let replicateUrls: string[] = [];
            if (typeof output === 'string' && isValidUrl(output)) {
              replicateUrls = [output];
            } else if (Array.isArray(output)) {
              replicateUrls = output.filter(url => typeof url === 'string' && isValidUrl(url));
            } else if (output && typeof output === 'object') {
              const possibleUrlFields = ['url', 'video', 'output', 'result'];
              for (const field of possibleUrlFields) {
                const fieldValue = (output as any)[field];
                if (fieldValue && typeof fieldValue === 'string' && isValidUrl(fieldValue)) {
                  replicateUrls = [fieldValue];
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










