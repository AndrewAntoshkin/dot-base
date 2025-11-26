import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import { z } from 'zod';

const createGenerationSchema = z.object({
  action: z.enum(['create', 'edit', 'upscale', 'remove_bg']),
  model_id: z.string(),
  prompt: z.string().optional(),
  input_image_url: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // ВРЕМЕННО: Создаем тестового пользователя для разработки
    let userId = 'test-user-id';
    
    // Проверяем есть ли тестовый пользователь
    let { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_username', 'testuser')
      .single();

    if (!userData) {
      // Создаем тестового пользователя
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          telegram_username: 'testuser',
          telegram_first_name: 'Test',
          telegram_last_name: 'User',
          is_active: true,
          credits: 1000,
        })
        .select()
        .single();
      
      userData = newUser;
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Failed to create test user' },
        { status: 500 }
      );
    }

    userId = userData.id;

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
      // Обновить статус на failed
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: replicateError.message,
        })
        .eq('id', generation.id);

      return NextResponse.json(
        { error: 'Failed to start generation', details: replicateError.message },
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

