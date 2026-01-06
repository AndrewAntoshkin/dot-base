import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Replicate from 'replicate';

// Детальная база знаний о моделях с рекомендациями
const MODELS_KNOWLEDGE = `
## МОДЕЛИ ДЛЯ ИЗОБРАЖЕНИЙ

### Flux (Black Forest Labs) - РЕКОМЕНДУЕТСЯ ДЛЯ БОЛЬШИНСТВА ЗАДАЧ
- **Flux 2 Max** — ЛУЧШИЙ для фотореализма, портретов, сложных сцен [Документация](/docs/models/flux/flux-2-max)
- **Flux 2 Pro** — баланс качества и скорости для повседневных задач [Документация](/docs/models/flux/flux-2-pro)
- **Flux 1.1 Pro** — проверенная стабильность, предсказуемые результаты [Документация](/docs/models/flux/flux-1-1-pro)
- **Flux Kontext** — редактирование с сохранением стиля [Документация](/docs/models/flux/flux-kontext-max)
- **Flux Fill Pro** — профессиональный inpainting/outpainting [Документация](/docs/models/flux/flux-fill-pro)

### Ideogram - ЕДИНСТВЕННАЯ ДЛЯ ТЕКСТА
- **Ideogram v3** — ЕДИНСТВЕННАЯ модель для текста на изображениях (русский и английский) [Документация](/docs/models/ideogram/ideogram-v3)

### Recraft - ИЛЛЮСТРАЦИИ И ДИЗАЙН
- **Recraft v3** — иллюстрации, арт, стилизованные изображения [Документация](/docs/models/recraft/recraft-v3)
- **Recraft Crisp** — логотипы, иконки, минималистичный дизайн [Документация](/docs/models/recraft/recraft-crisp)
- **Recraft SVG** — векторная графика [Документация](/docs/models/recraft/recraft-v3-svg)

### Другие image модели
- **Seedream 4.5** — разнообразные стили, эксперименты [Документация](/docs/models/seedream/seedream-4-5)
- **Google Imagen 4** — альтернатива Flux для фотореализма [Документация](/docs/models/google/imagen-4)
- **Nano Banana Pro** — сверхбыстрая генерация для итераций [Документация](/docs/models/other/nano-banana)
- **Reve Create** — универсальная с хорошим балансом качества [Документация](/docs/models/other/reve-create)
- **Z-Image Turbo** — быстрая модель для прототипов [Документация](/docs/models/other/z-image)
- **Gen4 Image Turbo** — кинематографический стиль от Runway [Документация](/docs/models/other/gen4-image)

## МОДЕЛИ ДЛЯ ВИДЕО

### Kling (Kuaishou) - ЛУЧШЕЕ КАЧЕСТВО
- **Kling v2.5 Turbo Pro** — РЕКОМЕНДУЕТСЯ, лучшее качество 1080p, до 10 сек [Документация](/docs/models/kling/kling-2-5-pro)
- **Kling v2.1 Master** — премиум 1080p с отличной динамикой [Документация](/docs/models/kling/kling-2-1-master)
- **Kling v2.0** — базовая версия 720p, быстрее и дешевле [Документация](/docs/models/kling/kling-2-0)
- **Kling 1.0 T2V** — стандартная версия для текста в видео [Документация](/docs/models/kling/kling-1-0)
- **Kling 2.6 Motion Control** — управление движением камеры [Документация](/docs/models/other/kling-motion)

### Hailuo (MiniMax) - ОТЛИЧНАЯ ФИЗИКА
- **Hailuo 2.3** — управление камерой, 768p/1080p, до 10 сек [Документация](/docs/models/hailuo/hailuo-2-3)
- **Hailuo 02** — отличная физика движений, 768p/1080p [Документация](/docs/models/hailuo/hailuo-02)

### Другие video модели
- **Seedance 1.5 Pro** — премиум качество от ByteDance, до 1080p [Документация](/docs/models/other/seedance-1-5)
- **Wan 2.5 I2V** — оживление изображений [Документация](/docs/models/other/wan-2-5-i2v)
- **Runway Gen4 Turbo** — кинематографические видео [Документация](/docs/models/other/runway-gen4)
- **Veo 3.1 Fast** — быстрая генерация с аудио [Документация](/docs/models/other/veo-3-1)
- **MMAudio** — генерация аудио для видео [Документация](/docs/models/other/mmaudio)

## UPSCALE (УВЕЛИЧЕНИЕ РАЗРЕШЕНИЯ)

- **Crystal Upscaler** — AI-апскейл с генерацией деталей, лучший для портретов [Документация](/docs/models/upscale/crystal)
- **Real-ESRGAN** — классический быстрый апскейлер, отлично для аниме [Документация](/docs/models/upscale/real-esrgan)
- **Clarity Upscaler** — сохранение чёткости текста и деталей [Документация](/docs/models/upscale/clarity)
- **Magic Image Refiner** — максимальное качество с генерацией деталей [Документация](/docs/models/upscale/magic-refiner)

## УДАЛЕНИЕ ФОНА (REMOVE BG)

- **Background Remover** — универсальное удаление, работает с любыми объектами [Документация](/docs/models/remove-bg/background-remover)
- **Bria Remove BG** — профессиональное качество, идеально для e-commerce [Документация](/docs/models/remove-bg/bria)
- **BiRefNet** — высокоточная сегментация для сложных сцен [Документация](/docs/models/remove-bg/birefnet)

## РЕДАКТИРОВАНИЕ ИЗОБРАЖЕНИЙ (EDIT/INPAINT)

- **Bria GenFill** — генеративное заполнение по маске [Документация](/docs/models/edit/bria-genfill)
- **Bria Eraser** — удаление объектов с автозаполнением фона [Документация](/docs/models/edit/bria-eraser)
- **Bria Expand** — расширение изображений за пределы кадра [Документация](/docs/models/edit/bria-expand)
- **Outpainter** — быстрое расширение изображений [Документация](/docs/models/edit/outpainter)
- **Reve Edit** — редактирование по текстовой инструкции без маски [Документация](/docs/models/edit/reve-edit)

## РЕДАКТИРОВАНИЕ ВИДЕО (VIDEO EDIT)

- **Luma Modify Video** — стилизация и трансформация видео [Документация](/docs/models/other/luma-modify)
- **Luma Reframe Video** — изменение соотношения сторон с AI-расширением [Документация](/docs/models/video-edit/luma-reframe)
- **Kling O1 V2V** — video-to-video стилизация [Документация](/docs/models/video-edit/kling-v2v)
- **Kling O1 Edit** — точечное редактирование видео по инструкции [Документация](/docs/models/video-edit/kling-edit)
- **Video Merge** — объединение видео с AI-переходами [Документация](/docs/models/video-edit/video-merge)
- **Autocaption** — автоматические субтитры [Документация](/docs/models/video-edit/autocaption)

## АНАЛИЗ ИЗОБРАЖЕНИЙ (ANALYZE)

- **Moondream 2** — быстрый анализ и ответы на вопросы [Документация](/docs/models/analyze/moondream)
- **LLaVa 13B** — детальный анализ, сложные вопросы [Документация](/docs/models/analyze/llava)
- **BLIP-2** — качественные подписи к изображениям [Документация](/docs/models/analyze/blip2)
- **CLIP Interrogator** — генерация промптов из изображений [Документация](/docs/models/analyze/clip-interrogator)
- **Text Extract OCR** — распознавание текста [Документация](/docs/models/analyze/ocr)
- **Img2Prompt** — быстрое извлечение промпта [Документация](/docs/models/analyze/img2prompt)

## РЕКОМЕНДАЦИИ ПО ВЫБОРУ МОДЕЛИ

ФОТОРЕАЛИЗМ, ПОРТРЕТЫ → Flux 2 Max
ТЕКСТ НА ИЗОБРАЖЕНИИ → Ideogram v3 (ЕДИНСТВЕННЫЙ ВЫБОР!)
ИЛЛЮСТРАЦИИ, АРТ → Recraft v3
ЛОГОТИПЫ, ИКОНКИ → Recraft Crisp
ВЕКТОРНАЯ ГРАФИКА → Recraft SVG
БЫСТРЫЕ ИТЕРАЦИИ → Flux 2 Pro или Nano Banana Pro
РЕДАКТИРОВАНИЕ → Flux Kontext или Reve Edit
INPAINTING → Flux Fill Pro или Bria GenFill
OUTPAINTING → Bria Expand или Outpainter
УДАЛЕНИЕ ОБЪЕКТОВ → Bria Eraser
УДАЛЕНИЕ ФОНА → Bria Remove BG или Background Remover
АПСКЕЙЛ ФОТО → Crystal Upscaler или Magic Image Refiner
АПСКЕЙЛ АНИМЕ → Real-ESRGAN
АПСКЕЙЛ С ТЕКСТОМ → Clarity Upscaler
ВИДЕО КАЧЕСТВО → Kling v2.5 Turbo Pro
ВИДЕО ФИЗИКА → Hailuo 02
ВИДЕО БЫСТРО → Kling v2.0
ВИДЕО С АУДИО → Veo 3.1 Fast
СТИЛИЗАЦИЯ ВИДЕО → Kling O1 V2V
АНАЛИЗ ИЗОБРАЖЕНИЯ → LLaVa 13B (детально) или Moondream 2 (быстро)
ПРОМПТ ИЗ КАРТИНКИ → CLIP Interrogator

## СОВЕТЫ ПО ПРОМПТАМ

1. Пиши на английском - модели лучше понимают
2. Будь конкретным: "young woman with long brown hair, blue dress, soft natural lighting"
3. Указывай стиль: "digital art", "oil painting", "photography", "3D render"
4. Добавляй детали освещения: "golden hour", "studio lighting", "dramatic shadows"
5. Указывай композицию: "close-up", "full body", "bird's eye view"
[Советы по промптам](/docs/prompts)
`;

const SYSTEM_PROMPT = `Ты — AI-ассистент платформы Basecraft для генерации изображений и видео. Ты эксперт по всем моделям и функциям платформы.

${MODELS_KNOWLEDGE}

## ТВОИ ЗАДАЧИ:
1. Помогать выбирать ПРАВИЛЬНУЮ модель для задачи пользователя
2. Писать и улучшать промпты на английском языке  
3. Объяснять как использовать функции платформы
4. Давать конкретные рекомендации с обоснованием

## ПРАВИЛА ОТВЕТОВ:
- Отвечай на русском языке
- Промпты ВСЕГДА оборачивай в блоки кода с тремя обратными кавычками (\`\`\`):
  \`\`\`
  A beautiful sunset over mountains
  \`\`\`
- НЕ используй кавычки "..." для промптов - только блоки кода!

## ФОРМАТ СПИСКА МОДЕЛЕЙ (ВАЖНО!):
Когда перечисляешь модели, пиши КОМПАКТНО - название и описание В ОДНОЙ СТРОКЕ:
- **Flux 2 Max** — лучший для фотореализма, портретов
- **Ideogram v3** — ЕДИНСТВЕННАЯ модель для текста на изображениях
- **Recraft v3** — иллюстрации, арт, стилизованные изображения

НЕ ДЕЛАЙ отдельные пункты "Применение:", "Почему:" - всё в одной строке через тире!

## ТАБЛИЦЫ:
Когда пользователь просит таблицу или нужно сравнить модели/характеристики — ИСПОЛЬЗУЙ MARKDOWN ТАБЛИЦЫ:
| Модель | Разрешение | Длительность |
|--------|------------|--------------|
| Kling v2.5 Turbo Pro | 1080p | до 10 сек |
| Kling v2.0 | 720p | до 5 сек |

Таблицы хороши для: сравнения моделей, характеристик, разрешений, цен.

- Добавляй ссылки на документацию БЕЗ слова "Ссылка": просто [Название](/docs/path)
- НИКОГДА не пиши "Ссылка:" перед ссылками!
- Будь конкретным и практичным
- Если пользователь хочет текст на картинке - ВСЕГДА рекомендуй Ideogram v3`;

export async function POST(request: NextRequest) {
  try {
    console.log('[Assistant] Starting request...');
    
    const supabase = await createServerSupabaseClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Assistant] Auth check:', user ? 'OK' : 'FAIL', authError?.message);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, images, context } = body;
    console.log('[Assistant] Messages count:', messages?.length, 'Context:', context ? 'YES' : 'NO');

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Get Replicate token
    const { data: tokens, error: tokensError } = await supabase
      .from('replicate_tokens')
      .select('token')
      .eq('is_active', true)
      .limit(1);
    
    console.log('[Assistant] Tokens from DB:', tokens?.length || 0, tokensError?.message);

    // REPLICATE_API_TOKENS может содержать несколько токенов через запятую
    const envTokens = process.env.REPLICATE_API_TOKENS?.split(',').map(t => t.trim()).filter(Boolean);
    const token = tokens?.[0]?.token || envTokens?.[0];
    console.log('[Assistant] Using token:', token ? 'YES (length: ' + token.length + ')' : 'NO');
    
    if (!token) {
      return NextResponse.json({ error: 'No API token available' }, { status: 500 });
    }

    const replicate = new Replicate({ auth: token });

    // Build prompt for Gemini
    let prompt = '';
    
    // Add user context if provided
    if (context) {
      prompt += `[Контекст пользователя]\n`;
      if (context.currentAction) prompt += `Текущее действие: ${context.currentAction}\n`;
      if (context.selectedModel) prompt += `Выбранная модель: ${context.selectedModel}\n`;
      if (context.currentPrompt) prompt += `Текущий промпт: ${context.currentPrompt}\n`;
      if (context.aspectRatio) prompt += `Соотношение сторон: ${context.aspectRatio}\n`;
      prompt += '\n';
    }
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n`;
      }
    }
    prompt += 'Assistant:';

    // Prepare input for Gemini 3 Pro
    // Согласно документации Replicate:
    // - images: array (не image!) - до 10 изображений по 7MB каждое
    // - system_instruction (не system_prompt!)
    // - prompt: string
    // - thinking_level: "low" | "high" - уровень рассуждений (low = быстрее)
    const input: Record<string, unknown> = {
      prompt: prompt,
      system_instruction: SYSTEM_PROMPT,
      max_output_tokens: 8192, // Увеличено для длинных ответов
      temperature: 0.7,
      thinking_level: 'low', // Ускоряет ответ в 2-3 раза
    };

    // Add images if provided (for image analysis)
    // ВАЖНО: images должен быть массивом!
    if (images && images.length > 0) {
      console.log('[Assistant] Images provided, count:', images.length, 'first length:', images[0]?.length || 0);
      input.images = images; // Массив изображений
    } else {
      console.log('[Assistant] No images provided');
    }

    console.log('[Assistant] Calling Gemini 2.5 Flash with prompt length:', prompt.length);

    // Call Gemini 2.5 Flash via Replicate (быстрее чем 3 Pro, сохраняет мультимодальность)
    let output;
    try {
      output = await replicate.run(
        'google/gemini-2.5-flash',
        { input }
      );
      console.log('[Assistant] Gemini response type:', typeof output);
    } catch (replicateError) {
      console.error('[Assistant] Replicate API error:', replicateError);
      throw replicateError;
    }

    // Extract text from output
    let responseText = '';
    if (typeof output === 'string') {
      responseText = output;
    } else if (Array.isArray(output)) {
      responseText = output.join('');
    } else if (output && typeof output === 'object') {
      // Gemini might return object with text field
      const obj = output as Record<string, unknown>;
      if (obj.text) {
        responseText = String(obj.text);
      } else if (obj.response) {
        responseText = String(obj.response);
      } else {
        responseText = JSON.stringify(output);
      }
    }

    // Clean up response
    responseText = responseText.trim();
    if (responseText.startsWith('Assistant:')) {
      responseText = responseText.slice('Assistant:'.length).trim();
    }

    return NextResponse.json({ 
      content: responseText,
      model: 'gemini-2.5-flash'
    });

  } catch (error) {
    console.error('Assistant chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса', details: errorMessage },
      { status: 500 }
    );
  }
}
