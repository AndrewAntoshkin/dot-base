import { NextRequest, NextResponse } from 'next/server';
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

// Type for generation from DB
interface GenerationRecord {
  id: string;
  user_id: string;
  status: string;
  replicate_prediction_id?: string;
  replicate_model?: string;
  model_id?: string;
  output_urls?: string[];
  output_text?: string;
  error_message?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Выполнить операцию с ретраями
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Получаем пользователя из нашей таблицы
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user.email || '')
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const typedDbUser = dbUser as { id: string; role: string };

    // Получаем workspaces пользователя
    const { data: userWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', typedDbUser.id);
    
    const userWorkspaceIds = (userWorkspaces as { workspace_id: string }[] | null)?.map(w => w.workspace_id) || [];

    // Получить генерацию с ретраями на случай проблем с БД
    const fetchGeneration = async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    };
    
    let generation: GenerationRecord | null = null;
    let error;
    try {
      generation = await withRetry(fetchGeneration, 3, 500) as GenerationRecord;
    } catch (e) {
      error = e;
    }

    if (error || !generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Проверяем доступ: своя генерация ИЛИ в том же workspace ИЛИ super_admin
    const isOwner = generation.user_id === typedDbUser.id;
    const isInSameWorkspace = generation.workspace_id && userWorkspaceIds.includes(generation.workspace_id as string);
    const isSuperAdmin = typedDbUser.role === 'super_admin';

    if (!isOwner && !isInSameWorkspace && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем данные создателя если это не своя генерация
    let creator: { id: string; email: string; name: string } | null = null;
    if (!isOwner) {
      const { data: creatorUser } = await supabase
        .from('users')
        .select('id, email, telegram_first_name')
        .eq('id', generation.user_id)
        .single();
      
      if (creatorUser) {
        const typedCreator = creatorUser as { id: string; email: string; telegram_first_name: string | null };
        creator = {
          id: typedCreator.id,
          email: typedCreator.email,
          name: typedCreator.telegram_first_name || typedCreator.email?.split('@')[0] || 'User',
        };
      }
    }

    // Если генерация еще в процессе, проверить статус
    if (
      generation.status === 'processing' &&
      generation.replicate_prediction_id
    ) {
      // Determine provider from model config
      const modelConfig = generation.model_id ? getModelById(generation.model_id) : null;
      
      // Fallback: detect provider from replicate_model field if model not found
      let provider = modelConfig?.provider || 'replicate';
      if (!modelConfig && generation.replicate_model) {
        if (generation.replicate_model.includes('higgsfield')) {
          provider = 'higgsfield';
          logger.warn(`[GET Generation] ${id}: Model not found for id "${generation.model_id}", falling back to higgsfield based on replicate_model "${generation.replicate_model}"`);
        } else if (generation.replicate_model.startsWith('fal-ai/') || generation.replicate_model.includes('fal.ai')) {
          provider = 'fal';
          logger.warn(`[GET Generation] ${id}: Model not found for id "${generation.model_id}", falling back to fal based on replicate_model "${generation.replicate_model}"`);
        }
      }
      
      logger.debug(`[GET Generation] ${id}: Checking status, model_id="${generation.model_id}", provider="${provider}", modelConfig found: ${!!modelConfig}`);

      // Check if Google provider fell back to Replicate
      // If replicate_model is 'google/nano-banana-pro' (Replicate model), treat as Replicate
      const actualProvider = (provider === 'google' && generation.replicate_model === 'google/nano-banana-pro') 
        ? 'replicate' 
        : provider;
      
      try {
        if (actualProvider === 'google') {
          // Google AI is synchronous - generation should already be completed
          // No external status check needed, just return current state from database
          logger.debug(`[GET Generation] ${id}: Google provider - using database status: ${generation.status}`);
          // Nothing to do - generation.status is already set from database
        } else if (actualProvider === 'fal') {
          // Fal.ai status check
          const falClient = getFalClient();
          const falModel = generation.replicate_model || modelConfig?.replicateModel || '';
          
          const status = await falClient.getQueueStatus(falModel, generation.replicate_prediction_id);
          
          logger.debug(`[GET Generation] ${id}: Fal status = ${status.status}`, {
            action: generation.action,
            model: generation.model_name,
            requestId: generation.replicate_prediction_id,
          });

          if (status.status === 'COMPLETED') {
            const result = await falClient.getResult(falModel, generation.replicate_prediction_id);
            const output = result.output as any;
            
            let outputUrls: string[] = [];
            
            // Handle video output (video models)
            if (output?.video?.url) {
              outputUrls = [output.video.url];
            }
            // Handle images output (image models like nano-banana-pro)
            else if (output?.images && Array.isArray(output.images)) {
              outputUrls = output.images.map((img: any) => img.url).filter(Boolean);
            }
            // Handle single image output
            else if (output?.image?.url) {
              outputUrls = [output.image.url];
            }

            if (outputUrls.length > 0) {
              const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(outputUrls, generation.id);
              
              const { error: updateError } = await (supabase.from('generations') as any)
                .update({
                  status: 'completed',
                  output_urls: savedUrls.length > 0 ? savedUrls : outputUrls,
                  output_thumbs: savedThumbs.length > 0 ? savedThumbs : null,
                  replicate_output: result,  // Use same column for both providers
                  completed_at: new Date().toISOString(),
                })
                .eq('id', id);

              if (updateError) {
                logger.error(`[GET Generation] Failed to update Fal.ai generation ${id}:`, updateError);
              } else {
                logger.info(`[GET Generation] Successfully updated Fal.ai generation ${id} to completed`);
              }

              generation.status = 'completed';
              generation.output_urls = savedUrls.length > 0 ? savedUrls : outputUrls;
              (generation as any).output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
            }
          } else if (status.status === 'FAILED') {
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: 'Генерация не удалась',
                completed_at: new Date().toISOString(),
              })
              .eq('id', id);

            generation.status = 'failed';
            generation.error_message = 'Генерация не удалась';
          }
          // If IN_QUEUE or IN_PROGRESS - do nothing, generation is still processing
        } else if (actualProvider === 'higgsfield') {
          // Higgsfield status check
          const higgsfieldClient = getHiggsfieldClient();
          
          const status = await higgsfieldClient.getStatus(generation.replicate_prediction_id);
          
          logger.debug(`[GET Generation] ${id}: Higgsfield status = ${status.status}`, {
            action: generation.action,
            model: generation.model_name,
            requestId: generation.replicate_prediction_id,
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
              const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(outputUrls, generation.id);
              
              const { error: updateError } = await (supabase.from('generations') as any)
                .update({
                  status: 'completed',
                  output_urls: savedUrls.length > 0 ? savedUrls : outputUrls,
                  output_thumbs: savedThumbs.length > 0 ? savedThumbs : null,
                  replicate_output: status,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', id);

              if (updateError) {
                logger.error(`[GET Generation] Failed to update Higgsfield generation ${id}:`, updateError);
              } else {
                logger.info(`[GET Generation] Successfully updated Higgsfield generation ${id} to completed`);
              }

              generation.status = 'completed';
              generation.output_urls = savedUrls.length > 0 ? savedUrls : outputUrls;
              (generation as any).output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
            }
          } else if (status.status === 'failed') {
            const errorMessage = status.error || 'Генерация не удалась';
            
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: errorMessage,
                replicate_output: status,
                completed_at: new Date().toISOString(),
              })
              .eq('id', id);

            generation.status = 'failed';
            generation.error_message = errorMessage;
          } else if (status.status === 'nsfw') {
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: 'Content blocked by safety filter',
                replicate_output: status,
                completed_at: new Date().toISOString(),
              })
              .eq('id', id);

            generation.status = 'failed';
            generation.error_message = 'Content blocked by safety filter';
          }
          // If queued or in_progress - do nothing, generation is still processing
        } else {
          // Replicate status check (default)
          const replicateClient = getReplicateClient();
          const prediction = await replicateClient.getPrediction(
            generation.replicate_prediction_id
          );
          
          // Log Replicate status for debugging
          logger.debug(`[GET Generation] ${id}: Replicate status = ${prediction.status}`, {
            action: generation.action,
            model: generation.model_name,
            replicateStatus: prediction.status,
          });

          // Обновить статус если изменился
          if (prediction.status === 'succeeded') {
            const output = prediction.output;
            const isAnalyze = generation.action?.startsWith('analyze_');
            
            if (isAnalyze) {
              // Обработка текстового вывода для analyze моделей
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
                await (supabase
                  .from('generations') as any)
                  .update({
                    status: 'completed',
                    output_text: textOutput,
                    output_urls: [textOutput], // Для совместимости
                    replicate_output: prediction,
                  })
                  .eq('id', id);

                generation.status = 'completed';
                generation.output_text = textOutput;
                generation.output_urls = [textOutput];
              }
            } else {
              // Обработка медиа вывода
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

              // Сохранить медиа в storage
              let outputUrls = replicateUrls;
              let outputThumbs: string[] | null = null;
              if (replicateUrls.length > 0) {
                const { urls, thumbs } = await saveGenerationMedia(replicateUrls, generation.id);
                if (urls.length > 0) outputUrls = urls;
                if (thumbs.length > 0) outputThumbs = thumbs;
              }

              await (supabase
                .from('generations') as any)
                .update({
                  status: 'completed',
                  output_urls: outputUrls,
                  output_thumbs: outputThumbs,
                  replicate_output: prediction,
                })
                .eq('id', id);

              generation.status = 'completed';
              generation.output_urls = outputUrls;
              (generation as any).output_thumbs = outputThumbs;
            }
          } else if (prediction.status === 'failed') {
            let cleanError = 'Generation failed. Try changing parameters';
            if (prediction.error) {
              const errorLower = prediction.error.toLowerCase();
              if (errorLower.includes('nsfw') || errorLower.includes('safety') || errorLower.includes('blocked')) {
                cleanError = 'Content blocked by safety filter';
              } else if (errorLower.includes('timeout')) {
                cleanError = 'Generation timed out';
              }
            }
            
            await (supabase
              .from('generations') as any)
              .update({
                status: 'failed',
                error_message: cleanError,
                replicate_output: prediction,
              })
              .eq('id', id);

            generation.status = 'failed';
            generation.error_message = cleanError;
          }
        }
      } catch (statusError: any) {
        console.error('Error checking prediction status:', statusError);
      }
    }

    return NextResponse.json({
      ...generation,
      is_owner: isOwner,
      creator: creator,
    });
  } catch (error: any) {
    console.error('Get generation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
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

    // Получить генерацию только своего пользователя
    const { data } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const generation = data as GenerationRecord | null;

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Если генерация в процессе, отменить
    if (
      generation.status === 'processing' &&
      generation.replicate_prediction_id
    ) {
      // Determine provider from model config
      const modelConfig = generation.model_id ? getModelById(generation.model_id) : null;
      const provider = modelConfig?.provider || 'replicate';

      try {
        if (provider === 'google') {
          // Google AI is synchronous - nothing to cancel
          logger.debug(`[DELETE] Google generation ${id} - synchronous, nothing to cancel`);
        } else if (provider === 'fal') {
          // Fal.ai doesn't have a direct cancel API for queued requests
          // Just log it - the generation will fail/timeout on its own
          logger.debug(`[DELETE] Fal.ai generation ${id} - no cancel API available`);
        } else if (provider === 'higgsfield') {
          // Higgsfield cancel
          const higgsfieldClient = getHiggsfieldClient();
          await higgsfieldClient.cancel(generation.replicate_prediction_id);
        } else {
          // Replicate cancel
          const replicateClient = getReplicateClient();
          await replicateClient.cancelPrediction(
            generation.replicate_prediction_id
          );
        }
      } catch (error) {
        console.error('Error canceling prediction:', error);
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
          .filter((name): name is string => name !== null);

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

