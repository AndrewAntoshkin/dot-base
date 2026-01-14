import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import archiver from 'archiver';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Increased for ZIP creation

// Helper: Download image and return buffer
async function downloadImage(url: string): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Failed to download image: ${url}, status: ${response.status}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract filename from URL or generate one
    const urlPath = new URL(url).pathname;
    const originalName = urlPath.split('/').pop() || `image-${Date.now()}.jpg`;
    
    return { buffer, filename: originalName };
  } catch (error) {
    logger.error(`Error downloading image: ${url}`, error);
    return null;
  }
}

// Helper: Create ZIP from image URLs
async function createZipFromImages(
  imageUrls: string[], 
  triggerWord: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const chunks: Buffer[] = [];
    
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level
    });
    
    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err) => reject(err));
    
    // Download and add each image to the archive
    let index = 0;
    for (const url of imageUrls) {
      const imageData = await downloadImage(url);
      if (imageData) {
        // Name files with trigger word for auto-captioning
        // e.g., "a_photo_of_BOTTY3_001.jpg"
        const ext = imageData.filename.split('.').pop() || 'jpg';
        const zipFilename = `a_photo_of_${triggerWord}_${String(index + 1).padStart(3, '0')}.${ext}`;
        archive.append(imageData.buffer, { name: zipFilename });
        index++;
      }
    }
    
    await archive.finalize();
  });
}

// GET /api/loras - Get user's LoRA models
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    
    // Get user's LoRAs with training images count
    const { data: loras, error } = await serviceClient
      .from('user_loras')
      .select(`
        *,
        training_images:lora_training_images(count)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching LoRAs:', error);
      return NextResponse.json({ error: 'Ошибка загрузки LoRA моделей' }, { status: 500 });
    }

    // Transform to include training_images_count
    const lorasWithCount = loras?.map((lora: any) => ({
      ...lora,
      training_images_count: lora.training_images?.[0]?.count || 0,
      training_images: undefined,
    }));

    return NextResponse.json({ loras: lorasWithCount || [] });
  } catch (error) {
    logger.error('GET /api/loras error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST /api/loras - Create new LoRA and start training
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, trigger_word, type, image_urls } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    if (!trigger_word || typeof trigger_word !== 'string' || trigger_word.trim().length === 0) {
      return NextResponse.json({ error: 'Trigger word обязательно' }, { status: 400 });
    }

    // Validate trigger_word format (alphanumeric and underscores only, 1-50 chars)
    const triggerWordRegex = /^[A-Z0-9_]{1,50}$/;
    const normalizedTriggerWord = trigger_word.trim().toUpperCase().replace(/\s+/g, '_');
    if (!triggerWordRegex.test(normalizedTriggerWord)) {
      return NextResponse.json({ 
        error: 'Trigger word должен содержать только буквы, цифры и подчеркивания (A-Z, 0-9, _), максимум 50 символов' 
      }, { status: 400 });
    }

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length < 5) {
      return NextResponse.json({ error: 'Минимум 5 изображений для обучения' }, { status: 400 });
    }

    if (image_urls.length > 20) {
      return NextResponse.json({ error: 'Максимум 20 изображений' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Create LoRA record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lora, error: createError } = await (serviceClient as any)
      .from('user_loras')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        trigger_word: normalizedTriggerWord,
        type: type || 'style',
        status: 'uploading',
      })
      .select()
      .single();

    if (createError || !lora) {
      logger.error('Error creating LoRA:', {
        error: createError,
        message: createError?.message,
        code: createError?.code,
        details: createError?.details,
        hint: createError?.hint,
      });
      const errorMessage = createError?.message || 'Ошибка создания LoRA';
      
      // Check for duplicate trigger_word error
      if (createError?.code === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        return NextResponse.json({ 
          error: `LoRA с trigger word "${normalizedTriggerWord}" уже существует. Используйте другой trigger word.`,
        }, { status: 400 });
      }
      
      // Return the actual error message for debugging
      return NextResponse.json({ 
        error: `Ошибка создания LoRA: ${errorMessage}`,
        details: createError?.details || createError?.hint || null,
      }, { status: 500 });
    }

    // Save training images
    const trainingImages = image_urls.map((url: string) => ({
      lora_id: lora.id,
      image_url: url,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: imagesError } = await (serviceClient as any)
      .from('lora_training_images')
      .insert(trainingImages);

    if (imagesError) {
      logger.error('Error saving training images:', imagesError);
      // Cleanup: delete the LoRA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any).from('user_loras').delete().eq('id', lora.id);
      return NextResponse.json({ error: 'Ошибка сохранения изображений' }, { status: 500 });
    }

    // Start training (if REPLICATE_API_TOKENS is set)
    const replicateTokens = process.env.REPLICATE_API_TOKENS;
    
    if (replicateTokens) {
      try {
        // Update status to training
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (serviceClient as any)
          .from('user_loras')
          .update({ status: 'training', training_started_at: new Date().toISOString() })
          .eq('id', lora.id);

        // Get the first token
        const token = replicateTokens.split(',')[0].trim();
        
        // Create ZIP URL from images (for Replicate training)
        // In production, you would create a ZIP file and upload it
        // For now, we'll use the ostris/flux-dev-lora-trainer which can accept URLs
        
        const webhookUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhook/replicate-training`;
        
        // Start training via Replicate
        // Create a valid model name from LoRA name (alphanumeric, dashes, underscores only)
        const modelName = lora.name
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50) || `lora-${lora.id.substring(0, 8)}`;
        
        const owner = process.env.REPLICATE_USERNAME || 'basecraft';
        const destination = `${owner}/${modelName}`;
        
        // First, create the model on Replicate (required before training)
        logger.info(`Creating model on Replicate: owner=${owner}, name=${modelName}`);
        
        // Create model payload
        // Hardware is required - use 'cpu' for destination models (cheapest option)
        // Actual training runs on H100, inference will use fast booting
        const createModelPayload: Record<string, string> = {
          owner: owner,
          name: modelName,
          description: `LoRA model: ${lora.name}`,
          visibility: 'private',
          hardware: 'cpu',
        };
        
        logger.info(`Create model payload: ${JSON.stringify(createModelPayload)}`);
        
        const createModelResponse = await fetch('https://api.replicate.com/v1/models', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createModelPayload),
        });
        
        const createModelText = await createModelResponse.text();
        logger.info(`Create model response: status=${createModelResponse.status}, body=${createModelText}`);
        
        if (!createModelResponse.ok) {
          // Model might already exist, that's OK - continue
          if (!createModelText.includes('already exists') && !createModelText.includes('A model with that name')) {
            logger.error('Failed to create model on Replicate:', createModelText);
            
            // Check if it's an authorization error
            if (createModelResponse.status === 401 || createModelResponse.status === 403) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (serviceClient as any)
                .from('user_loras')
                .update({ 
                  status: 'failed',
                  error_message: 'Ошибка авторизации Replicate API',
                })
                .eq('id', lora.id);
              return NextResponse.json({ error: 'Ошибка авторизации Replicate' }, { status: 500 });
            }
            
            // If we can't create model and it doesn't exist, fail
            if (createModelText.includes('Not Found') || createModelResponse.status === 404) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (serviceClient as any)
                .from('user_loras')
                .update({ 
                  status: 'failed',
                  error_message: 'Не удалось создать модель на Replicate',
                })
                .eq('id', lora.id);
              return NextResponse.json({ error: 'Не удалось создать модель на Replicate. Проверьте REPLICATE_USERNAME.' }, { status: 500 });
            }
          } else {
            logger.info(`Model already exists: ${destination}`);
          }
        } else {
          logger.info(`Successfully created model on Replicate: ${destination}`);
        }
        
        logger.info(`Starting training for destination: ${destination}`);
        
        // Create ZIP file from images
        logger.info(`Creating ZIP from ${image_urls.length} images...`);
        const zipBuffer = await createZipFromImages(image_urls, lora.trigger_word);
        logger.info(`ZIP created, size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Upload ZIP to Supabase Storage
        const zipFilename = `${user.id}/lora-${lora.id}-training.zip`;
        const { error: zipUploadError } = await serviceClient.storage
          .from('lora-training-images')
          .upload(zipFilename, zipBuffer, {
            contentType: 'application/zip',
            upsert: true,
          });
        
        if (zipUploadError) {
          logger.error('Failed to upload ZIP:', zipUploadError);
          throw new Error(`Failed to upload training ZIP: ${zipUploadError.message}`);
        }
        
        // Get signed URL for ZIP (valid 24 hours)
        const { data: zipSignedData, error: zipSignedError } = await serviceClient.storage
          .from('lora-training-images')
          .createSignedUrl(zipFilename, 60 * 60 * 24);
        
        if (zipSignedError || !zipSignedData?.signedUrl) {
          logger.error('Failed to get signed URL for ZIP:', zipSignedError);
          throw new Error('Failed to get signed URL for training ZIP');
        }
        
        logger.info(`ZIP uploaded and signed URL created: ${zipSignedData.signedUrl.substring(0, 100)}...`);
        
        // Use fast-flux-trainer for faster training
        const trainingResponse = await fetch('https://api.replicate.com/v1/models/replicate/fast-flux-trainer/versions/8b10794665aed907bb98a1a5324cd1d3a8bea0e9b31e65210967fb9c9e2e08ed/trainings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination: destination,
            input: {
              input_images: zipSignedData.signedUrl,
              trigger_word: lora.trigger_word,
              lora_type: type === 'character' ? 'subject' : 'style',
            },
            webhook: webhookUrl,
            webhook_events_filter: ['start', 'completed'],
          }),
        });

        if (trainingResponse.ok) {
          const trainingData = await trainingResponse.json();
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (serviceClient as any)
            .from('user_loras')
            .update({ 
              replicate_training_id: trainingData.id,
              status: 'training',
            })
            .eq('id', lora.id);
            
          logger.info(`LoRA training started: ${lora.id}, replicate_id: ${trainingData.id}, destination: ${destination}`);
        } else {
          const errorText = await trainingResponse.text();
          logger.error('Replicate training error:', errorText);
          
          let errorMessage = 'Ошибка запуска обучения';
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) {
              errorMessage = Array.isArray(errorJson.detail) 
                ? errorJson.detail.map((d: any) => d.msg || d).join(', ')
                : errorJson.detail;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // If not JSON, use text as is
            if (errorText.includes('webhook') && errorText.includes('HTTPS')) {
              errorMessage = 'Webhook требует HTTPS (локальная разработка)';
            } else if (errorText.includes('pattern') || errorText.includes('match')) {
              errorMessage = 'Неверный формат данных для обучения';
            } else if (errorText.includes('destination does not exist')) {
              errorMessage = 'Модель назначения не существует на Replicate';
            }
          }
          
          // If webhook URL is invalid (localhost), simulate completion for local dev
          if (errorText.includes('webhook') && errorText.includes('HTTPS')) {
            logger.info('Webhook requires HTTPS - simulating completion for local development');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (serviceClient as any)
              .from('user_loras')
              .update({ 
                status: 'completed',
                training_completed_at: new Date().toISOString(),
                lora_url: 'fofr/flux-pixar', // Test LoRA for local dev
              })
              .eq('id', lora.id);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (serviceClient as any)
              .from('user_loras')
              .update({ 
                status: 'failed',
                error_message: errorMessage,
              })
              .eq('id', lora.id);
          }
        }
      } catch (trainingError) {
        logger.error('Training API error:', trainingError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (serviceClient as any)
          .from('user_loras')
          .update({ 
            status: 'failed',
            error_message: 'Ошибка подключения к сервису обучения',
          })
          .eq('id', lora.id);
      }
    } else {
      // No Replicate tokens - simulate training for local development
      logger.info('No REPLICATE_API_TOKENS - simulating training');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any)
        .from('user_loras')
        .update({ status: 'training', training_started_at: new Date().toISOString() })
        .eq('id', lora.id);

      // Simulate completion after 10 seconds (for testing)
      setTimeout(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (serviceClient as any)
          .from('user_loras')
          .update({ 
            status: 'completed',
            training_completed_at: new Date().toISOString(),
            lora_url: 'fofr/flux-pixar', // Test LoRA
          })
          .eq('id', lora.id);
        logger.info(`Simulated training completed for LoRA: ${lora.id}`);
      }, 10000);
    }

    return NextResponse.json({ 
      lora: {
        ...lora,
        training_images_count: image_urls.length,
      },
      message: 'LoRA создана и обучение запущено',
    });
  } catch (error) {
    logger.error('POST /api/loras error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

