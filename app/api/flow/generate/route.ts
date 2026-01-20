import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import Replicate from 'replicate';

interface GenerateRequest {
  nodeId: string;
  flowId: string;
  modelId: string;
  prompt: string;
  settings?: Record<string, any>;
  inputImageUrl?: string; // URL изображения от связанного нода (single I2V)
  startImageUrl?: string; // Первый кадр (Keyframe mode)
  endImageUrl?: string; // Последний кадр (Keyframe mode)
  referenceImages?: string[]; // Референсные изображения
  analyzeImages?: string[]; // Изображения для анализа (text node)
  analyzeVideos?: string[]; // Видео для анализа (text node)
  sourceText?: string; // Текст из связанного текстового нода (text-to-text)
}

// Text generation models that use Gemini
const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3-pro', 'gemini-3'];

// Wait for result synchronously (for localhost without webhook)
async function waitForResult(
  predictionId: string,
  replicateClient: ReplicateClient
): Promise<{ status: string; output?: any; error?: string }> {
  const maxAttempts = 60; // 5 minutes max (60 * 5s)
  const pollInterval = 5000; // 5 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const prediction = await replicateClient.getPrediction(predictionId);
      console.log(`[Flow Wait] Attempt ${attempt + 1}/${maxAttempts}, status: ${prediction.status}`);
      
      if (prediction.status === 'succeeded') {
        return { status: 'succeeded', output: prediction.output };
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        return { status: 'failed', error: prediction.error || 'Generation failed' };
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('[Flow Wait] Error polling:', error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  return { status: 'failed', error: 'Generation timed out (5 minutes)' };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequest = await request.json();
    const { nodeId, flowId, modelId, prompt, settings, inputImageUrl, startImageUrl, endImageUrl, referenceImages, analyzeImages, analyzeVideos, sourceText } = body;

    // Проверяем, что flow принадлежит пользователю (skip for temp flows)
    if (flowId !== 'temp') {
      const { data: flow, error: flowError } = await supabase
        .from('flows')
        .select('id')
        .eq('id', flowId)
        .eq('user_id', user.id)
        .single();

      if (flowError || !flow) {
        return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
      }
    }

    // Check if this is a text generation model
    const isTextModel = TEXT_MODELS.includes(modelId);

    if (isTextModel) {
      // Handle text generation with Gemini (with optional media analysis or text-to-text)
      return await handleTextGeneration(supabase, user.id, nodeId, prompt, analyzeImages, analyzeVideos, sourceText);
    }

    // Получаем модель для image/video
    const model = getModelById(modelId);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Используем переданное изображение от связанного нода
    const inputImage = inputImageUrl;

    // Обновляем статус узла
    if (flowId !== 'temp') {
      await supabase
        .from('flow_nodes')
        .update({ 
          status: 'pending',
          error_message: null,
        })
        .eq('id', nodeId);
    }

    // Подготавливаем параметры для генерации
    const input: Record<string, any> = {
      prompt,
    };

    // Map UI settings to API parameters
    if (settings) {
      // Aspect ratio mapping
      if (settings.aspectRatio) {
        input.aspect_ratio = settings.aspectRatio;
      }
      
      // Duration mapping for video models
      if (settings.duration) {
        input.duration = parseInt(settings.duration, 10);
      }
      
      // Quality/Resolution mapping (depends on model)
      if (settings.quality) {
        const quality = settings.quality.toUpperCase(); // Normalize to uppercase
        // Nano Banana uses 'resolution'
        if (modelId === 'nano-banana-pro') {
          input.resolution = quality;
        }
        // FLUX models use output_quality
        else if (modelId.includes('flux')) {
          const qualityMap: Record<string, number> = { '4K': 100, '2K': 80, '1K': 60 };
          input.output_quality = qualityMap[quality] || 80;
        }
        // Video models that use 'resolution' 
        else if (modelId.includes('seedance') || modelId.includes('hailuo') || modelId.includes('wan')) {
          // Map quality to resolution string
          const resMap: Record<string, string> = { '4K': '1080p', '2K': '720p', '1K': '480p' };
          input.resolution = resMap[quality] || '720p';
        }
      }
      
      // Copy other settings
      if (settings.seed) input.seed = settings.seed;
      if (settings.output_format) input.output_format = settings.output_format;
      if (settings.negative_prompt) input.negative_prompt = settings.negative_prompt;
    }

    // Keyframe mode: first and last frame
    if (startImageUrl && endImageUrl) {
      // Kling models use start_image/end_image
      if (modelId.includes('kling')) {
        input.start_image = startImageUrl;
        input.end_image = endImageUrl;
        console.log('[Flow Generate] Keyframe mode - start:', startImageUrl, 'end:', endImageUrl);
      }
    }
    // Single I2V mode: just one image
    // Check if model supports I2V (action includes 'i2v' or model ID includes 'i2v')
    else if (inputImage && (model.action.includes('i2v') || model.action === 'edit' || modelId.includes('i2v'))) {
      input.image = inputImage;
      console.log('[Flow Generate] I2V mode - using image:', inputImage);
    } else if (inputImage) {
      // Log warning if image is provided but model doesn't support I2V
      console.warn('[Flow Generate] Image provided but model does not support I2V:', modelId, 'action:', model.action);
    }

    // Добавляем референсные изображения если есть
    if (referenceImages && referenceImages.length > 0) {
      // Map model to correct reference field
      const refFieldMap: Record<string, string> = {
        'nano-banana-pro': 'image_input',
        'flux-2-max': 'input_images',
        'flux-2-pro': 'input_images',
        'ideogram-v3-turbo': 'style_reference_images',
      };
      const refField = refFieldMap[modelId] || 'image_input';
      input[refField] = referenceImages;
    }

    console.log('[Flow Generate] Model:', modelId, 'Input:', input);

    // Создаём генерацию в БД
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        action: model.action,
        model_id: modelId,
        model_name: model.name,
        replicate_model: model.replicateModel,
        prompt,
        status: 'pending',
        replicate_input: input,
      })
      .select()
      .single();

    if (genError) {
      console.error('Error creating generation:', genError);
      return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
    }

    // Связываем узел с генерацией
    if (flowId !== 'temp') {
      await supabase
        .from('flow_nodes')
        .update({ 
          generation_id: generation.id,
          status: 'processing',
        })
        .eq('id', nodeId);
    }

    // Запускаем генерацию через Replicate
    const replicateClient = new ReplicateClient();
    
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const isHttps = baseUrl.startsWith('https://');
      
      // Only use webhook if URL is HTTPS (required by Replicate)
      const runOptions: any = {
        model: model.replicateModel,
        input,
        version: model.version,
      };
      
      if (isHttps) {
        runOptions.webhook = `${baseUrl}/api/webhook/replicate`;
        runOptions.webhook_events_filter = ['completed'];
      }
      
      const { prediction } = await replicateClient.run(runOptions);

      // Обновляем генерацию с prediction ID (используем правильное имя колонки)
      await supabase
        .from('generations')
        .update({
          replicate_prediction_id: prediction.id,
          status: 'processing',
        })
        .eq('id', generation.id);
      
      // If no webhook (localhost), wait for result synchronously
      if (!isHttps && prediction.id) {
        console.log('[Flow] No webhook, waiting for result...');
        const result = await waitForResult(prediction.id, replicateClient);
        
        if (result.status === 'succeeded' && result.output) {
          let outputUrl = '';
          if (Array.isArray(result.output)) {
            outputUrl = result.output[0];
          } else if (typeof result.output === 'string') {
            outputUrl = result.output;
          }
          
          await supabase
            .from('generations')
            .update({
              status: 'succeeded',
              output_url: outputUrl,
              completed_at: new Date().toISOString(),
            })
            .eq('id', generation.id);
          
          return NextResponse.json({
            success: true,
            generationId: generation.id,
            predictionId: prediction.id,
            outputUrl,
            status: 'succeeded',
          });
        } else {
          await supabase
            .from('generations')
            .update({
              status: 'failed',
              error_message: result.error || 'Generation failed',
            })
            .eq('id', generation.id);
          
          return NextResponse.json({ 
            error: result.error || 'Generation failed',
            status: 'failed',
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        generationId: generation.id,
        predictionId: prediction.id,
      });

    } catch (replicateError) {
      console.error('Replicate error:', replicateError);
      
      // Обновляем статусы при ошибке
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'Generation failed' })
        .eq('id', generation.id);

      if (flowId !== 'temp') {
        await supabase
          .from('flow_nodes')
          .update({ 
            status: 'failed',
            error_message: 'Ошибка генерации',
          })
          .eq('id', nodeId);
      }

      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('Flow generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle text generation using Gemini (with optional media analysis)
async function handleTextGeneration(
  supabase: any,
  userId: string,
  nodeId: string,
  prompt: string,
  images?: string[],
  videos?: string[],
  sourceText?: string
) {
  try {
    // Get Replicate token
    const { data: tokens } = await supabase
      .from('replicate_tokens')
      .select('token')
      .eq('is_active', true)
      .limit(1);

    const envTokens = process.env.REPLICATE_API_TOKENS?.split(',').map(t => t.trim()).filter(Boolean);
    const token = tokens?.[0]?.token || envTokens?.[0];
    
    if (!token) {
      return NextResponse.json({ error: 'No API token available' }, { status: 500 });
    }

    const replicate = new Replicate({ auth: token });

    // Check if we have media to analyze or source text to process
    const hasImages = images && images.length > 0;
    const hasVideos = videos && videos.length > 0;
    const hasMedia = hasImages || hasVideos;
    const hasSourceText = !!sourceText;

    // Different system instruction based on input type
    let systemInstruction: string;
    if (hasMedia) {
      systemInstruction = 'Ты эксперт по анализу изображений и видео. Отвечай на русском языке. Будь КРАТКИМ: максимум 3-4 предложения или промпт в одну строку. Без вступлений типа "На изображении..." — сразу суть.';
    } else if (hasSourceText) {
      systemInstruction = 'Выполни инструкцию над предоставленным текстом. Если просят промпт — пиши только промпт на английском, без объяснений. Иначе отвечай кратко и по делу.';
    } else {
      systemInstruction = 'Отвечай кратко: 1-2 предложения максимум. Без вступлений и пояснений. Если просят промпт — пиши только промпт на английском.';
    }

    // Build the actual prompt
    let actualPrompt = prompt;
    if (hasSourceText) {
      // For text-to-text: combine source text with instruction
      actualPrompt = `Исходный текст:\n"${sourceText}"\n\nИнструкция: ${prompt}`;
      console.log('[Flow Text] Text-to-text mode - source text length:', sourceText.length);
    }

    // Build input for Gemini
    const input: Record<string, unknown> = {
      prompt: actualPrompt,
      system_instruction: systemInstruction,
      max_output_tokens: hasMedia ? 2048 : 1024, // More tokens for analysis
      temperature: 0.7,
      thinking_level: 'low',
    };

    // Add images if provided (Gemini supports up to 10 images)
    if (hasImages) {
      input.images = images.slice(0, 10);
      console.log('[Flow Text] Analyzing images:', images.length);
    }

    // Add videos if provided (Gemini supports up to 10 videos)
    if (hasVideos) {
      input.videos = videos.slice(0, 10);
      console.log('[Flow Text] Analyzing videos:', videos.length);
    }

    // Call Gemini 2.5 Flash for text generation
    const output = await replicate.run(
      'google/gemini-2.5-flash',
      { input }
    );

    // Extract text from output
    let responseText = '';
    if (typeof output === 'string') {
      responseText = output;
    } else if (Array.isArray(output)) {
      responseText = output.join('');
    } else if (output && typeof output === 'object') {
      const obj = output as Record<string, unknown>;
      if (obj.text) {
        responseText = String(obj.text);
      } else if (obj.response) {
        responseText = String(obj.response);
      } else {
        responseText = JSON.stringify(output);
      }
    }

    return NextResponse.json({
      success: true,
      output: responseText.trim(),
      outputType: 'text',
    });

  } catch (error: any) {
    console.error('Text generation error:', error);
    
    // Более понятные сообщения об ошибках
    let errorMessage = 'Ошибка генерации текста';
    if (error?.message) {
      if (error.message.includes('E001') || error.message.includes('Prediction failed')) {
        errorMessage = 'Сервис временно недоступен. Попробуйте через несколько секунд';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания. Попробуйте ещё раз';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'Слишком много запросов. Подождите немного';
      } else if (error.message.includes('invalid') || error.message.includes('validation')) {
        errorMessage = 'Некорректные параметры запроса';
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
