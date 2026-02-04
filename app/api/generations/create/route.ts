import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getFalClient } from '@/lib/fal/client';
import { getHiggsfieldClient } from '@/lib/higgsfield/client';
import { getModelById } from '@/lib/models-config';
import { cookies } from 'next/headers';
import { z } from 'zod';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createGenerationSchema = z.object({
  action: z.enum([
    'create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale',
    'analyze_describe', 'analyze_ocr', 'analyze_prompt'
  ]),
  model_id: z.string(),
  prompt: z.string().nullish(),
  input_image_url: z.string().nullish(),
  input_video_url: z.string().nullish(),
  settings: z.record(z.any()).optional(),
  workspace_id: z.string().nullish(),
});

// Временно убран лимит на одновременные генерации
// const MAX_CONCURRENT_GENERATIONS = 5;

export async function POST(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
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

    const userId = user.id;
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const validatedData = createGenerationSchema.parse(body);

    // Get user workspace
    let workspaceId: string | null = null;
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);
    
    const userWorkspaceIds = (memberships as { workspace_id: string }[] | null)?.map(m => m.workspace_id) || [];
    
    if (validatedData.workspace_id && userWorkspaceIds.includes(validatedData.workspace_id)) {
      workspaceId = validatedData.workspace_id;
    } else if (userWorkspaceIds.length > 0) {
      workspaceId = userWorkspaceIds[0];
    }

    // Временно убрана проверка лимита на одновременные генерации
    // Check concurrent limit
    // const { count: activeCount } = await supabase
    //   .from('generations')
    //   .select('id', { count: 'exact', head: true })
    //   .eq('user_id', userId)
    //   .in('status', ['pending', 'processing']);
    // 
    // if (activeCount !== null && activeCount >= MAX_CONCURRENT_GENERATIONS) {
    //   return NextResponse.json(
    //     { 
    //       error: `Достигнут лимит одновременных генераций (${MAX_CONCURRENT_GENERATIONS}). Дождитесь завершения текущих генераций.`,
    //       code: 'CONCURRENT_LIMIT_EXCEEDED',
    //       activeCount,
    //       limit: MAX_CONCURRENT_GENERATIONS,
    //     },
    //     { status: 429 }
    //   );
    // }

    // Get model config
    const model = getModelById(validatedData.model_id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.action !== validatedData.action) {
      return NextResponse.json({ error: 'Model does not support this action' }, { status: 400 });
    }

    // Prepare Replicate input
    const replicateInput: Record<string, any> = { ...validatedData.settings };

    if (validatedData.prompt) {
      replicateInput.prompt = validatedData.prompt;
    }

    if (validatedData.input_image_url) {
      replicateInput.image = validatedData.input_image_url;
    }

    if (validatedData.input_video_url) {
      replicateInput.video = validatedData.input_video_url;
    }
    
    // Handle remove_bg
    if (validatedData.action === 'remove_bg') {
      if (!replicateInput.image && validatedData.settings?.image) {
        replicateInput.image = validatedData.settings.image;
      }
      if (!replicateInput.image) {
        return NextResponse.json({ error: 'Требуется загрузить изображение' }, { status: 400 });
      }
    }
    
    // Handle inpaint
    if (validatedData.action === 'inpaint') {
      if (!replicateInput.image) {
        return NextResponse.json({ error: 'Требуется загрузить изображение' }, { status: 400 });
      }
      if (!replicateInput.mask) {
        return NextResponse.json({ error: 'Требуется нарисовать маску' }, { status: 400 });
      }
      
      // FLUX Fill Pro defaults
      if (model.replicateModel === 'black-forest-labs/flux-fill-pro') {
        replicateInput.steps = replicateInput.steps || 50;
        replicateInput.guidance = replicateInput.guidance || 60;
        if (!replicateInput.output_format || !['jpg', 'png'].includes(replicateInput.output_format)) {
          replicateInput.output_format = 'jpg';
        }
      }
    }

    // Create DB record with retry logic for connection issues
    let generation: any = null;
    let insertError: any = null;
    const MAX_INSERT_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_INSERT_RETRIES; attempt++) {
      const result = await (supabase
        .from('generations') as any)
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          action: validatedData.action,
          model_id: validatedData.model_id,
          model_name: model.name,
          replicate_model: model.replicateModel,
          prompt: validatedData.prompt,
          input_image_url: validatedData.input_image_url,
          input_video_url: validatedData.input_video_url,
          settings: validatedData.settings || {},
          status: 'pending',
          replicate_input: replicateInput,
        })
        .select()
        .single();
      
      generation = result.data;
      insertError = result.error;
      
      if (!insertError && generation) {
        break; // Success
      }
      
      // Check if error is retryable (connection/socket issues)
      const errorMsg = insertError?.message?.toLowerCase() || '';
      const isRetryable = errorMsg.includes('socket') || 
                          errorMsg.includes('fetch failed') || 
                          errorMsg.includes('timeout') ||
                          errorMsg.includes('connection');
      
      if (!isRetryable || attempt === MAX_INSERT_RETRIES) {
        break; // Non-retryable or max attempts reached
      }
      
      logger.warn(`DB insert attempt ${attempt} failed, retrying...`, insertError?.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    if (insertError || !generation) {
      logger.error('Failed to create generation:', insertError);
      return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
    }

    // Determine provider (default to replicate)
    const provider = model.provider || 'replicate';
    
    // Start prediction based on provider
    try {
      if (provider === 'fal') {
        // Fal.ai provider with fallback to Replicate
        const falClient = getFalClient();
        
        const falWebhookUrl = process.env.NODE_ENV === 'production' 
          ? `${process.env.NEXTAUTH_URL}/api/webhook/fal`
          : undefined;
        
        logger.info('[Fal.ai] Starting generation for model:', model.replicateModel);

        try {
          const { requestId } = await falClient.submitToQueue({
            model: model.replicateModel,
            input: replicateInput,
            webhook: falWebhookUrl,
          });

          logger.debug('Fal.ai generation started:', generation.id, requestId);

          await (supabase.from('generations') as any)
            .update({
              replicate_prediction_id: requestId,  // Store fal request_id in same field
              status: 'processing',
            })
            .eq('id', generation.id);

          return NextResponse.json({
            id: generation.id,
            prediction_id: requestId,
            status: 'processing',
            provider: 'fal',
          });
        } catch (falError: any) {
          // Check if we have a fallback model and error is retryable
          const hasFallback = model.fallbackModel;
          const isCreditsError = falClient.isInsufficientCreditsError(falError);
          const isRetryableError = isCreditsError || 
            /rate limit|timeout|unavailable|503|502|500/i.test(falError.message || '');
          
          if (hasFallback && isRetryableError) {
            logger.warn(`[Fal.ai -> Replicate Fallback] Fal.ai failed (${isCreditsError ? 'credits' : 'error'}), trying Replicate:`, falError.message);
            
            // Fallback to Replicate
            const replicateClient = getReplicateClient();
            const webhookUrl = process.env.NODE_ENV === 'production' 
              ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
              : undefined;
            
            try {
              const { prediction, tokenId } = await replicateClient.run({
                model: model.fallbackModel!,
                version: model.version,
                input: replicateInput,
                webhook: webhookUrl,
                webhook_events_filter: webhookUrl ? ['completed'] : undefined,
              });

              logger.info('[Fallback] Replicate generation started:', generation.id, prediction.id);

              await (supabase.from('generations') as any)
                .update({
                  replicate_prediction_id: prediction.id,
                  replicate_token_index: tokenId,
                  replicate_model: model.fallbackModel,  // Update to fallback model
                  status: 'processing',
                  settings: { 
                    ...generation.settings, 
                    fallback_provider: 'replicate', 
                    original_provider: 'fal',
                    original_error: falError.message 
                  },
                })
                .eq('id', generation.id);

              return NextResponse.json({
                id: generation.id,
                prediction_id: prediction.id,
                status: 'processing',
                provider: 'replicate',
                fallback: true,
                original_error: isCreditsError ? 'Fal.ai credits depleted' : falError.message,
              });
            } catch (replicateError: any) {
              logger.error('[Fallback] Replicate also failed:', replicateError.message);
              throw replicateError;  // Throw replicate error as final error
            }
          } else {
            throw falError;  // No fallback or non-retryable error
          }
        }
      } else if (provider === 'higgsfield') {
        // Higgsfield provider
        const higgsfieldClient = getHiggsfieldClient();
        
        const higgsfieldWebhookUrl = process.env.NODE_ENV === 'production' 
          ? `${process.env.NEXTAUTH_URL}/api/webhook/higgsfield`
          : undefined;
        
        logger.info('[Higgsfield] Starting generation for model:', model.replicateModel);

        const { requestId } = await higgsfieldClient.submit({
          model: model.replicateModel,
          input: replicateInput,
          webhook: higgsfieldWebhookUrl,
        });

        logger.debug('Higgsfield generation started:', generation.id, requestId);

        await (supabase.from('generations') as any)
          .update({
            replicate_prediction_id: requestId,  // Store higgsfield request_id in same field
            status: 'processing',
          })
          .eq('id', generation.id);

        return NextResponse.json({
          id: generation.id,
          prediction_id: requestId,
          status: 'processing',
          provider: 'higgsfield',
        });
      } else {
        // Replicate provider (default)
        const replicateClient = getReplicateClient();
        
        const webhookUrl = process.env.NODE_ENV === 'production' 
          ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
          : undefined;
        
        // Debug log for Veo duration issue
        if (model.replicateModel.includes('veo')) {
          logger.info('[Veo Debug] replicateInput:', JSON.stringify(replicateInput, null, 2));
        }

        // Models that support fal.ai fallback (when Replicate is primary)
        // Note: nano-banana-pro models now use Fal as primary, so they're handled above
        const FALLBACK_TO_FAL_MODELS: string[] = [];  // Add model IDs here if needed
        const supportsFalFallback = FALLBACK_TO_FAL_MODELS.includes(validatedData.model_id);

        try {
          const { prediction, tokenId } = await replicateClient.run({
            model: model.replicateModel,
            version: model.version,
            input: replicateInput,
            webhook: webhookUrl,
            webhook_events_filter: webhookUrl ? ['completed'] : undefined,
          });

          logger.debug('Generation started:', generation.id, prediction.id);

          await (supabase.from('generations') as any)
            .update({
              replicate_prediction_id: prediction.id,
              replicate_token_index: tokenId,
              status: 'processing',
            })
            .eq('id', generation.id);

          return NextResponse.json({
            id: generation.id,
            prediction_id: prediction.id,
            status: 'processing',
          });
        } catch (replicateError: any) {
          // Try fal.ai fallback for supported models
          if (supportsFalFallback) {
            logger.warn(`[Fallback] Replicate failed for ${validatedData.model_id}, trying fal.ai:`, replicateError.message);
            
            const falClient = getFalClient();
            const falWebhookUrl = process.env.NODE_ENV === 'production' 
              ? `${process.env.NEXTAUTH_URL}/api/webhook/fal`
              : undefined;
            
            // Map input params for fal.ai nano-banana-pro
            const falInput: Record<string, any> = {
              prompt: replicateInput.prompt,
              aspect_ratio: replicateInput.aspect_ratio === 'match_input_image' ? '1:1' : (replicateInput.aspect_ratio || '1:1'),
              resolution: replicateInput.resolution || '2K',
            };
            
            // Map image_input to image_url for references
            if (replicateInput.image_input) {
              // fal.ai expects image_url or image_urls for references
              if (Array.isArray(replicateInput.image_input)) {
                falInput.image_urls = replicateInput.image_input;
              } else {
                falInput.image_url = replicateInput.image_input;
              }
            }
            
            // For edit action, map image field
            if (replicateInput.image) {
              falInput.image_url = replicateInput.image;
            }
            
            try {
              const { requestId } = await falClient.submitToQueue({
                model: 'fal-ai/nano-banana-pro',
                input: falInput,
                webhook: falWebhookUrl,
              });

              logger.info('[Fallback] Fal.ai generation started:', generation.id, requestId);

              await (supabase.from('generations') as any)
                .update({
                  replicate_prediction_id: requestId,
                  replicate_model: 'fal-ai/nano-banana-pro',  // Update to fal model
                  status: 'processing',
                  settings: { ...generation.settings, fallback_provider: 'fal', original_error: replicateError.message },
                })
                .eq('id', generation.id);

              return NextResponse.json({
                id: generation.id,
                prediction_id: requestId,
                status: 'processing',
                provider: 'fal',
                fallback: true,
              });
            } catch (falError: any) {
              logger.error('[Fallback] Fal.ai also failed:', falError.message);
              // Fall through to original error handling
              throw replicateError;
            }
          } else {
            throw replicateError;
          }
        }
      }
    } catch (providerError: any) {
      logger.error(`${provider} error:`, providerError.message);
      
      const userFacingError = providerError.message || 'Ошибка при генерации';
      
      await (supabase.from('generations') as any)
        .update({ status: 'failed', error_message: userFacingError })
        .eq('id', generation.id);

      return NextResponse.json({ error: userFacingError }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('Create generation error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
