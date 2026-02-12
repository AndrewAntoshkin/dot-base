import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { saveGenerationMedia } from '@/lib/supabase/storage';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import { calculateCostUsd } from '@/lib/pricing';
import { startNextKeyframeSegment } from '@/lib/keyframes';
import logger from '@/lib/logger';

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
  replicate_model: string;
  settings?: Record<string, any>;
  cost_credits?: number;
  cost_usd?: number;
  replicate_input?: Record<string, any>;
  is_keyframe_segment?: boolean;
  [key: string]: any;
}

const MAX_AUTO_RETRIES = 3;

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

function isRetryableError(error: string | null | undefined, body?: any): boolean {
  if (!error || error === '' || error === 'null' || error === 'undefined') return true;
  
  const errorLower = error.toLowerCase();
  const logs = (body?.logs || '').toLowerCase();
  
  const retryablePatterns = [
    'timeout', 'timed out', 'deadline exceeded', 'overloaded', 'overload',
    'too many requests', 'temporarily', 'temporary', 'try again',
    'rate limit', '503', '502', '500', '504', 'service unavailable',
    'bad gateway', 'connection', 'network', 'socket', 'internal error',
    'worker', 'cold boot', 'starting', 'model is warming', 'warming up',
    'resource exhausted', 'out of memory',
  ];
  
  return retryablePatterns.some(p => errorLower.includes(p) || logs.includes(p));
}

function isNonRetryableError(error: string | null | undefined, body?: any): boolean {
  if (!error) return false;
  
  const errorLower = error.toLowerCase();
  const logs = (body?.logs || '').toLowerCase();
  
  const nonRetryablePatterns = [
    'nsfw', 'safety', 'content policy', 'harmful', 'invalid input',
    'invalid parameter', 'validation', 'not found', '404',
    'unauthorized', 'forbidden', '401', '403', 'billing', 'payment',
    'credits', 'invalid api', 'api key',
  ];
  
  return nonRetryablePatterns.some(p => errorLower.includes(p) || logs.includes(p));
}

function canAutoRetry(generation: any, error: string | null | undefined, body?: any): boolean {
  if (isNonRetryableError(error, body)) return false;
  const currentRetryCount = generation.settings?.auto_retry_count || 0;
  if (currentRetryCount >= MAX_AUTO_RETRIES) return false;
  return isRetryableError(error, body);
}

async function performAutoRetry(
  generation: any,
  supabase: any
): Promise<{ success: boolean; newPredictionId?: string }> {
  try {
    const model = getModelById(generation.model_id);
    if (!model) return { success: false };
    
    const replicateClient = getReplicateClient();
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
      : undefined;
    
    const replicateInput = generation.replicate_input || {
      prompt: generation.prompt,
      ...generation.settings,
    };
    delete replicateInput.auto_retry_count;
    
    const replicateModel = generation.replicate_model || model.fallbackModel || model.replicateModel;
    const { prediction, tokenId } = await replicateClient.run({
      model: replicateModel,
      version: model.version,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: webhookUrl ? ['completed'] : undefined,
    });
    
    const newRetryCount = (generation.settings?.auto_retry_count || 0) + 1;
    
    await (supabase.from('generations') as any)
      .update({
        replicate_prediction_id: prediction.id,
        replicate_token_index: tokenId,
        status: 'processing',
        error_message: null,
        settings: { ...generation.settings, auto_retry_count: newRetryCount },
      })
      .eq('id', generation.id);
    
    logger.info('Auto retry started:', generation.id, 'attempt', newRetryCount);
    return { success: true, newPredictionId: prediction.id };
  } catch (error: any) {
    logger.error('Auto retry failed:', error.message);
    return { success: false };
  }
}

function getUserFriendlyErrorMessage(error: string | null | undefined, body: any): string {
  const errorLower = (error || '').toLowerCase();
  const logs = (body?.logs || '').toLowerCase();
  
  if (errorLower.includes('nsfw') || errorLower.includes('safety') || logs.includes('nsfw')) {
    return 'Контент заблокирован фильтром безопасности. Попробуйте изменить промпт';
  }
  if (errorLower.includes('timeout') || logs.includes('timeout')) {
    return 'Превышено время генерации. Попробуйте уменьшить разрешение';
  }
  if (errorLower.includes('memory') || errorLower.includes('oom') || logs.includes('memory')) {
    return 'Недостаточно ресурсов. Попробуйте уменьшить разрешение';
  }
  if (errorLower.includes('overload') || errorLower.includes('rate limit')) {
    return 'Сервер перегружен. Попробуйте через несколько минут';
  }
  if (errorLower.includes('invalid') || errorLower.includes('validation')) {
    return 'Некорректные параметры. Проверьте настройки';
  }
  if (!error || error === '' || error === 'null') {
    return 'Генерация не удалась. Попробуйте другую модель';
  }
  if (error.length > 150 || error.includes('stack') || error.includes('Error:')) {
    return 'Произошла ошибка. Попробуйте снова';
  }
  return error;
}

function isTextAction(action: string): boolean {
  return action.startsWith('analyze_');
}

function isMediaUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('data:')) {
    return false;
  }
  
  const lowercaseUrl = value.toLowerCase();
  
  // Проверяем по расширению
  const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv'];
  if (mediaExtensions.some(ext => lowercaseUrl.includes(ext))) {
    return true;
  }
  
  // Доверяем известным CDN хостам (Replicate, Luma, Runway и др.) - они всегда возвращают медиа
  const trustedMediaHosts = [
    'replicate.delivery',
    'pbxt.replicate.delivery',
    'luma-labs',
    'cdn.luma.ai',
    'runway',
    'fal.media',
    'storage.googleapis.com',
    'supabase.co/storage',
  ];
  if (trustedMediaHosts.some(host => lowercaseUrl.includes(host))) {
    return true;
  }
  
  return false;
}

function extractTextOutput(output: any): string | null {
  if (!output) return null;
  if (typeof output === 'string' && !isMediaUrl(output)) return output;
  if (Array.isArray(output)) {
    const textParts = output.filter(item => typeof item === 'string' && !isMediaUrl(item));
    if (textParts.length > 0) return textParts.join('\n');
  }
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

    if (!predictionId) {
      return NextResponse.json({ error: 'Missing prediction ID' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find generation
    let generation: GenerationRecord | null = null;
    try {
      generation = await withRetry(async () => {
        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .eq('replicate_prediction_id', predictionId)
          .single();
        if (error) throw error;
        return data;
      }) as GenerationRecord;
    } catch {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Idempotency check
    if (generation.status === 'completed' || generation.status === 'failed') {
      return NextResponse.json({ success: true, skipped: true });
    }

    const updateData: any = { replicate_output: body };

    if (status === 'succeeded') {
      const isAnalyze = isTextAction(generation.action);
      
      if (isAnalyze) {
        const textOutput = extractTextOutput(output);
        if (textOutput) {
          updateData.status = 'completed';
          updateData.output_text = textOutput;
          updateData.output_urls = [textOutput];
        } else {
          updateData.status = 'failed';
          updateData.error_message = 'No text output received';
        }
      } else {
        let replicateUrls: string[] = [];
        
        if (typeof output === 'string' && isMediaUrl(output)) {
          replicateUrls = [output];
        } else if (Array.isArray(output)) {
          replicateUrls = output.filter(url => typeof url === 'string' && isMediaUrl(url));
        } else if (output && typeof output === 'object') {
          const possibleUrlFields = ['url', 'video', 'output', 'result'];
          for (const field of possibleUrlFields) {
            if (output[field] && typeof output[field] === 'string' && isMediaUrl(output[field])) {
              replicateUrls = [output[field]];
              break;
            }
          }
        }
        
        if (replicateUrls.length === 0) {
          updateData.status = 'failed';
          updateData.error_message = 'Не удалось получить результат генерации';
        } else {
          // Для keyframe сегментов: сохраняем синхронно (критично для merge)
          // Для остальных: сохраняем асинхронно чтобы не блокировать вебхук
          if (generation.is_keyframe_segment) {
            const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(replicateUrls, generation.id);
            
            if (savedUrls.length === 0) {
              updateData.status = 'failed';
              updateData.error_message = 'Не удалось сохранить видео сегмента. Попробуйте снова.';
              logger.error('Keyframe segment media save failed:', generation.id);
            } else {
              updateData.status = 'completed';
              updateData.output_urls = savedUrls;
              updateData.output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
            }
          } else {
            // Синхронное сохранение медиа в Supabase Storage
            // Важно: в serverless среде (Vercel) background tasks не работают после отправки ответа
            const { urls: savedUrls, thumbs: savedThumbs } = await saveGenerationMedia(replicateUrls, generation.id);
            
            if (savedUrls.length > 0) {
              updateData.status = 'completed';
              updateData.output_urls = savedUrls;
              updateData.output_thumbs = savedThumbs.length > 0 ? savedThumbs : null;
              
              // Обновляем flow_nodes с постоянными URL
              const { data: flowNodes } = await (supabase.from('flow_nodes') as any)
                .select('id')
                .eq('generation_id', generation.id);
              
              if (flowNodes && flowNodes.length > 0) {
                for (const node of flowNodes) {
                  await (supabase.from('flow_nodes') as any)
                    .update({ output_url: savedUrls[0] })
                    .eq('id', node.id);
                }
                logger.debug(`Updated ${flowNodes.length} flow node(s) with permanent URL for generation ${generation.id}`);
              }
            } else {
              // Если не удалось сохранить в Storage, используем временные URL
              // Они будут работать ~1 час, но лучше чем ничего
              logger.warn('Media save failed, using temporary Replicate URLs:', generation.id);
              updateData.status = 'completed';
              updateData.output_urls = replicateUrls;
              updateData.output_thumbs = null;
            }
          }
        }
      }

      // Calculate cost
      if (updateData.status === 'completed') {
        const predictTime = body.metrics?.predict_time;
        if (predictTime && generation.replicate_model) {
          updateData.cost_usd = calculateCostUsd(predictTime, generation.replicate_model);
        }
        
        try {
          await (supabase.rpc as any)('decrement_credits', {
            user_id_param: generation.user_id,
            credits_param: generation.cost_credits || 1,
          });
        } catch {}
      }
    } else if (status === 'failed') {
      const currentRetryCount = generation.settings?.auto_retry_count || 0;
      
      // Try auto-retry
      if (canAutoRetry(generation, error, body)) {
        const retryResult = await performAutoRetry(generation, supabase);
        if (retryResult.success) {
          return NextResponse.json({ 
            success: true, 
            retried: true,
            retryCount: currentRetryCount + 1,
            newPredictionId: retryResult.newPredictionId 
          });
        }
      }
      
      updateData.status = 'failed';
      let errorMessage = getUserFriendlyErrorMessage(error, body);
      if (currentRetryCount > 0) {
        errorMessage = `${errorMessage} (после ${currentRetryCount} попыток)`;
      }
      updateData.error_message = errorMessage;
      
      logger.error('Generation failed:', generation.id, error);
    }

    // Update DB
    try {
      await withRetry(async () => {
        const { error } = await (supabase.from('generations') as any)
          .update(updateData)
          .eq('id', generation.id);
        if (error) throw error;
      });
    } catch (updateError: any) {
      logger.error('Failed to update generation:', updateError.message);
      return NextResponse.json({ error: 'Failed to save result' }, { status: 500 });
    }

    // Update Flow nodes if this generation is linked to a flow node
    try {
      const { data: flowNodes } = await (supabase.from('flow_nodes') as any)
        .select('id, status')
        .eq('generation_id', generation.id);
      
      if (flowNodes && flowNodes.length > 0) {
        const nodeStatus = updateData.status === 'completed' ? 'completed' : 
                          updateData.status === 'failed' ? 'failed' : 'processing';
        
        // Prepare update data with output URL for completed generations
        const nodeUpdateData: any = {
          status: nodeStatus,
          error_message: updateData.status === 'failed' ? updateData.error_message : null,
        };
        
        // If completed, also update output_url for immediate display
        if (updateData.status === 'completed' && updateData.output_urls?.[0]) {
          nodeUpdateData.output_url = updateData.output_urls[0];
          // Determine output type based on action
          if (generation.action?.startsWith('video_')) {
            nodeUpdateData.output_type = 'video';
          } else if (generation.action?.startsWith('analyze_')) {
            nodeUpdateData.output_type = 'text';
          } else {
            nodeUpdateData.output_type = 'image';
          }
        }
        
        for (const node of flowNodes) {
          await (supabase.from('flow_nodes') as any)
            .update(nodeUpdateData)
            .eq('id', node.id);
        }
        
        logger.debug(`Updated ${flowNodes.length} flow node(s) for generation ${generation.id}`, {
          status: nodeStatus,
          hasOutput: !!nodeUpdateData.output_url
        });
      }
    } catch (flowError: any) {
      // Log but don't fail - flow node update is not critical
      logger.warn('Failed to update flow nodes:', flowError.message);
    }

    // Handle keyframe segment completion - start next segment or merge
    if (generation.is_keyframe_segment && updateData.status === 'completed') {
      logger.info('Keyframe segment completed, checking for next...', generation.id);
      
      try {
        const nextResult = await startNextKeyframeSegment(generation.id, supabase);
        
        if (nextResult.started) {
          logger.info(`Started next keyframe ${nextResult.type}: ${nextResult.generationId}`);
        }
      } catch (keyframeError: any) {
        // Log but don't fail the webhook - segment is already saved
        logger.error('Failed to start next keyframe segment:', keyframeError.message);
      }
    }

    // Handle keyframe merge completion - update parent generation
    if (generation.settings?.keyframe_merge && updateData.status === 'completed') {
      const keyframeGroupId = generation.settings?.keyframe_group_id;
      if (keyframeGroupId) {
        logger.info('Keyframe merge completed, updating parent generation...', generation.id);
        
        try {
          // Find and update parent generation
          await (supabase.from('generations') as any)
            .update({
              status: 'completed',
              output_urls: updateData.output_urls,
              output_thumbs: updateData.output_thumbs,
              completed_at: new Date().toISOString(),
            })
            .eq('user_id', generation.user_id)
            .contains('settings', { keyframe_group_id: keyframeGroupId, keyframe_parent: true });
          
          logger.info('Updated parent keyframe generation');
        } catch (parentError: any) {
          logger.error('Failed to update parent keyframe generation:', parentError.message);
        }
      }
    }

    // Handle keyframe segment/merge failure - update parent generation
    if ((generation.is_keyframe_segment || generation.settings?.keyframe_merge) && updateData.status === 'failed') {
      const keyframeGroupId = generation.settings?.keyframe_group_id;
      if (keyframeGroupId) {
        logger.info('Keyframe failed, updating parent generation...', generation.id);
        
        try {
          await (supabase.from('generations') as any)
            .update({
              status: 'failed',
              error_message: updateData.error_message || 'Ошибка генерации keyframes',
              completed_at: new Date().toISOString(),
            })
            .eq('user_id', generation.user_id)
            .contains('settings', { keyframe_group_id: keyframeGroupId, keyframe_parent: true });
          
          logger.info('Updated parent keyframe generation as failed');
        } catch (parentError: any) {
          logger.error('Failed to update parent keyframe generation:', parentError.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
