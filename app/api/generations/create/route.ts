import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getFalClient } from '@/lib/fal/client';
import { getHiggsfieldClient } from '@/lib/higgsfield/client';
import { getGoogleAIClient } from '@/lib/google/client';
import { getModelById } from '@/lib/models-config';
import { cookies } from 'next/headers';
import { z } from 'zod';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';
import { writeWarningLog } from '@/lib/api-log';

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

const MAX_CONCURRENT_GENERATIONS = 5;

async function postHandler(request: NextRequest) {
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

    // Auto-cleanup stale image generations (>5 min in pending/processing)
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const imageActions = ['create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand'];
    await (supabase.from('generations') as any)
      .update({ status: 'failed', error_message: 'Generation timed out', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .in('action', imageActions)
      .lt('created_at', staleThreshold);

    // Check concurrent limit
    const { count: activeCount } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    if (activeCount !== null && activeCount >= MAX_CONCURRENT_GENERATIONS) {
      return NextResponse.json(
        {
          error: `Достигнут лимит одновременных генераций (${MAX_CONCURRENT_GENERATIONS}). Дождитесь завершения текущих генераций.`,
          code: 'CONCURRENT_LIMIT_EXCEEDED',
          activeCount,
          limit: MAX_CONCURRENT_GENERATIONS,
        },
        { status: 429 }
      );
    }

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
        return NextResponse.json({ error: 'An image is required' }, { status: 400 });
      }
    }

    // Handle inpaint
    if (validatedData.action === 'inpaint') {
      if (!replicateInput.image) {
        return NextResponse.json({ error: 'An image is required' }, { status: 400 });
      }
      if (!replicateInput.mask) {
        return NextResponse.json({ error: 'A mask is required' }, { status: 400 });
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
        
        const falWebhookUrl = process.env.NEXTAUTH_URL
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
            writeWarningLog({
              path: '/api/generations/create',
              provider: 'fal',
              model_name: generation.model_name,
              generation_id: generation.id,
              user_id: generation.user_id,
              message: `Fallback: Fal.ai -> Replicate. Reason: ${isCreditsError ? 'credits depleted' : falError.message}`,
              details: { original_provider: 'fal', fallback_provider: 'replicate', error: falError.message },
            });

            // Fallback to Replicate
            const replicateClient = getReplicateClient();
            const webhookUrl = process.env.NEXTAUTH_URL
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
        
        const higgsfieldWebhookUrl = process.env.NEXTAUTH_URL
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
      } else if (provider === 'google') {
        // Google Generative AI provider — 3-level fallback: Google → Replicate → FAL
        // FAL_ONLY=1 skips Google and Replicate, goes straight to FAL (for testing)
        const falOnly = process.env.FAL_ONLY === '1' || process.env.FAL_ONLY === 'true';
        logger.info(`[Google AI] Starting generation for model: ${model.replicateModel}${falOnly ? ' (FAL_ONLY mode)' : ''}`);

        const errors: { provider: string; error: string }[] = [];

        // --- Level 1: Google Direct API (synchronous) ---
        if (!falOnly) try {
          const googleClient = getGoogleAIClient();

          const result = await googleClient.generate({
            model: model.name,
            input: replicateInput,
          });

          if (result.success && result.imageBase64) {
            // Upload base64 image to Supabase Storage
            const buffer = Buffer.from(result.imageBase64, 'base64');
            const extension = result.mimeType?.includes('png') ? 'png' : 'jpg';
            const fileName = `${generation.id}.${extension}`;
            const filePath = `generations/${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('generations')
              .upload(filePath, buffer, {
                contentType: result.mimeType || 'image/png',
                upsert: true,
              });

            if (uploadError) {
              logger.error('[Google AI] Storage upload error:', uploadError);
              throw new Error('Failed to save image');
            }

            const { data: urlData } = supabase.storage
              .from('generations')
              .getPublicUrl(filePath);

            const outputUrl = process.env.STORAGE_PROXY_URL
              ? urlData.publicUrl.replace(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.STORAGE_PROXY_URL)
              : urlData.publicUrl;

            await (supabase.from('generations') as any)
              .update({
                replicate_prediction_id: `google-${Date.now()}`,
                status: 'completed',
                output_urls: [outputUrl],
                completed_at: new Date().toISOString(),
              })
              .eq('id', generation.id);

            logger.info(`[Google AI] Generation completed in ${result.timeMs}ms:`, generation.id);

            return NextResponse.json({
              id: generation.id,
              status: 'completed',
              output_urls: [outputUrl],
              provider: 'google',
              time_ms: result.timeMs,
            });
          }

          // No image returned — treat as error
          throw new Error(result.error || 'Google AI generation failed');
        } catch (googleError: any) {
          errors.push({ provider: 'google', error: googleError.message });
          logger.warn('[Google AI] Failed:', googleError.message);
        }

        // --- Level 2: Replicate fallback ---
        if (model.fallbackModel && !falOnly) {
          writeWarningLog({
            path: '/api/generations/create',
            provider: 'google',
            model_name: generation.model_name,
            generation_id: generation.id,
            user_id: generation.user_id,
            message: `Fallback: Google -> Replicate. Reason: ${errors[0].error}`,
            details: { original_provider: 'google', fallback_provider: 'replicate', error: errors[0].error },
          });

          try {
            const replicateClient = getReplicateClient();
            const webhookUrl = process.env.NEXTAUTH_URL
              ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
              : undefined;

            const { prediction, tokenId } = await replicateClient.run({
              model: model.fallbackModel,
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
                replicate_model: model.fallbackModel,
                status: 'processing',
                settings: {
                  ...generation.settings,
                  fallback_provider: 'replicate',
                  original_provider: 'google',
                  original_error: errors[0].error,
                },
              })
              .eq('id', generation.id);

            return NextResponse.json({
              id: generation.id,
              prediction_id: prediction.id,
              status: 'processing',
              provider: 'replicate',
              fallback: true,
              original_error: errors[0].error,
            });
          } catch (replicateError: any) {
            errors.push({ provider: 'replicate', error: replicateError.message });
            logger.warn('[Replicate] Also failed:', replicateError.message);
          }
        }

        // --- Level 3: FAL.ai fallback ---
        if (model.falFallbackModel) {
          const lastErr = errors[errors.length - 1]?.error || 'FAL_ONLY mode';
          writeWarningLog({
            path: '/api/generations/create',
            provider: falOnly ? 'google' : 'replicate',
            model_name: generation.model_name,
            generation_id: generation.id,
            user_id: generation.user_id,
            message: falOnly ? `FAL_ONLY: direct FAL.ai` : `Fallback: Replicate -> FAL. Reason: ${lastErr}`,
            details: {
              original_provider: 'google',
              fallback_provider: 'fal',
              fal_only: falOnly,
              errors: errors.map(e => `${e.provider}: ${e.error}`),
            },
          });

          try {
            const falClient = getFalClient();
            const falWebhookUrl = process.env.NEXTAUTH_URL
              ? `${process.env.NEXTAUTH_URL}/api/webhook/fal`
              : undefined;

            // Build clean FAL input — only fields that FAL Gemini API accepts
            const falInput: Record<string, any> = {
              prompt: replicateInput.prompt,
            };
            // image_input → image_urls
            if (replicateInput.image_input) {
              falInput.image_urls = Array.isArray(replicateInput.image_input) ? replicateInput.image_input : [replicateInput.image_input];
            }
            if (replicateInput.aspect_ratio) {
              falInput.aspect_ratio = replicateInput.aspect_ratio === 'match_input_image' ? 'auto' : replicateInput.aspect_ratio;
            }
            if (replicateInput.resolution) falInput.resolution = replicateInput.resolution;
            if (replicateInput.output_format) falInput.output_format = replicateInput.output_format === 'jpg' ? 'jpeg' : replicateInput.output_format;
            if (replicateInput.seed) falInput.seed = replicateInput.seed;

            logger.info('[Fal.ai] Webhook URL:', falWebhookUrl || 'NONE');

            const { requestId } = await falClient.submitToQueue({
              model: model.falFallbackModel,
              input: falInput,
              webhook: falWebhookUrl,
            });

            logger.info('[Fallback] FAL.ai generation started:', generation.id, requestId);

            await (supabase.from('generations') as any)
              .update({
                replicate_prediction_id: requestId,
                replicate_model: model.falFallbackModel,
                status: 'processing',
                settings: {
                  ...generation.settings,
                  fallback_provider: 'fal',
                  original_provider: 'google',
                  errors: errors.map(e => `${e.provider}: ${e.error}`),
                },
              })
              .eq('id', generation.id);

            return NextResponse.json({
              id: generation.id,
              prediction_id: requestId,
              status: 'processing',
              provider: 'fal',
              fallback: true,
              original_error: errors.map(e => `${e.provider}: ${e.error}`).join(' | '),
            });
          } catch (falError: any) {
            errors.push({ provider: 'fal', error: falError.message });
            logger.error('[Fallback] FAL.ai also failed:', falError.message);
          }
        }

        // All levels exhausted
        const lastError = errors[errors.length - 1];
        throw new Error(lastError?.error || 'All providers failed');
      } else {
        // Replicate provider (default)
        const replicateClient = getReplicateClient();
        
        const webhookUrl = process.env.NEXTAUTH_URL
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
            writeWarningLog({
              path: '/api/generations/create',
              provider: 'replicate',
              model_name: generation.model_name,
              generation_id: generation.id,
              user_id: generation.user_id,
              message: `Fallback: Replicate -> Fal.ai. Reason: ${replicateError.message}`,
              details: { original_provider: 'replicate', fallback_provider: 'fal', error: replicateError.message },
            });

            const falClient = getFalClient();
            const falWebhookUrl = process.env.NEXTAUTH_URL
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
      const userFacingError = providerError.message || 'Generation failed';
      
      await (supabase.from('generations') as any)
        .update({ status: 'failed', error_message: userFacingError })
        .eq('id', generation.id);

      return NextResponse.json({ error: userFacingError }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(postHandler, { provider: 'replicate' });
