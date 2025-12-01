import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createGenerationSchema = z.object({
  action: z.enum([
    'create', 'edit', 'upscale', 'remove_bg',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale',
    'analyze_describe', 'analyze_ocr', 'analyze_prompt'
  ]),
  model_id: z.string(),
  prompt: z.string().nullish(), // nullable + optional для analyze моделей без prompt
  input_image_url: z.string().nullish(),
  input_video_url: z.string().nullish(),
  settings: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE GENERATION START ===');
    
    // Get current user from session
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
            } catch {
              // Ignore - can happen in Server Components
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    console.log('User auth check:', { hasUser: !!user, authError });
    
    if (!user) {
      console.error('No user found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('User ID:', userId);
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const validatedData = createGenerationSchema.parse(body);

    // Получить конфигурацию модели
    const model = getModelById(validatedData.model_id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Проверить, что action совпадает
    if (model.action !== validatedData.action) {
      return NextResponse.json(
        { error: 'Model does not support this action' },
        { status: 400 }
      );
    }

    // Подготовить input для Replicate
    const replicateInput: Record<string, any> = {
      ...validatedData.settings,
    };

    if (validatedData.prompt) {
      replicateInput.prompt = validatedData.prompt;
    }

    if (validatedData.input_image_url) {
      replicateInput.image = validatedData.input_image_url;
    }

    if (validatedData.input_video_url) {
      replicateInput.video = validatedData.input_video_url;
    }

    // Создать запись в БД
    const { data: generation, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
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

    if (insertError || !generation) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create generation' },
        { status: 500 }
      );
    }

    // Запустить генерацию на Replicate
    try {
      console.log('Starting generation:', {
        model: model.replicateModel,
        action: validatedData.action,
        inputKeys: Object.keys(replicateInput),
      });

      const replicateClient = getReplicateClient();
      
      // Webhook только для production (требует HTTPS)
      const webhookUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
        : undefined;
      
      const { prediction, tokenId } = await replicateClient.run({
        model: model.replicateModel,
        version: model.version,
        input: replicateInput,
        webhook: webhookUrl,
        webhook_events_filter: webhookUrl ? ['completed'] : undefined,
      });

      console.log('Generation started:', {
        generationId: generation.id,
        predictionId: prediction.id,
        tokenId,
      });

      // Обновить запись с prediction ID
      await supabase
        .from('generations')
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
      console.error('=== GENERATION ERROR ===');
      console.error('Error message:', replicateError.message);
      console.error('Error name:', replicateError.name);
      console.error('Error stack:', replicateError.stack);
      console.error('Original error:', (replicateError as any).originalError?.message);
      
      // Сообщение об ошибке уже очищено в ReplicateClient
      const userFacingError = replicateError.message || 'Ошибка при генерации';
      
      // Обновить статус на failed
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: userFacingError,
        })
        .eq('id', generation.id);

      return NextResponse.json(
        { 
          error: userFacingError,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('=== CREATE GENERATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: error.message || 'Internal server error', stack: error.stack },
      { status: 500 }
    );
  }
}

