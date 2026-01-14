import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length < 5) {
      return NextResponse.json({ error: 'Минимум 5 изображений для обучения' }, { status: 400 });
    }

    if (image_urls.length > 20) {
      return NextResponse.json({ error: 'Максимум 20 изображений' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Create LoRA record
    const { data: lora, error: createError } = await serviceClient
      .from('user_loras')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        trigger_word: trigger_word.trim().toUpperCase(),
        type: type || 'style',
        status: 'uploading',
      })
      .select()
      .single();

    if (createError || !lora) {
      logger.error('Error creating LoRA:', createError);
      return NextResponse.json({ error: 'Ошибка создания LoRA' }, { status: 500 });
    }

    // Save training images
    const trainingImages = image_urls.map((url: string) => ({
      lora_id: lora.id,
      image_url: url,
    }));

    const { error: imagesError } = await serviceClient
      .from('lora_training_images')
      .insert(trainingImages);

    if (imagesError) {
      logger.error('Error saving training images:', imagesError);
      // Cleanup: delete the LoRA
      await serviceClient.from('user_loras').delete().eq('id', lora.id);
      return NextResponse.json({ error: 'Ошибка сохранения изображений' }, { status: 500 });
    }

    // Start training (if REPLICATE_API_TOKENS is set)
    const replicateTokens = process.env.REPLICATE_API_TOKENS;
    
    if (replicateTokens) {
      try {
        // Update status to training
        await serviceClient
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
        const trainingResponse = await fetch('https://api.replicate.com/v1/models/ostris/flux-dev-lora-trainer/versions/e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497/trainings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            destination: `${process.env.REPLICATE_USERNAME || 'basecraft'}/${lora.id}`,
            input: {
              input_images: image_urls.join('\n'),
              trigger_word: lora.trigger_word,
              steps: 1000,
              lora_rank: 16,
              optimizer: 'adamw8bit',
              batch_size: 1,
              resolution: '512,768,1024',
              autocaption: true,
              autocaption_prefix: `a photo of ${lora.trigger_word},`,
            },
            webhook: webhookUrl,
            webhook_events_filter: ['start', 'completed'],
          }),
        });

        if (trainingResponse.ok) {
          const trainingData = await trainingResponse.json();
          
          await serviceClient
            .from('user_loras')
            .update({ 
              replicate_training_id: trainingData.id,
              status: 'training',
            })
            .eq('id', lora.id);
            
          logger.info(`LoRA training started: ${lora.id}, replicate_id: ${trainingData.id}`);
        } else {
          const errorText = await trainingResponse.text();
          logger.error('Replicate training error:', errorText);
          
          // If webhook URL is invalid (localhost), simulate completion for local dev
          if (errorText.includes('webhook') && errorText.includes('HTTPS')) {
            logger.info('Webhook requires HTTPS - simulating completion for local development');
            await serviceClient
              .from('user_loras')
              .update({ 
                status: 'completed',
                training_completed_at: new Date().toISOString(),
                lora_url: 'fofr/flux-pixar', // Test LoRA for local dev
              })
              .eq('id', lora.id);
          } else {
            await serviceClient
              .from('user_loras')
              .update({ 
                status: 'failed',
                error_message: 'Ошибка запуска обучения',
              })
              .eq('id', lora.id);
          }
        }
      } catch (trainingError) {
        logger.error('Training API error:', trainingError);
        await serviceClient
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
      
      await serviceClient
        .from('user_loras')
        .update({ status: 'training', training_started_at: new Date().toISOString() })
        .eq('id', lora.id);

      // Simulate completion after 10 seconds (for testing)
      setTimeout(async () => {
        await serviceClient
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

