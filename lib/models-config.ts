/**
 * ПОЛНАЯ конфигурация моделей с всеми параметрами
 * На основе официальной документации Replicate API
 * Обновлено: 2025-11-26
 */

export type ActionType =
  | 'create' | 'edit' | 'upscale' | 'remove_bg' | 'inpaint' | 'expand'  // Image
  | 'video_create' | 'video_i2v' | 'video_edit' | 'video_upscale'  // Video
  | 'analyze_describe' | 'analyze_ocr' | 'analyze_prompt';  // Analyze

export type SettingType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'slider' 
  | 'select' 
  | 'checkbox' 
  | 'file'
  | 'file_array'
  | 'directional_expand';

export interface ModelSetting {
  name: string;
  label: string;
  type: SettingType;
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  placeholder?: string;
  maxFiles?: number;
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  replicateModel: string;
  version?: string;
  action: ActionType;
  description?: string;
  settings: ModelSetting[];
  runs?: string;
  price?: string;
}

/**
 * СОЗДАТЬ ИЗОБРАЖЕНИЕ - 14 моделей
 */
export const CREATE_MODELS: Model[] = [
  // 1. FLUX 2 Max - Максимальное качество и консистентность
  {
    id: 'flux-2-max',
    name: 'flux-2-max',
    displayName: 'FLUX 2 Max',
    replicateModel: 'black-forest-labs/flux-2-max',
    action: 'create',
    runs: '2.8K runs',
    price: 'Priced by multiple properties',
    description: 'Максимальное качество от Black Forest Labs. Лучшее следование промпту, до 8 референсов.',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. FLUX 2 Max лучше понимает сложные промпты.',
      },
      {
        name: 'input_images',
        label: 'Референсные изображения',
        type: 'file_array',
        description: 'До 8 референсных изображений для сохранения персонажей, продуктов и стилей.',
        maxFiles: 8,
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '1:1',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выберите пропорции: 1:1 для аватаров, 16:9 для баннеров, 9:16 для сторис.',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1 MP',
        options: [
          { value: '0.5 MP', label: '0.5 MP' },
          { value: '1 MP', label: '1 MP' },
          { value: '2 MP', label: '2 MP' },
          { value: '4 MP', label: '4 MP' },
          { value: 'match_input_image', label: 'Как входное' },
        ],
        description: 'Выходное разрешение в мегапикселях. Не используется при aspect_ratio=custom.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Точная ширина в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Точная высота в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Запомните это число, чтобы получить точно такой же результат снова.',
      },
      {
        name: 'output_format',
        label: 'Формат выходного файла',
        type: 'select',
        default: 'webp',
        options: [
          { value: 'webp', label: 'WebP' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
        description: 'WebP — лёгкий для веба, PNG — для прозрачности, JPG — универсальный.',
      },
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 0,
        max: 100,
        description: 'Чем выше — тем чётче картинка, но больше размер файла.',
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 5,
        description: 'Фильтр контента. Увеличьте, если генерация блокируется.',
      },
    ],
  },

  // 2. FLUX 2 Pro
  {
    id: 'flux-2-pro',
    name: 'flux-2-pro',
    displayName: 'FLUX 2 Pro',
    replicateModel: 'black-forest-labs/flux-2-pro',
    action: 'create',
    runs: '12.4K runs',
    price: 'Priced by multiple properties',
    description: 'Генерация и редактирование с поддержкой до 8 референсных изображений',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. Опишите, что хотите создать.',
      },
      {
        name: 'input_images',
        label: 'Референсные изображения',
        type: 'file_array',
        description: 'До 8 референсных изображений для img2img (jpeg, png, gif, webp).',
        maxFiles: 8,
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '1:1',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выберите пропорции: 1:1 для аватаров, 16:9 для баннеров, 9:16 для сторис.',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1 MP',
        options: [
          { value: '0.5 MP', label: '0.5 MP' },
          { value: '1 MP', label: '1 MP' },
          { value: '2 MP', label: '2 MP' },
          { value: '4 MP', label: '4 MP' },
          { value: 'match_input_image', label: 'Как входное' },
        ],
        description: 'Выходное разрешение в мегапикселях. Не используется при aspect_ratio=custom.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Точная ширина в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Точная высота в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Запомните это число, чтобы получить точно такой же результат снова.',
      },
      {
        name: 'output_format',
        label: 'Формат выходного файла',
        type: 'select',
        default: 'webp',
        options: [
          { value: 'webp', label: 'WebP' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
        description: 'WebP — лёгкий для веба, PNG — для прозрачности, JPG — универсальный.',
      },
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 0,
        max: 100,
        description: 'Чем выше — тем чётче картинка, но больше размер файла.',
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 5,
        description: 'Фильтр контента. Увеличьте, если генерация блокируется.',
      },
    ],
  },

  // 2. SeeDream 4
  {
    id: 'seedream-4',
    name: 'seedream-4',
    displayName: 'SeeDream 4',
    replicateModel: 'bytedance/seedream-4',
    action: 'create',
    runs: '14.2M runs',
    price: '$0.03 per image',
    description: 'ByteDance - генерация и редактирование до 4K разрешения',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. Опишите, что хотите создать.',
      },
      {
        name: 'image_input',
        label: 'Референсные изображения',
        type: 'file_array',
        description: '1-10 референсных изображений для img2img.',
        maxFiles: 10,
      },
      {
        name: 'size',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '1K', label: '1K (1024px)' },
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выходное разрешение. Выше = лучше качество, но медленнее.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная ширина в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная высота в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
        description: 'Соотношение сторон. Не используется при size=custom.',
      },
      {
        name: 'max_images',
        label: 'Макс. изображений',
        type: 'slider',
        default: 1,
        min: 1,
        max: 15,
        description: 'Максимальное количество изображений при sequential_image_generation=auto.',
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
        description: 'AI улучшит ваш промпт для более качественного результата.',
      },
      {
        name: 'sequential_image_generation',
        label: 'Групповая генерация',
        type: 'select',
        default: 'disabled',
        options: [
          { value: 'disabled', label: 'Выключено' },
          { value: 'auto', label: 'Авто (серии, вариации)' },
        ],
        description: 'Включите для генерации нескольких связанных изображений.',
      },
    ],
  },

  // 3. SeeDream 4.5
  {
    id: 'seedream-4.5',
    name: 'seedream-4.5',
    displayName: 'SeeDream 4.5',
    replicateModel: 'bytedance/seedream-4.5',
    action: 'create',
    runs: '43.1K runs',
    price: '$0.03 per image',
    description: 'ByteDance - улучшенная модель с лучшим пониманием пространства и знаний',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. Опишите, что хотите создать.',
      },
      {
        name: 'image_input',
        label: 'Референсные изображения',
        type: 'file_array',
        description: '1-14 референсных изображений для img2img.',
        maxFiles: 14,
      },
      {
        name: 'size',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выходное разрешение. Выше = лучше качество, но медленнее.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная ширина в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная высота в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
        description: 'Соотношение сторон. Не используется при size=custom.',
      },
      {
        name: 'sequential_image_generation',
        label: 'Групповая генерация',
        type: 'select',
        default: 'disabled',
        options: [
          { value: 'disabled', label: 'Выключено' },
          { value: 'auto', label: 'Авто (серии, вариации)' },
        ],
        description: 'Включите для генерации нескольких связанных изображений.',
      },
      {
        name: 'max_images',
        label: 'Макс. изображений',
        type: 'slider',
        default: 1,
        min: 1,
        max: 15,
        description: 'Максимальное количество изображений при sequential_image_generation=auto. Общее количество (входные + сгенерированные) не может превышать 15.',
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
        description: 'AI улучшит ваш промпт для более качественного результата (может увеличить время генерации).',
      },
    ],
  },

  // 3. Nano Banana Pro (Google Gemini 3 Pro)
  {
    id: 'nano-banana-pro',
    name: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    replicateModel: 'google/nano-banana-pro',
    action: 'create',
    runs: '4.8M runs',
    price: 'Priced by multiple properties',
    description: 'Google Gemini 3 Pro - генерация с текстом и до 14 референсов. ⏱️ 1-2 мин',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Детальное описание. Поддерживает текст на картинке и multilingual.',
      },
      {
        name: 'image_input',
        label: 'Референсные изображения',
        type: 'file_array',
        description: 'До 14 изображений для трансформации или объединения',
        maxFiles: 14,
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '1K', label: '1K (быстрее)' },
          { value: '2K', label: '2K (рекомендуется)' },
          { value: '4K', label: '4K (медленнее)' },
        ],
        description: 'Выше разрешение = дольше генерация',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1 (квадрат)' },
          { value: '16:9', label: '16:9 (горизонталь)' },
          { value: '9:16', label: '9:16 (вертикаль)' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '3:2', label: '3:2' },
          { value: '2:3', label: '2:3' },
          { value: '4:5', label: '4:5' },
          { value: '5:4', label: '5:4' },
          { value: '21:9', label: '21:9 (ультраширокий)' },
        ],
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'jpg',
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'safety_filter_level',
        label: 'Уровень фильтрации',
        type: 'select',
        default: 'block_only_high',
        options: [
          { value: 'block_only_high', label: 'Минимальный (рекомендуется)' },
          { value: 'block_medium_and_above', label: 'Средний' },
          { value: 'block_low_and_above', label: 'Строгий' },
        ],
        description: 'При ошибках safety попробуйте Минимальный уровень',
      },
    ],
  },

  // 4. Ideogram V3 Turbo
  {
    id: 'ideogram-v3-turbo',
    name: 'ideogram-v3-turbo',
    displayName: 'Ideogram V3 Turbo',
    replicateModel: 'ideogram-ai/ideogram-v3-turbo',
    action: 'create',
    runs: '4.6M runs',
    price: '$0.03 per image',
    description: 'Быстрая генерация с поддержкой стилей и inpainting',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        description: 'Описание элементов, которые нужно избежать',
      },
      {
        name: 'image',
        label: 'Изображение для inpainting',
        type: 'file',
        description: 'Требуется маска',
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        description: 'Чёрные пиксели = inpaint, белые = сохранить',
      },
      {
        name: 'style_reference_images',
        label: 'Референсы стиля',
        type: 'file_array',
        description: 'Изображения для переноса стиля',
        maxFiles: 5,
      },
      {
        name: 'character_reference_images',
        label: 'Референсы персонажа',
        type: 'file_array',
        description: 'Для сохранения консистентности персонажа',
        maxFiles: 3,
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '1:1',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '3:2', label: '3:2' },
          { value: '2:3', label: '2:3' },
        ],
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: 'None',
        options: [
          { value: 'None', label: 'По соотношению сторон' },
          { value: '1024x1024', label: '1024×1024' },
          { value: '1280x720', label: '1280×720' },
          { value: '720x1280', label: '720×1280' },
          { value: '1536x1024', label: '1536×1024' },
          { value: '1024x1536', label: '1024×1536' },
        ],
      },
      {
        name: 'style_type',
        label: 'Тип стиля',
        type: 'select',
        default: 'AUTO',
        options: [
          { value: 'AUTO', label: 'Авто' },
          { value: 'GENERAL', label: 'Общий' },
          { value: 'REALISTIC', label: 'Реалистичный' },
          { value: 'DESIGN', label: 'Дизайн' },
          { value: 'FICTION', label: 'Фантастика' },
        ],
      },
      {
        name: 'style_preset',
        label: 'Пресет стиля',
        type: 'select',
        default: 'None',
        options: [
          { value: 'None', label: 'Нет' },
          { value: 'Cinematic', label: 'Кинематографичный' },
          { value: 'Vibrant', label: 'Яркий' },
          { value: 'Natural', label: 'Натуральный' },
          { value: 'Muted', label: 'Приглушенный' },
        ],
      },
      {
        name: 'magic_prompt_option',
        label: 'Magic Prompt',
        type: 'select',
        default: 'Auto',
        options: [
          { value: 'Auto', label: 'Авто' },
          { value: 'On', label: 'Включено' },
          { value: 'Off', label: 'Выключено' },
        ],
        description: 'Оптимизация промпта',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        max: 2147483647,
      },
    ],
  },

  // 5. FLUX 1.1 Pro
  {
    id: 'flux-1.1-pro',
    name: 'flux-1.1-pro',
    displayName: 'FLUX 1.1 Pro',
    replicateModel: 'black-forest-labs/flux-1.1-pro',
    action: 'create',
    runs: '64.4M runs',
    price: '$0.04 per image',
    description: 'Быстрая генерация с отличным качеством',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации изображения.',
      },
      {
        name: 'image_prompt',
        label: 'Референсное изображение',
        type: 'file',
        description: 'Загрузите фото для переноса стиля или композиции в новое изображение.',
      },
      {
        name: 'image_prompt_strength',
        label: 'Сила референса',
        type: 'slider',
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Баланс между промптом (0) и референсом (1)',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '1:1',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выберите пропорции: 1:1 для аватаров, 16:9 для баннеров, 9:16 для сторис.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        min: 256,
        max: 1440,
        step: 32,
        description: 'Ширина изображения. Только при aspect_ratio=custom. Кратна 32.',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        min: 256,
        max: 1440,
        step: 32,
        description: 'Высота изображения. Только при aspect_ratio=custom. Кратна 32.',
      },
      {
        name: 'raw',
        label: 'Режим RAW',
        type: 'checkbox',
        default: false,
        description: 'Менее обработанные, более натуральные изображения',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Запомните это число, чтобы получить точно такой же результат снова.',
      },
      {
        name: 'output_format',
        label: 'Формат выходного файла',
        type: 'select',
        default: 'webp',
        options: [
          { value: 'webp', label: 'WebP' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
        description: 'WebP — лёгкий для веба, PNG — для прозрачности, JPG — универсальный.',
      },
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 0,
        max: 100,
        description: 'Качество сохранения (0-100). 100 = лучшее. Не влияет на PNG.',
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 6,
        description: 'Фильтр контента. Увеличьте, если генерация блокируется.',
      },
      {
        name: 'prompt_upsampling',
        label: 'Улучшение промпта',
        type: 'checkbox',
        default: false,
        description: 'AI дополнит ваш промпт деталями для более интересного результата.',
      },
    ],
  },

  // 6. Imagen 4 Ultra
  {
    id: 'imagen-4-ultra',
    name: 'imagen-4-ultra',
    displayName: 'Imagen 4 Ultra',
    replicateModel: 'google/imagen-4-ultra',
    action: 'create',
    runs: '1.1M runs',
    price: '$0.06 per image',
    description: 'Google - максимальное качество',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. Опишите, что хотите создать.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        description: 'Элементы для исключения из генерации.',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '1:1',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
        description: 'Выберите пропорции: 1:1 для аватаров, 16:9 для баннеров, 9:16 для сторис.',
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
        description: 'AI улучшит промпт для более качественного результата.',
      },
      {
        name: 'output_format',
        label: 'Формат выходного файла',
        type: 'select',
        default: 'jpg',
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
        description: 'PNG — для прозрачности, JPG — универсальный.',
      },
      {
        name: 'safety_filter_level',
        label: 'Уровень фильтрации',
        type: 'select',
        default: 'block_only_high',
        options: [
          { value: 'block_low_and_above', label: 'Строгий' },
          { value: 'block_medium_and_above', label: 'Средний' },
          { value: 'block_only_high', label: 'Свободный' },
        ],
        description: 'Уровень фильтрации. Контролирует блокировку контента.',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Для воспроизводимости результата.',
      },
    ],
  },

  // 7. FLUX Kontext Max
  {
    id: 'flux-kontext-max',
    name: 'flux-kontext-max',
    displayName: 'FLUX Kontext Max',
    replicateModel: 'black-forest-labs/flux-kontext-max',
    action: 'create',
    runs: '8.8M runs',
    price: '$0.08 per image',
    description: 'Премиум редактирование и генерация текста',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение или инструкцию редактирования...',
      },
      {
        name: 'input_image',
        label: 'Входное изображение',
        type: 'file',
        description: 'Для редактирования (jpeg, png, gif, webp)',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 0,
        max: 6,
        description: '2 = макс. при использовании изображений',
      },
      {
        name: 'prompt_upsampling',
        label: 'Улучшение промпта',
        type: 'checkbox',
        default: false,
      },
    ],
  },

  // 8. Recraft V3 SVG
  {
    id: 'recraft-v3-svg',
    name: 'recraft-v3-svg',
    displayName: 'Recraft V3 SVG',
    replicateModel: 'recraft-ai/recraft-v3-svg',
    action: 'create',
    runs: '320.4K runs',
    price: '$0.08 per image',
    description: 'Генерация SVG - логотипы, иконки',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите логотип или иконку...',
      },
      {
        name: 'size',
        label: 'Размер',
        type: 'select',
        default: '1024x1024',
        options: [
          { value: '1024x1024', label: '1024×1024' },
          { value: '1365x1024', label: '1365×1024' },
          { value: '1024x1365', label: '1024×1365' },
          { value: '1536x1024', label: '1536×1024' },
          { value: '1024x1536', label: '1024×1536' },
          { value: '1820x1024', label: '1820×1024' },
          { value: '1024x1820', label: '1024×1820' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'Not set',
        options: [
          { value: 'Not set', label: 'По размеру' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
        description: 'Переопределяет размер',
      },
      {
        name: 'style',
        label: 'Стиль',
        type: 'select',
        default: 'any',
        options: [
          { value: 'any', label: 'Любой' },
          { value: 'icon', label: 'Иконка' },
          { value: 'logo', label: 'Логотип' },
          { value: 'illustration', label: 'Иллюстрация' },
        ],
      },
    ],
  },

  // 9. Recraft V3
  {
    id: 'recraft-v3',
    name: 'recraft-v3',
    displayName: 'Recraft V3',
    replicateModel: 'recraft-ai/recraft-v3',
    action: 'create',
    runs: '7.1M runs',
    price: '$0.04 per image',
    description: 'SOTA генерация с контролем стиля',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'size',
        label: 'Размер',
        type: 'select',
        default: '1024x1024',
        options: [
          { value: '1024x1024', label: '1024×1024' },
          { value: '1365x1024', label: '1365×1024' },
          { value: '1024x1365', label: '1024×1365' },
          { value: '1536x1024', label: '1536×1024' },
          { value: '1024x1536', label: '1024×1536' },
          { value: '1820x1024', label: '1820×1024' },
          { value: '1024x1820', label: '1024×1820' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'Not set',
        options: [
          { value: 'Not set', label: 'По размеру' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
      },
      {
        name: 'style',
        label: 'Стиль',
        type: 'select',
        default: 'any',
        options: [
          { value: 'any', label: 'Любой' },
          { value: 'realistic_image', label: 'Реалистичное фото' },
          { value: 'digital_illustration', label: 'Цифровая иллюстрация' },
          { value: 'vector_illustration', label: 'Векторная иллюстрация' },
        ],
      },
    ],
  },

  // 10. Stable Diffusion 3.5 Large
  {
    id: 'sd-3.5-large',
    name: 'sd-3.5-large',
    displayName: 'SD 3.5 Large',
    replicateModel: 'stability-ai/stable-diffusion-3.5-large',
    action: 'create',
    runs: '1.7M runs',
    price: '$0.065 per image',
    description: 'Высокое разрешение с поддержкой img2img',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'image',
        label: 'Входное изображение',
        type: 'file',
        description: 'Для img2img режима',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '1:1',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
        ],
        description: 'Игнорируется при использовании изображения',
      },
      {
        name: 'cfg',
        label: 'CFG Scale',
        type: 'slider',
        default: 5,
        min: 1,
        max: 10,
        step: 0.5,
        description: 'Соответствие промпту',
      },
      {
        name: 'prompt_strength',
        label: 'Сила промпта',
        type: 'slider',
        default: 0.85,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Для img2img: 1.0 = полное изменение',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'webp',
        options: [
          { value: 'webp', label: 'WebP' },
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
        ],
      },
    ],
  },

  // 11. MiniMax Image-01
  {
    id: 'minimax-image-01',
    name: 'minimax-image-01',
    displayName: 'MiniMax Image-01',
    replicateModel: 'minimax/image-01',
    action: 'create',
    runs: '2.1M runs',
    price: '$0.01 per image',
    description: 'Дешевая генерация с поддержкой референса лица',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Текстовое описание для генерации. Опишите желаемое.',
      },
      {
        name: 'subject_reference',
        label: 'Референс лица',
        type: 'file',
        description: 'Загрузите фото человека — его лицо появится в результате.',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '1:1',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
        description: 'Соотношение сторон изображения.',
      },
      {
        name: 'number_of_images',
        label: 'Количество изображений',
        type: 'slider',
        default: 1,
        min: 1,
        max: 9,
        description: 'Количество изображений для генерации (1-9).',
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
        description: 'AI улучшит ваш промпт — обычно даёт лучшие результаты.',
      },
    ],
  },

  // 12. Reve Create
  {
    id: 'reve-create',
    name: 'reve-create',
    displayName: 'Reve Create',
    replicateModel: 'reve/create',
    action: 'create',
    runs: '22.7K runs',
    price: '$0.025 per image',
    description: 'Генерация от Reve',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        default: 'A serene mountain landscape at sunset with snow-capped peaks',
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '3:2',
        options: [
          { value: '1:1', label: '1:1' },
          { value: '3:2', label: '3:2' },
          { value: '2:3', label: '2:3' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
      },
      {
        name: 'version',
        label: 'Версия модели',
        type: 'select',
        default: 'latest',
        options: [
          { value: 'latest', label: 'Последняя' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 13. Z-Image Turbo (PrunaAI)
  {
    id: 'z-image-turbo',
    name: 'z-image-turbo',
    displayName: 'Z-Image Turbo',
    replicateModel: 'prunaai/z-image-turbo',
    version: '7ea16386290ff5977c7812e66e462d7ec3954d8e007a8cd18ded3e7d41f5d7cf',
    action: 'create',
    runs: '3.8K runs',
    price: '$0.009 per image',
    description: 'Супербыстрая генерация (8 шагов), отлично рендерит текст на EN/CN',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
        description: 'Детальные описания работают лучше. Поддерживает текст на EN и CN.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 1024,
        min: 64,
        max: 2048,
        step: 64,
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 1024,
        min: 64,
        max: 2048,
        step: 64,
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 8,
        min: 1,
        max: 50,
        description: '8 шагов оптимально для turbo модели',
      },
      {
        name: 'guidance_scale',
        label: 'Guidance Scale',
        type: 'slider',
        default: 0,
        min: 0,
        max: 20,
        step: 0.5,
        description: '0 рекомендуется для turbo моделей',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'jpg',
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 1,
        max: 100,
        description: 'Качество для JPG/WebP (1-100)',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Для воспроизводимости',
      },
    ],
  },

  // 14. Gen4 Image Turbo (Runway)
  {
    id: 'gen4-image-turbo',
    name: 'gen4-image-turbo',
    displayName: 'Gen4 Image Turbo',
    replicateModel: 'runwayml/gen4-image-turbo',
    action: 'create',
    runs: '82.3K runs',
    description: 'Runway - быстрая генерация с референсами (до 3 изображений)',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение... Используйте @ref1, @ref2 для ссылок на референсы',
        description: 'Естественные описания. Используйте @ref1 для ссылки на референс.',
      },
      {
        name: 'reference_images',
        label: 'Референсные изображения',
        type: 'file_array',
        required: true,
        description: '⚠️ ОБЯЗАТЕЛЬНО! До 3 изображений для сохранения стиля',
        maxFiles: 3,
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '1:1', label: '1:1' },
          { value: '21:9', label: '21:9' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },
];

/**
 * РЕДАКТИРОВАТЬ - 8 моделей
 */
export const EDIT_MODELS: Model[] = [
  // 1. Nano Banana Pro (Edit)
  {
    id: 'nano-banana-pro-edit',
    name: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    replicateModel: 'google/nano-banana-pro',
    action: 'edit',
    runs: '4.8M runs',
    description: 'Google Gemini 3 Pro - редактирование с текстом. ⏱️ 1-2 мин',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите что нужно изменить...',
        description: 'Детальное описание изменений. Поддерживает multilingual текст.',
      },
      {
        name: 'image_input',
        label: 'Изображения для редактирования',
        type: 'file_array',
        required: true,
        description: 'До 14 изображений для объединения или редактирования',
        maxFiles: 14,
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '1K', label: '1K (быстрее)' },
          { value: '2K', label: '2K (рекомендуется)' },
          { value: '4K', label: '4K (медленнее)' },
        ],
        description: 'Выше разрешение = дольше генерация',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1 (квадрат)' },
          { value: '16:9', label: '16:9 (горизонталь)' },
          { value: '9:16', label: '9:16 (вертикаль)' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '3:2', label: '3:2' },
          { value: '2:3', label: '2:3' },
          { value: '4:5', label: '4:5' },
          { value: '5:4', label: '5:4' },
          { value: '21:9', label: '21:9 (ультраширокий)' },
        ],
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'safety_filter_level',
        label: 'Уровень фильтрации',
        type: 'select',
        default: 'block_only_high',
        options: [
          { value: 'block_only_high', label: 'Минимальный (рекомендуется)' },
          { value: 'block_medium_and_above', label: 'Средний' },
          { value: 'block_low_and_above', label: 'Строгий' },
        ],
        description: 'При ошибках safety попробуйте Минимальный уровень',
      },
    ],
  },

  // 2. FLUX Kontext Max (Edit)
  {
    id: 'flux-kontext-max-edit',
    name: 'flux-kontext-max',
    displayName: 'FLUX Kontext Max',
    replicateModel: 'black-forest-labs/flux-kontext-max',
    action: 'edit',
    runs: '8.8M runs',
    price: '$0.08 per image',
    description: 'Премиум редактирование с текстом',
    settings: [
      {
        name: 'prompt',
        label: 'Инструкция редактирования',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения...',
      },
      {
        name: 'input_image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 0,
        max: 6,
      },
      {
        name: 'prompt_upsampling',
        label: 'Улучшение промпта',
        type: 'checkbox',
        default: false,
      },
    ],
  },

  // 3. SeeDream 4 (Edit)
  {
    id: 'seedream-4-edit',
    name: 'seedream-4',
    displayName: 'SeeDream 4',
    replicateModel: 'bytedance/seedream-4',
    action: 'edit',
    runs: '14.2M runs',
    price: '$0.03 per image',
    description: 'ByteDance - точное редактирование до 4K',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения одним предложением...',
      },
      {
        name: 'image_input',
        label: 'Изображения',
        type: 'file_array',
        required: true,
        description: '1-10 изображений',
        maxFiles: 10,
      },
      {
        name: 'size',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 4. SeeDream 4.5 (Edit)
  {
    id: 'seedream-4.5-edit',
    name: 'seedream-4.5',
    displayName: 'SeeDream 4.5',
    replicateModel: 'bytedance/seedream-4.5',
    action: 'edit',
    runs: '43.1K runs',
    price: '$0.03 per image',
    description: 'ByteDance - улучшенное редактирование с лучшим пониманием пространства',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения одним предложением...',
        description: 'Текстовое описание изменений, которые нужно внести в изображение.',
      },
      {
        name: 'image_input',
        label: 'Изображения',
        type: 'file_array',
        required: true,
        description: '1-14 изображений для редактирования',
        maxFiles: 14,
      },
      {
        name: 'size',
        label: 'Разрешение',
        type: 'select',
        default: '2K',
        options: [
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
          { value: 'custom', label: 'Свой размер' },
        ],
        description: 'Выходное разрешение. Выше = лучше качество, но медленнее.',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная ширина в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Точная высота в пикселях. Работает только при выборе "Свой размер".',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
        description: 'Соотношение сторон. Не используется при size=custom.',
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
        description: 'AI улучшит ваш промпт для более качественного результата (может увеличить время генерации).',
      },
    ],
  },

  // 5. Bria Eraser
  {
    id: 'bria-eraser',
    name: 'bria-eraser',
    displayName: 'Bria Eraser',
    replicateModel: 'bria/eraser',
    action: 'edit',
    runs: '153.8K runs',
    price: '$0.04 per image',
    description: 'SOTA удаление объектов',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        required: true,
        description: 'Область для удаления',
      },
      {
        name: 'mask_type',
        label: 'Тип маски',
        type: 'select',
        default: 'manual',
        options: [
          { value: 'manual', label: 'Ручная' },
          { value: 'automatic', label: 'Автоматическая' },
        ],
      },
      {
        name: 'preserve_alpha',
        label: 'Сохранить прозрачность',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'content_moderation',
        label: 'Модерация контента',
        type: 'checkbox',
        default: false,
      },
    ],
  },

  // 5. Bria GenFill
  {
    id: 'bria-genfill',
    name: 'bria-genfill',
    displayName: 'Bria GenFill',
    replicateModel: 'bria/genfill',
    action: 'edit',
    runs: '7.9K runs',
    price: '$0.04 per image',
    description: 'Добавление объектов и трансформация',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        required: true,
        description: 'Область для заполнения',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Что добавить в область маски...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'mask_type',
        label: 'Тип маски',
        type: 'select',
        default: 'manual',
        options: [
          { value: 'manual', label: 'Ручная' },
          { value: 'automatic', label: 'Автоматическая' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'preserve_alpha',
        label: 'Сохранить прозрачность',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 6. FLUX Kontext Fast
  {
    id: 'flux-kontext-fast',
    name: 'flux-kontext-fast',
    displayName: 'FLUX Kontext Fast',
    replicateModel: 'prunaai/flux-kontext-fast',
    action: 'edit',
    runs: '11.3M runs',
    price: '$0.01 per image',
    description: 'Ультрабыстрое редактирование',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения...',
      },
      {
        name: 'img_cond_path',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
        ],
      },
      {
        name: 'image_size',
        label: 'Размер (длинная сторона)',
        type: 'slider',
        default: 1024,
        min: 512,
        max: 2048,
        step: 64,
      },
      {
        name: 'guidance',
        label: 'Guidance',
        type: 'slider',
        default: 3.5,
        min: 1,
        max: 10,
        step: 0.5,
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 30,
        min: 10,
        max: 50,
      },
      {
        name: 'speed_mode',
        label: 'Режим скорости',
        type: 'select',
        default: 'Extra Juiced 🔥 (more speed)',
        options: [
          { value: 'Extra Juiced 🔥 (more speed)', label: 'Максимум скорости 🔥' },
          { value: 'Juiced (fast)', label: 'Быстро' },
          { value: 'Normal', label: 'Обычный' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        default: -1,
        description: '-1 = случайный',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'jpg',
        options: [
          { value: 'jpg', label: 'JPG' },
          { value: 'png', label: 'PNG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 1,
        max: 100,
      },
    ],
  },

  // 7. Bria Expand Image
  {
    id: 'bria-expand',
    name: 'bria-expand',
    displayName: 'Bria Expand',
    replicateModel: 'bria/expand-image',
    action: 'expand',
    runs: '103.4K runs',
    price: '$0.04 per image',
    description: 'Расширение границ изображения с AI генерацией',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Опишите что добавить на расширенные области...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'preserve_alpha',
        label: 'Сохранить прозрачность',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 7b. Outpainter (zsxkib)
  {
    id: 'outpainter',
    name: 'outpainter',
    displayName: 'Outpainter',
    replicateModel: 'zsxkib/outpainter',
    action: 'expand',
    runs: '12K runs',
    price: '$0.05 per image',
    description: 'Outpaint в каждом направлении (top, bottom, left, right)',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        default: 'Continue the image',
        placeholder: 'Опишите что должно появиться в расширенных областях...',
      },
      {
        name: 'steps',
        label: 'Steps',
        type: 'slider',
        default: 50,
        min: 15,
        max: 50,
        step: 1,
        description: 'Качество vs скорость',
      },
      {
        name: 'guidance',
        label: 'Guidance',
        type: 'slider',
        default: 30,
        min: 1.5,
        max: 100,
        step: 0.5,
        description: 'Сила следования промпту',
      },
    ],
  },

  // 8. Reve Edit
  {
    id: 'reve-edit',
    name: 'reve-edit',
    displayName: 'Reve Edit',
    replicateModel: 'reve/edit',
    action: 'edit',
    runs: '14.6K runs',
    price: '$0.04 per image',
    description: 'Редактирование от Reve',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'prompt',
        label: 'Инструкция',
        type: 'textarea',
        required: true,
        default: 'Remove all of the people in the background from this image.',
        placeholder: 'Опишите изменения...',
      },
      {
        name: 'version',
        label: 'Версия модели',
        type: 'select',
        default: 'latest',
        options: [
          { value: 'latest', label: 'Последняя' },
        ],
      },
    ],
  },
];

/**
 * УЛУЧШИТЬ КАЧЕСТВО - 6 моделей
 */
export const UPSCALE_MODELS: Model[] = [
  // 1. Google Upscaler
  {
    id: 'google-upscaler',
    name: 'google-upscaler',
    displayName: 'Google Upscaler',
    replicateModel: 'google/upscaler',
    action: 'upscale',
    runs: '60.7K runs',
    price: '$0.02 per image',
    description: 'Google - увеличение 2x или 4x',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото для увеличения разрешения.',
      },
      {
        name: 'upscale_factor',
        label: 'Масштаб',
        type: 'select',
        default: 'x2',
        options: [
          { value: 'x2', label: '2x' },
          { value: 'x4', label: '4x' },
        ],
        description: 'Во сколько раз увеличить изображение.',
      },
      {
        name: 'compression_quality',
        label: 'Качество сжатия',
        type: 'slider',
        default: 80,
        min: 1,
        max: 100,
        description: 'Чем выше — тем чётче, но больше размер файла.',
      },
    ],
  },

  // 2. Recraft Crisp Upscale
  {
    id: 'recraft-crisp-upscale',
    name: 'recraft-crisp-upscale',
    displayName: 'Recraft Crisp',
    replicateModel: 'recraft-ai/recraft-crisp-upscale',
    action: 'upscale',
    runs: '1.1M runs',
    price: '$0.006 per image',
    description: 'Четкое увеличение для веб и печати',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },

  // 3. Crystal Upscaler
  {
    id: 'crystal-upscaler',
    name: 'crystal-upscaler',
    displayName: 'Crystal Upscaler',
    replicateModel: 'philz1337x/crystal-upscaler',
    action: 'upscale',
    runs: '199.3K runs',
    description: 'Высокоточный для портретов и продуктов',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'scale_factor',
        label: 'Масштаб',
        type: 'slider',
        default: 2,
        min: 1,
        max: 4,
        step: 0.5,
      },
      {
        name: 'creativity',
        label: 'Креативность',
        type: 'slider',
        default: 0,
        min: 0,
        max: 10,
        step: 0.5,
        description: 'Уровень улучшения',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG (95%)' },
        ],
      },
    ],
  },

  // 4. Real-ESRGAN
  {
    id: 'real-esrgan',
    name: 'real-esrgan',
    displayName: 'Real-ESRGAN',
    replicateModel: 'nightmareai/real-esrgan',
    action: 'upscale',
    runs: '78.7M runs',
    price: '$0.002 per image',
    description: 'Популярный универсальный апскейлер',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото для увеличения разрешения.',
      },
      {
        name: 'scale',
        label: 'Масштаб',
        type: 'slider',
        default: 4,
        min: 1,
        max: 10,
        step: 0.5,
        description: 'Во сколько раз увеличить. 2x — быстро, 4x — максимальное качество.',
      },
      {
        name: 'face_enhance',
        label: 'Улучшение лиц (GFPGAN)',
        type: 'checkbox',
        default: false,
        description: 'Включите, если на фото есть люди — сделает лица чётче.',
      },
    ],
  },

  // 5. Magic Image Refiner
  {
    id: 'magic-image-refiner',
    name: 'magic-image-refiner',
    displayName: 'Magic Image Refiner',
    replicateModel: 'fermatresearch/magic-image-refiner',
    action: 'upscale',
    runs: '947.7K runs',
    description: 'Улучшение качества и inpainting',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска (опционально)',
        type: 'file',
        description: 'Для частичного улучшения',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Описание для улучшения...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        default: 'teeth, tooth, open mouth, longbody, lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, mutant',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: 'original',
        options: [
          { value: 'original', label: 'Оригинал' },
          { value: '1024', label: '1024px' },
          { value: '2048', label: '2048px' },
        ],
      },
      {
        name: 'creativity',
        label: 'Креативность',
        type: 'slider',
        default: 0.25,
        min: 0,
        max: 1,
        step: 0.05,
        description: '1 = полное изменение',
      },
      {
        name: 'resemblance',
        label: 'Сходство',
        type: 'slider',
        default: 0.75,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Контроль ControlNet',
      },
      {
        name: 'hdr',
        label: 'HDR',
        type: 'slider',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Улучшение HDR',
      },
      {
        name: 'steps',
        label: 'Шаги',
        type: 'slider',
        default: 20,
        min: 10,
        max: 50,
      },
      {
        name: 'guidance_scale',
        label: 'Guidance Scale',
        type: 'slider',
        default: 7,
        min: 0.1,
        max: 30,
        step: 0.5,
      },
      {
        name: 'scheduler',
        label: 'Scheduler',
        type: 'select',
        default: 'DDIM',
        options: [
          { value: 'DDIM', label: 'DDIM' },
          { value: 'DPMSolverMultistep', label: 'DPM Solver' },
          { value: 'K_EULER', label: 'K Euler' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
      {
        name: 'guess_mode',
        label: 'Режим угадывания',
        type: 'checkbox',
        default: false,
        description: 'ControlNet без промпта.',
      },
    ],
  },

  // 6. Clarity Upscaler
  {
    id: 'clarity-upscaler',
    name: 'clarity-upscaler',
    displayName: 'Clarity Upscaler',
    replicateModel: 'philz1337x/clarity-upscaler',
    action: 'upscale',
    runs: '23.6M runs',
    description: 'Продвинутый апскейлер с множеством настроек',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска (опционально)',
        type: 'file',
        description: 'Области для сохранения',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        default: 'masterpiece, best quality, highres, <lora:more_details:0.5> <lora:SDXLrender_v2.0:1>',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        default: '(worst quality, low quality, normal quality:2) JuggernautNegative-neg',
      },
      {
        name: 'scale_factor',
        label: 'Масштаб',
        type: 'slider',
        default: 2,
        min: 1,
        max: 4,
        step: 0.5,
      },
      {
        name: 'creativity',
        label: 'Креативность',
        type: 'slider',
        default: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
        description: '0.3-0.9 рекомендуется',
      },
      {
        name: 'resemblance',
        label: 'Сходство',
        type: 'slider',
        default: 0.6,
        min: 0,
        max: 3,
        step: 0.1,
        description: '0.3-1.6 рекомендуется',
      },
      {
        name: 'dynamic',
        label: 'HDR',
        type: 'slider',
        default: 6,
        min: 1,
        max: 50,
        description: '3-9 рекомендуется',
      },
      {
        name: 'sharpen',
        label: 'Резкость',
        type: 'slider',
        default: 0,
        min: 0,
        max: 10,
        step: 0.5,
        description: '0 = без резкости',
      },
      {
        name: 'tiling_width',
        label: 'Ширина тайла',
        type: 'number',
        default: 112,
        description: 'Меньше = больше фрактальности',
      },
      {
        name: 'tiling_height',
        label: 'Высота тайла',
        type: 'number',
        default: 144,
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 18,
        min: 1,
        max: 100,
      },
      {
        name: 'sd_model',
        label: 'Модель SD',
        type: 'select',
        default: 'juggernaut_reborn.safetensors [338b85bc4f]',
        options: [
          { value: 'juggernaut_reborn.safetensors [338b85bc4f]', label: 'Juggernaut Reborn' },
        ],
      },
      {
        name: 'scheduler',
        label: 'Scheduler',
        type: 'select',
        default: 'DPM++ 3M SDE Karras',
        options: [
          { value: 'DPM++ 3M SDE Karras', label: 'DPM++ 3M SDE Karras' },
          { value: 'DPM++ 2M Karras', label: 'DPM++ 2M Karras' },
          { value: 'Euler a', label: 'Euler a' },
        ],
      },
      {
        name: 'handfix',
        label: 'Исправление рук',
        type: 'select',
        default: 'disabled',
        options: [
          { value: 'disabled', label: 'Выключено' },
          { value: 'hands_only', label: 'Только руки' },
          { value: 'image_and_hands', label: 'Изображение и руки' },
        ],
      },
      {
        name: 'pattern',
        label: 'Бесшовный паттерн',
        type: 'checkbox',
        default: false,
      },
      {
        name: 'downscaling',
        label: 'Предварительное уменьшение',
        type: 'checkbox',
        default: false,
        description: 'Может улучшить качество',
      },
      {
        name: 'downscaling_resolution',
        label: 'Разрешение уменьшения',
        type: 'number',
        default: 768,
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        default: 1337,
      },
    ],
  },
];

/**
 * УДАЛИТЬ ФОН - 4 модели
 */
export const REMOVE_BG_MODELS: Model[] = [
  // 1. 851 Labs Background Remover
  {
    id: '851-background-remover',
    name: '851-background-remover',
    displayName: 'Background Remover',
    replicateModel: '851-labs/background-remover',
    action: 'remove_bg',
    runs: '10.9M runs',
    description: 'Быстрое удаление фона с опциями',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото, с которого нужно убрать фон.',
      },
      {
        name: 'format',
        label: 'Формат выходного файла',
        type: 'select',
        default: 'png',
        options: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPG' },
          { value: 'webp', label: 'WebP' },
        ],
        description: 'PNG для прозрачности, JPG — меньший размер, WebP — баланс.',
      },
      {
        name: 'background_type',
        label: 'Тип фона',
        type: 'select',
        default: 'rgba',
        options: [
          { value: 'rgba', label: 'Прозрачный' },
          { value: 'white', label: 'Белый' },
          { value: 'green', label: 'Зеленый' },
          { value: 'blur', label: 'Размытый' },
          { value: 'map', label: 'Карта' },
        ],
        description: 'Прозрачный — для наложения, белый — для документов, размытый — для портретов.',
      },
      {
        name: 'threshold',
        label: 'Порог',
        type: 'slider',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
        description: '0 — мягкие края для волос, 1 — чёткий вырез для геометрических объектов.',
      },
      {
        name: 'reverse',
        label: 'Удалить передний план',
        type: 'checkbox',
        default: false,
        description: 'Включите, чтобы оставить фон и удалить объект на переднем плане.',
      },
    ],
  },

  // 2. Lucataco Remove BG
  {
    id: 'lucataco-remove-bg',
    name: 'lucataco-remove-bg',
    displayName: 'Remove BG',
    replicateModel: 'lucataco/remove-bg',
    action: 'remove_bg',
    runs: '12.3M runs',
    description: 'Простое удаление фона',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },

  // 3. Bria Remove Background
  {
    id: 'bria-remove-background',
    name: 'bria-remove-background',
    displayName: 'Bria Remove BG',
    replicateModel: 'bria/remove-background',
    action: 'remove_bg',
    runs: '174.1K runs',
    price: '$0.018 per image',
    description: 'Bria AI - профессиональное удаление',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'preserve_partial_alpha',
        label: 'Сохранить частичную прозрачность',
        type: 'checkbox',
        default: true,
        description: 'Сохраняет полупрозрачные области',
      },
      {
        name: 'content_moderation',
        label: 'Модерация контента',
        type: 'checkbox',
        default: false,
      },
    ],
  },

  // 4. BiRefNet
  {
    id: 'birefnet',
    name: 'birefnet',
    displayName: 'BiRefNet',
    replicateModel: 'men1scus/birefnet',
    action: 'remove_bg',
    runs: '3.9M runs',
    description: 'Точная сегментация для сложных объектов',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'text',
        placeholder: '1024x1024',
        description: 'Формат: ШиринаxВысота',
      },
    ],
  },
];

/**
 * ИНПЕЙНТИНГ - 3 модели
 * Точечное редактирование с маской
 */
export const INPAINT_MODELS: Model[] = [
  // 1. Bria GenFill - стабильная и качественная
  {
    id: 'bria-genfill-inpaint',
    name: 'bria-genfill-inpaint',
    displayName: 'Bria GenFill',
    replicateModel: 'bria/genfill',
    action: 'inpaint',
    runs: '8.6K runs',
    price: '$0.04 per image',
    description: 'Добавление объектов и трансформация',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        required: true,
        description: 'Область для заполнения',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Что добавить в область маски...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 2. FLUX Fill Pro
  {
    id: 'flux-fill-pro',
    name: 'flux-fill-pro',
    displayName: 'FLUX Fill Pro',
    replicateModel: 'black-forest-labs/flux-fill-pro',
    action: 'inpaint',
    runs: '3.4M runs',
    price: '$0.05 per image',
    description: 'Профессиональный инпейнтинг (лучшее качество)',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        required: true,
        description: 'Белое = изменить (inpaint), Чёрное = сохранить',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Что сгенерировать в выделенной области...',
      },
      {
        name: 'steps',
        label: 'Шаги',
        type: 'slider',
        default: 50,
        min: 15,
        max: 50,
        description: 'Больше шагов = лучше качество',
      },
      {
        name: 'guidance',
        label: 'Guidance',
        type: 'slider',
        default: 60,
        min: 2,
        max: 100,
        description: 'Выше = точнее по промпту, ниже = более натурально',
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 6,
        description: 'Увеличьте если генерация блокируется',
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'jpg',
        options: [
          { value: 'jpg', label: 'JPEG' },
          { value: 'png', label: 'PNG' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Оставьте пустым для случайного',
      },
    ],
  },

  // 3. Bria Eraser (для удаления объектов)
  {
    id: 'bria-eraser-inpaint',
    name: 'bria-eraser-inpaint',
    displayName: 'Bria Eraser',
    replicateModel: 'bria/eraser',
    action: 'inpaint',
    runs: '165.9K runs',
    price: '$0.04 per image',
    description: 'Удаление объектов с маской',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        required: true,
        description: 'Область для удаления',
      },
    ],
  },
];

/**
 * СОЗДАТЬ ВИДЕО (Text-to-Video) - 7 моделей
 */
export const VIDEO_CREATE_MODELS: Model[] = [
  // 1. Google Veo 3.1 Fast
  {
    id: 'veo-3.1-fast',
    name: 'veo-3.1-fast',
    displayName: 'Veo 3.1 Fast',
    replicateModel: 'google/veo-3.1-fast',
    action: 'video_create',
    description: 'Google - быстрая генерация видео с аудио',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
        description: 'Текстовое описание видео. Опишите сцену, действия и стиль.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        description: 'Укажите что убрать из результата: размытие, артефакты, лишние объекты.',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
        description: 'Выберите пропорции: 16:9 для YouTube, 9:16 для TikTok/Reels.',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
        description: 'Разрешение выходного видео.',
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '8',
        options: [
          { value: '4', label: '4 секунды' },
          { value: '6', label: '6 секунд' },
          { value: '8', label: '8 секунд' },
        ],
        description: 'Длина видео. Меньше = быстрее и дешевле.',
      },
      {
        name: 'generate_audio',
        label: 'Генерировать аудио',
        type: 'checkbox',
        default: true,
        description: 'AI создаст подходящий звук для видео.',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Запомните это число, чтобы получить точно такой же результат снова.',
      },
    ],
  },

  // 2. Kling v2.5 Turbo Pro
  {
    id: 'kling-v2.5-turbo-pro-t2v',
    name: 'kling-v2.5-turbo-pro',
    displayName: 'Kling v2.5 Turbo Pro',
    replicateModel: 'kwaivgi/kling-v2.5-turbo-pro',
    action: 'video_create',
    description: 'Kuaishou - высококачественное видео',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
        description: 'Текстовое описание видео. Опишите сцену, действия и стиль.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        description: 'Укажите что убрать из результата: размытие, артефакты, лишние объекты.',
      },
      {
        name: 'aspect_ratio',
        label: 'Формат (Aspect Ratio)',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
        ],
        description: 'Выберите пропорции: 16:9 для YouTube, 9:16 для TikTok/Reels.',
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
        description: 'Длина видео. 5 сек — быстрее и дешевле, 10 сек — больше действия.',
      },
    ],
  },

  // 3. Hailuo 2.3
  {
    id: 'hailuo-2.3-t2v',
    name: 'hailuo-2.3',
    displayName: 'Hailuo 2.3',
    replicateModel: 'minimax/hailuo-2.3',
    action: 'video_create',
    description: 'MiniMax - качественное видео с управлением камерой',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '768p',
        options: [
          { value: '768p', label: '768p (до 10 сек)' },
          { value: '1080p', label: '1080p (6 сек)' },
        ],
        description: '1080p поддерживает только 6-секундную длительность.',
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '6',
        options: [
          { value: '6', label: '6 секунд' },
          { value: '10', label: '10 секунд (только 768p)' },
        ],
        description: '10 секунд доступно только для 768p разрешения.',
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 4. Kling v2.1 Master (T2V + I2V)
  {
    id: 'kling-v2.1-master-t2v',
    name: 'kling-v2.1-master',
    displayName: 'Kling v2.1 Master',
    replicateModel: 'kwaivgi/kling-v2.1-master',
    action: 'video_create',
    description: 'Kuaishou - премиум качество 1080p с отличной динамикой',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'cfg_scale',
        label: 'CFG Scale',
        type: 'slider',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 6. Wan 2.5 T2V
  {
    id: 'wan-2.5-t2v',
    name: 'wan-2.5-t2v',
    displayName: 'Wan 2.5 T2V',
    replicateModel: 'wan-video/wan-2.5-t2v',
    action: 'video_create',
    description: 'Wan - текст в видео высокого качества',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
        description: 'Текстовое описание видео. Опишите сцену, действия и стиль.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        default: '',
        description: 'Укажите что убрать из результата: размытие, артефакты, лишние объекты.',
      },
      {
        name: 'size',
        label: 'Размер',
        type: 'select',
        default: '1280x720',
        options: [
          { value: '1280x720', label: '1280×720 (720p)' },
          { value: '720x1280', label: '720×1280 (Vertical)' },
          { value: '1024x1024', label: '1024×1024 (Square)' },
        ],
        description: 'Разрешение выходного видео.',
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
        description: 'Длина видео. 5 сек — быстрее и дешевле, 10 сек — больше действия.',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Запомните это число, чтобы получить точно такой же результат снова.',
      },
    ],
  },

  // 7. Kling v2.0
  {
    id: 'kling-v2.0-t2v',
    name: 'kling-v2.0',
    displayName: 'Kling v2.0',
    replicateModel: 'kwaivgi/kling-v2.0',
    action: 'video_create',
    description: 'Kuaishou - базовая версия 720p',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'cfg_scale',
        label: 'CFG Scale',
        type: 'slider',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },

  // 8. Seedance 1 Pro T2V (с поддержкой T2V и I2V)
  {
    id: 'seedance-1-pro-t2v',
    name: 'seedance-1-pro',
    displayName: 'Seedance 1 Pro',
    replicateModel: 'bytedance/seedance-1-pro',
    action: 'video_create',
    description: 'ByteDance - премиум качество до 1080p',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '480p', label: '480p' },
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'slider',
        default: 5,
        min: 2,
        max: 12,
      },
      {
        name: 'camera_fixed',
        label: 'Фиксированная камера',
        type: 'checkbox',
        default: false,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 9. Hailuo 02 T2V (с отличной физикой)
  {
    id: 'hailuo-02-t2v',
    name: 'hailuo-02',
    displayName: 'Hailuo 02',
    replicateModel: 'minimax/hailuo-02',
    action: 'video_create',
    description: 'MiniMax - отличная физика, 768p/1080p',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '512p', label: '512p' },
          { value: '768p', label: '768p (до 10 сек)' },
          { value: '1080p', label: '1080p Pro (6 сек)' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '6',
        options: [
          { value: '6', label: '6 секунд' },
          { value: '10', label: '10 секунд (только 768p)' },
        ],
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },
];

/**
 * КАРТИНКА → ВИДЕО (Image-to-Video) - 8 моделей
 */
export const VIDEO_I2V_MODELS: Model[] = [
  // 0. Google Veo 3.1 Fast I2V
  {
    id: 'veo-3.1-fast-i2v',
    name: 'veo-3.1-fast',
    displayName: 'Veo 3.1 Fast',
    replicateModel: 'google/veo-3.1-fast',
    action: 'video_i2v',
    description: 'Google - анимация с поддержкой первого и последнего кадра',
    settings: [
      {
        name: 'image',
        label: 'Первый кадр',
        type: 'file',
        required: true,
        description: 'Изображение для начала видео (16:9 или 9:16, 1280x720 или 720x1280)',
      },
      {
        name: 'last_frame',
        label: 'Последний кадр',
        type: 'file',
        description: 'Конечное изображение для интерполяции между кадрами.',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
        description: 'Описание движения и действий в видео.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '8',
        options: [
          { value: '4', label: '4 секунды' },
          { value: '6', label: '6 секунд' },
          { value: '8', label: '8 секунд' },
        ],
      },
      {
        name: 'generate_audio',
        label: 'Генерировать аудио',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 1. Kling v2.5 Turbo Pro I2V
  {
    id: 'kling-v2.5-turbo-pro-i2v',
    name: 'kling-v2.5-turbo-pro',
    displayName: 'Kling v2.5 Turbo Pro',
    replicateModel: 'kwaivgi/kling-v2.5-turbo-pro',
    action: 'video_i2v',
    description: 'Kuaishou - анимация изображения',
    settings: [
      {
        name: 'start_image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'С этого изображения начнётся видео.',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
        description: 'Опишите движение и действие для видео.',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        description: 'Укажите что убрать из результата: размытие, артефакты, лишние объекты.',
      },
      {
        name: 'duration',
        label: 'Длительность',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
        description: 'Длина видео. 5 сек — быстрее и дешевле, 10 сек — больше действия.',
      },
    ],
  },

  // 2. Seedance 1 Pro Fast
  {
    id: 'seedance-1-pro-fast',
    name: 'seedance-1-pro-fast',
    displayName: 'Seedance 1 Pro Fast',
    replicateModel: 'bytedance/seedance-1-pro-fast',
    action: 'video_i2v',
    description: 'ByteDance - быстрая анимация до 1080p',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        description: 'Опционально для I2V',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '480p', label: '480p' },
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
        ],
        description: 'Игнорируется при использовании изображения',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'slider',
        default: 5,
        min: 2,
        max: 12,
      },
      {
        name: 'fps',
        label: 'FPS',
        type: 'number',
        default: 24,
      },
      {
        name: 'camera_fixed',
        label: 'Фиксированная камера',
        type: 'checkbox',
        default: false,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 3. Wan 2.5 I2V Fast
  {
    id: 'wan-2.5-i2v-fast',
    name: 'wan-2.5-i2v-fast',
    displayName: 'Wan 2.5 I2V Fast',
    replicateModel: 'wan-video/wan-2.5-i2v-fast',
    action: 'video_i2v',
    description: 'Wan - быстрая анимация изображений',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        default: '',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '720p',
        options: [
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'audio',
        label: 'Аудио файл',
        type: 'file',
        description: 'WAV/MP3, 3-30 сек, до 15MB',
      },
      {
        name: 'enable_prompt_expansion',
        label: 'Улучшение промпта',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 4. Hailuo 2.3 Fast I2V
  {
    id: 'hailuo-2.3-fast-i2v',
    name: 'hailuo-2.3-fast',
    displayName: 'Hailuo 2.3 Fast',
    replicateModel: 'minimax/hailuo-2.3-fast',
    action: 'video_i2v',
    description: 'MiniMax - быстрая анимация',
    settings: [
      {
        name: 'first_frame_image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Первый кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 4.5. Hailuo 02 I2V (с поддержкой последнего кадра)
  {
    id: 'hailuo-02-i2v',
    name: 'hailuo-02',
    displayName: 'Hailuo 02',
    replicateModel: 'minimax/hailuo-02',
    action: 'video_i2v',
    runs: '241.4K runs',
    description: 'MiniMax - с поддержкой первого и последнего кадра',
    settings: [
      {
        name: 'first_frame_image',
        label: 'Первый кадр',
        type: 'file',
        description: 'Первый кадр видео (определяет соотношение сторон)',
      },
      {
        name: 'last_frame_image',
        label: 'Последний кадр',
        type: 'file',
        description: 'Последний кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '6',
        options: [
          { value: '6', label: '6 секунд' },
          { value: '10', label: '10 секунд (только 768p)' },
        ],
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '512p', label: '512p' },
          { value: '768p', label: '768p (до 10 сек)' },
          { value: '1080p', label: '1080p Pro (6 сек)' },
        ],
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 5. Seedance 1 Pro
  {
    id: 'seedance-1-pro',
    name: 'seedance-1-pro',
    displayName: 'Seedance 1 Pro',
    replicateModel: 'bytedance/seedance-1-pro',
    action: 'video_i2v',
    description: 'ByteDance - премиум качество с поддержкой последнего кадра',
    settings: [
      {
        name: 'image',
        label: 'Первый кадр',
        type: 'file',
        description: 'Первый кадр видео (опционально для T2V)',
      },
      {
        name: 'last_frame_image',
        label: 'Последний кадр',
        type: 'file',
        description: 'Последний кадр видео (работает только с первым кадром)',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
      },
      {
        name: 'resolution',
        label: 'Разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '480p', label: '480p' },
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'slider',
        default: 5,
        min: 2,
        max: 12,
      },
      {
        name: 'camera_fixed',
        label: 'Фиксированная камера',
        type: 'checkbox',
        default: false,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 6. Kling v2.1 Master I2V
  {
    id: 'kling-v2.1-master-i2v',
    name: 'kling-v2.1-master',
    displayName: 'Kling v2.1 Master',
    replicateModel: 'kwaivgi/kling-v2.1-master',
    action: 'video_i2v',
    description: 'Kuaishou - премиум анимация 1080p',
    settings: [
      {
        name: 'start_image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Первый кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'cfg_scale',
        label: 'CFG Scale',
        type: 'slider',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 7. Kling v2.1 I2V
  {
    id: 'kling-v2.1-i2v',
    name: 'kling-v2.1',
    displayName: 'Kling v2.1',
    replicateModel: 'kwaivgi/kling-v2.1',
    action: 'video_i2v',
    description: 'Kuaishou - стабильная анимация 720p/1080p с поддержкой последнего кадра',
    settings: [
      {
        name: 'start_image',
        label: 'Первый кадр',
        type: 'file',
        required: true,
        description: 'Первый кадр видео',
      },
      {
        name: 'end_image',
        label: 'Последний кадр',
        type: 'file',
        description: 'Последний кадр видео (требуется режим Pro)',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'mode',
        label: 'Режим',
        type: 'select',
        default: 'standard',
        options: [
          { value: 'standard', label: 'Standard (720p)' },
          { value: 'pro', label: 'Pro (1080p, поддержка last frame)' },
        ],
        description: 'Pro режим нужен для использования последнего кадра',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 8. Kling v2.0 I2V
  {
    id: 'kling-v2.0-i2v',
    name: 'kling-v2.0',
    displayName: 'Kling v2.0',
    replicateModel: 'kwaivgi/kling-v2.0',
    action: 'video_i2v',
    description: 'Kuaishou - базовая анимация',
    settings: [
      {
        name: 'start_image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Первый кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'cfg_scale',
        label: 'CFG Scale',
        type: 'slider',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
    ],
  },

  // 9. Video-01 Director
  {
    id: 'video-01-director',
    name: 'video-01-director',
    displayName: 'Video-01 Director',
    replicateModel: 'minimax/video-01-director',
    action: 'video_i2v',
    description: 'MiniMax - управление камерой [Pan left/right]',
    settings: [
      {
        name: 'first_frame_image',
        label: 'Изображение',
        type: 'file',
        description: 'Первый кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: '[Pan left] Опишите движение... [Zoom in]',
        description: 'Используйте [Движение] для контроля камеры',
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // 10. Runway Gen4 Turbo
  {
    id: 'gen4-turbo-i2v',
    name: 'gen4-turbo',
    displayName: 'Runway Gen4 Turbo',
    replicateModel: 'runwayml/gen4-turbo',
    action: 'video_i2v',
    description: 'Runway - премиум анимация',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Первый кадр видео',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите движение...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '1:1', label: '1:1' },
        ],
        description: 'Игнорируется если передано изображение',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '10', label: '10 секунд' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },
];

/**
 * РЕДАКТИРОВАТЬ ВИДЕО - 6 моделей
 */
export const VIDEO_EDIT_MODELS: Model[] = [
  // 1. Luma Modify Video
  {
    id: 'luma-modify-video',
    name: 'modify-video',
    displayName: 'Luma Modify Video',
    replicateModel: 'luma/modify-video',
    action: 'video_edit',
    description: 'Luma - стиль и трансформация видео',
    settings: [
      {
        name: 'video',
        label: 'Видео',
        type: 'file',
        required: true,
        description: 'Загрузите видео для трансформации (до 100MB, до 10 сек, 24fps).',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Опишите изменения...',
        description: 'Промпт трансформации стиля. Например: "make it anime", "make it cinematic".',
      },
      {
        name: 'model',
        label: 'Модель',
        type: 'select',
        default: 'ray-2',
        options: [
          { value: 'ray-2', label: 'Ray 2 (качество)' },
          { value: 'ray-flash-2', label: 'Ray Flash 2 (быстрее)' },
        ],
        description: 'Ray 2 — лучшее качество, Ray Flash 2 — быстрее.',
      },
      {
        name: 'mode',
        label: 'Режим',
        type: 'select',
        default: 'flex_1',
        options: [
          { value: 'adhere_1', label: 'Adhere 1 (очень близко)' },
          { value: 'adhere_2', label: 'Adhere 2' },
          { value: 'adhere_3', label: 'Adhere 3' },
          { value: 'flex_1', label: 'Flex 1 (баланс)' },
          { value: 'flex_2', label: 'Flex 2' },
          { value: 'flex_3', label: 'Flex 3' },
          { value: 'reimagine_1', label: 'Reimagine 1 (творческий)' },
          { value: 'reimagine_2', label: 'Reimagine 2' },
          { value: 'reimagine_3', label: 'Reimagine 3' },
        ],
        description: 'Adhere — минимальные изменения, Flex — баланс, Reimagine — полная переработка.',
      },
      {
        name: 'first_frame',
        label: 'Первый кадр',
        type: 'file',
        description: 'Загрузите отредактированный первый кадр — видео будет следовать его стилю.',
      },
    ],
  },

  // 2. Luma Reframe Video
  {
    id: 'luma-reframe-video',
    name: 'reframe-video',
    displayName: 'Luma Reframe Video',
    replicateModel: 'luma/reframe-video',
    action: 'video_edit',
    description: 'Luma - изменение соотношения сторон',
    settings: [
      {
        name: 'video',
        label: 'Видео',
        type: 'file',
        required: true,
        description: 'Макс. 30 сек',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Опишите контекст...',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9 (YouTube)' },
          { value: '9:16', label: '9:16 (TikTok/Reels)' },
          { value: '1:1', label: '1:1 (Square)' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '21:9', label: '21:9 (Cinematic)' },
          { value: '9:21', label: '9:21' },
        ],
      },
    ],
  },

  // 3. MMAudio - Add Sound
  {
    id: 'mmaudio',
    name: 'mmaudio',
    displayName: 'MMAudio',
    replicateModel: 'zsxkib/mmaudio',
    version: '62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484',
    action: 'video_edit',
    description: 'Добавить звук к видео с помощью AI',
    settings: [
      {
        name: 'video',
        label: 'Видео',
        type: 'file',
        required: true,
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Describe the sound in English...',
        default: '',
        description: 'galloping, rain, birds chirping, dog barking...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'What to exclude...',
        default: 'music',
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'number',
        default: 8,
        description: 'Длительность аудио',
      },
      {
        name: 'num_steps',
        label: 'Шаги генерации',
        type: 'slider',
        default: 25,
        min: 10,
        max: 50,
      },
      {
        name: 'cfg_strength',
        label: 'CFG Strength',
        type: 'slider',
        default: 4.5,
        min: 1,
        max: 10,
        step: 0.5,
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        default: -1,
        description: '-1 = случайный',
      },
    ],
  },

  // 4. Video Merge
  {
    id: 'video-merge',
    name: 'video-merge',
    displayName: 'Video Merge',
    replicateModel: 'lucataco/video-merge',
    action: 'video_edit',
    description: 'Объединить несколько видео',
    settings: [
      {
        name: 'video_files',
        label: 'Видео файлы',
        type: 'file_array',
        required: true,
        description: 'Видео для объединения (по порядку)',
        maxFiles: 10,
      },
      {
        name: 'keep_audio',
        label: 'Сохранить аудио',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'number',
        default: 0,
        description: '0 = авто',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'number',
        default: 0,
        description: '0 = авто',
      },
      {
        name: 'fps',
        label: 'FPS',
        type: 'number',
        default: 0,
        description: '0 = авто',
      },
    ],
  },

  // 5. Autocaption - AI Subtitles
  {
    id: 'autocaption',
    name: 'autocaption',
    displayName: 'Autocaption',
    replicateModel: 'fictions-ai/autocaption',
    action: 'video_edit',
    description: 'Добавить субтитры к видео с караоке-эффектом',
    settings: [
      {
        name: 'video_file_input',
        label: 'Видео',
        type: 'file',
        required: true,
        description: 'Видео для добавления субтитров',
      },
      {
        name: 'subs_position',
        label: 'Позиция субтитров',
        type: 'select',
        default: 'bottom75',
        options: [
          { value: 'bottom75', label: 'Внизу (75%)' },
          { value: 'bottom50', label: 'По центру снизу (50%)' },
          { value: 'center', label: 'По центру' },
          { value: 'top25', label: 'Сверху (25%)' },
        ],
      },
      {
        name: 'font',
        label: 'Шрифт',
        type: 'select',
        default: 'Poppins/Poppins-ExtraBold.ttf',
        options: [
          { value: 'Poppins/Poppins-ExtraBold.ttf', label: 'Poppins ExtraBold' },
          { value: 'Poppins/Poppins-Bold.ttf', label: 'Poppins Bold' },
          { value: 'Poppins/Poppins-SemiBold.ttf', label: 'Poppins SemiBold' },
          { value: 'Arial.ttf', label: 'Arial' },
        ],
      },
      {
        name: 'fontsize',
        label: 'Размер шрифта',
        type: 'slider',
        default: 7,
        min: 3,
        max: 12,
        step: 0.5,
        description: '7 для видео, 4 для reels',
      },
      {
        name: 'MaxChars',
        label: 'Макс. символов в строке',
        type: 'slider',
        default: 20,
        min: 10,
        max: 40,
        step: 1,
        description: '20 для видео, 10 для reels',
      },
      {
        name: 'color',
        label: 'Цвет текста',
        type: 'text',
        default: 'white',
        description: 'white, yellow, red, #FF0000',
      },
      {
        name: 'highlight_color',
        label: 'Цвет выделения (караоке)',
        type: 'text',
        default: 'yellow',
        description: 'Цвет подсветки текущего слова',
      },
      {
        name: 'stroke_color',
        label: 'Цвет обводки',
        type: 'text',
        default: 'black',
      },
      {
        name: 'stroke_width',
        label: 'Толщина обводки',
        type: 'slider',
        default: 2.6,
        min: 0,
        max: 5,
        step: 0.1,
      },
      {
        name: 'kerning',
        label: 'Межбуквенный интервал',
        type: 'slider',
        default: -5,
        min: -15,
        max: 5,
        step: 1,
      },
      {
        name: 'opacity',
        label: 'Прозрачность фона',
        type: 'slider',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
        description: '0 = без фона',
      },
    ],
  },

  // 6. Runway Gen4 Aleph - Video Editing
  {
    id: 'gen4-aleph',
    name: 'gen4-aleph',
    displayName: 'Runway Gen4 Aleph',
    replicateModel: 'runwayml/gen4-aleph',
    action: 'video_edit',
    description: 'Runway - редактирование, трансформация, эффекты',
    settings: [
      {
        name: 'video',
        label: 'Видео',
        type: 'file',
        required: true,
        description: 'Видео для редактирования (до 16MB, первые 5 сек)',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения: add rain, change to anime style, make it sunset...',
        description: 'Промпт описывает какие изменения применить к видео',
      },
      {
        name: 'reference_image',
        label: 'Референс изображение',
        type: 'file',
        description: 'Опционально: изображение для стилизации или добавления объектов',
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '1280:720',
        options: [
          { value: '1280:720', label: '16:9 Landscape (1280x720)' },
          { value: '1584:672', label: '21:9 Cinematic (1584x672)' },
          { value: '1104:832', label: '4:3 Landscape (1104x832)' },
          { value: '848:480', label: '16:9 Small (848x480)' },
          { value: '720:1280', label: '9:16 Portrait (720x1280)' },
          { value: '832:1104', label: '3:4 Portrait (832x1104)' },
          { value: '480:848', label: '9:16 Small (480x848)' },
          { value: '960:960', label: '1:1 Square (960x960)' },
        ],
        description: 'Формат выходного видео',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Для воспроизводимости результата',
      },
    ],
  },
];

/**
 * УЛУЧШИТЬ ВИДЕО - 1 модель
 */
export const VIDEO_UPSCALE_MODELS: Model[] = [
  // 1. Topaz Video Upscale
  {
    id: 'topaz-video-upscale',
    name: 'video-upscale',
    displayName: 'Topaz Video Upscale',
    replicateModel: 'topazlabs/video-upscale',
    action: 'video_upscale',
    description: 'Topaz Labs - профессиональный апскейл до 4K',
    settings: [
      {
        name: 'video',
        label: 'Видео',
        type: 'file',
        required: true,
      },
      {
        name: 'target_resolution',
        label: 'Целевое разрешение',
        type: 'select',
        default: '1080p',
        options: [
          { value: '720p', label: '720p' },
          { value: '1080p', label: '1080p (Full HD)' },
          { value: '4k', label: '4K (Ultra HD)' },
        ],
      },
      {
        name: 'target_fps',
        label: 'Целевой FPS',
        type: 'slider',
        default: 30,
        min: 15,
        max: 60,
        description: 'Интерполяция кадров',
      },
    ],
  },
];

/**
 * АНАЛИЗ ИЗОБРАЖЕНИЙ - Описание (4 модели)
 */
export const ANALYZE_DESCRIBE_MODELS: Model[] = [
  // 1. Moondream 2
  {
    id: 'moondream2',
    name: 'moondream2',
    displayName: 'Moondream 2',
    replicateModel: 'lucataco/moondream2',
    version: '72ccb656353c348c1385df54b237eeb7bfa874bf11486cf0b9473e691b662d31',
    action: 'analyze_describe',
    runs: '5.6M runs',
    description: 'Быстрое описание изображений, VQA',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото для получения описания.',
      },
      {
        name: 'prompt',
        label: 'Вопрос',
        type: 'textarea',
        default: 'Describe this image in detail',
        placeholder: 'What is in this image?',
        description: 'Вопрос об изображении. Используйте естественный язык.',
      },
    ],
  },

  // 2. LLaVa 13B
  {
    id: 'llava-13b',
    name: 'llava-13b',
    displayName: 'LLaVa 13B',
    replicateModel: 'yorickvp/llava-13b',
    version: '80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb',
    action: 'analyze_describe',
    runs: '32.7M runs',
    description: 'Детальные описания с GPT-4 уровнем',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото для получения описания.',
      },
      {
        name: 'prompt',
        label: 'Вопрос',
        type: 'textarea',
        default: 'What is happening in this image? Describe in detail.',
        placeholder: 'Describe this image',
        description: 'Вопрос об изображении. Будьте конкретны для лучших ответов.',
      },
      {
        name: 'max_tokens',
        label: 'Макс. токенов',
        type: 'slider',
        default: 1024,
        min: 100,
        max: 2048,
        step: 64,
        description: 'Ограничение длины ответа. Увеличьте для детальных описаний.',
      },
      {
        name: 'temperature',
        label: 'Температура',
        type: 'slider',
        default: 0.2,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Низкая — точные ответы, высокая — более творческие описания.',
      },
    ],
  },

  // 3. BLIP-2
  {
    id: 'blip-2',
    name: 'blip-2',
    displayName: 'BLIP-2',
    replicateModel: 'andreasjansson/blip-2',
    version: 'f677695e5e89f8b236e52ecd1d3f01beb44c34606419bcc19345e046d8f786f9',
    action: 'analyze_describe',
    runs: '31.1M runs',
    description: 'Универсальные ответы на вопросы',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'question',
        label: 'Вопрос',
        type: 'textarea',
        default: 'What is this?',
        placeholder: 'What do you see?',
      },
    ],
  },
];

/**
 * АНАЛИЗ ИЗОБРАЖЕНИЙ - OCR (3 модели)
 */
export const ANALYZE_OCR_MODELS: Model[] = [
  // 1. DeepSeek OCR
  {
    id: 'deepseek-ocr',
    name: 'deepseek-ocr',
    displayName: 'DeepSeek OCR',
    replicateModel: 'lucataco/deepseek-ocr',
    version: 'cb3b474fbfc56b1664c8c7841550bccecbe7b74c30e45ce938ffca1180b4dff5',
    action: 'analyze_ocr',
    description: '100+ языков, сохраняет структуру документа → Markdown',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите документ, скриншот или фото с текстом — AI извлечёт текст.',
      },
    ],
  },

  // 2. Text Extract OCR
  {
    id: 'text-extract-ocr',
    name: 'text-extract-ocr',
    displayName: 'Text Extract OCR',
    replicateModel: 'abiruyt/text-extract-ocr',
    version: 'a524caeaa23495bc9edc805ab08ab5fe943afd3febed884a4f3747aa32e9cd61',
    action: 'analyze_ocr',
    description: 'Простое и быстрое извлечение текста',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },
];

/**
 * АНАЛИЗ ИЗОБРАЖЕНИЙ - Генерация промптов (3 модели)
 */
export const ANALYZE_PROMPT_MODELS: Model[] = [
  // 1. CLIP Interrogator
  {
    id: 'clip-interrogator',
    name: 'clip-interrogator',
    displayName: 'CLIP Interrogator',
    replicateModel: 'pharmapsychotic/clip-interrogator',
    version: '8151e1c9f47e696fa316146a2e35812ccf79cfc9eba05b11c7f450155102af70',
    action: 'analyze_prompt',
    runs: '4.7M runs',
    description: 'Генерация промпта для Stable Diffusion',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Загрузите фото — AI создаст промпт для генерации похожего.',
      },
      {
        name: 'mode',
        label: 'Режим',
        type: 'select',
        default: 'best',
        options: [
          { value: 'best', label: 'Best (медленный, точный)' },
          { value: 'fast', label: 'Fast (быстрый)' },
          { value: 'classic', label: 'Classic' },
          { value: 'negative', label: 'Negative (негативный промпт)' },
        ],
        description: 'Режим генерации промпта. Best = точнее, но медленнее.',
      },
      {
        name: 'clip_model_name',
        label: 'CLIP модель',
        type: 'select',
        default: 'ViT-L-14/openai',
        options: [
          { value: 'ViT-L-14/openai', label: 'ViT-L-14 (OpenAI)' },
          { value: 'ViT-H-14/laion2b_s32b_b79k', label: 'ViT-H-14 (LAION)' },
        ],
        description: 'Модель CLIP для анализа.',
      },
    ],
  },

  // 2. SDXL CLIP Interrogator
  {
    id: 'sdxl-clip-interrogator',
    name: 'sdxl-clip-interrogator',
    displayName: 'SDXL CLIP Interrogator',
    replicateModel: 'lucataco/sdxl-clip-interrogator',
    version: 'b8dd624ad312d215250b362af0ecff05d7ad4f8270f9beb034c483d70682e7b3',
    action: 'analyze_prompt',
    runs: '848.7K runs',
    description: 'Оптимизирован для SDXL моделей',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
      {
        name: 'mode',
        label: 'Режим',
        type: 'select',
        default: 'best',
        options: [
          { value: 'best', label: 'Best (точный)' },
          { value: 'fast', label: 'Fast (быстрый)' },
        ],
      },
    ],
  },

  // 3. Img2Prompt
  {
    id: 'img2prompt',
    name: 'img2prompt',
    displayName: 'Img2Prompt',
    replicateModel: 'methexis-inc/img2prompt',
    version: '50adaf2d3ad20a6f911a8a9e3ccf777b263b8596fbd2c8fc26e8888f8a0edbb5',
    action: 'analyze_prompt',
    runs: '2.7M runs',
    description: 'Промпт со стилем для SD 1.x',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },
];

/**
 * Все модели
 */
export const ALL_MODELS: Model[] = [
  ...CREATE_MODELS,
  ...UPSCALE_MODELS,
  ...EDIT_MODELS,
  ...REMOVE_BG_MODELS,
  ...INPAINT_MODELS,
  ...VIDEO_CREATE_MODELS,
  ...VIDEO_I2V_MODELS,
  ...VIDEO_EDIT_MODELS,
  ...VIDEO_UPSCALE_MODELS,
  ...ANALYZE_DESCRIBE_MODELS,
  ...ANALYZE_OCR_MODELS,
  ...ANALYZE_PROMPT_MODELS,
];

/**
 * Получить модели по действию
 */
export function getModelsByAction(action: ActionType): Model[] {
  switch (action) {
    case 'create':
      return CREATE_MODELS;
    case 'upscale':
      return UPSCALE_MODELS;
    case 'edit':
      return EDIT_MODELS;
    case 'remove_bg':
      return REMOVE_BG_MODELS;
    case 'inpaint':
      return INPAINT_MODELS;
    case 'expand':
      return ALL_MODELS.filter(m => m.action === 'expand');
    case 'video_create':
      return VIDEO_CREATE_MODELS;
    case 'video_i2v':
      return VIDEO_I2V_MODELS;
    case 'video_edit':
      return VIDEO_EDIT_MODELS;
    case 'video_upscale':
      return VIDEO_UPSCALE_MODELS;
    case 'analyze_describe':
      return ANALYZE_DESCRIBE_MODELS;
    case 'analyze_ocr':
      return ANALYZE_OCR_MODELS;
    case 'analyze_prompt':
      return ANALYZE_PROMPT_MODELS;
    default:
      return [];
  }
}

/**
 * Получить модель по ID
 */
export function getModelById(id: string): Model | undefined {
  return ALL_MODELS.find((model) => model.id === id);
}

/**
 * Получить читаемое название действия
 */
export function getActionLabel(action: ActionType): string {
  const labels: Record<ActionType, string> = {
    create: 'Создать изображение',
    edit: 'Редактировать',
    upscale: 'Улучшить качество',
    remove_bg: 'Удалить фон',
    inpaint: 'Инпейнтинг',
    expand: 'Расширить изображение',
    video_create: 'Создать видео',
    video_i2v: 'Картинка → Видео',
    video_edit: 'Редактировать видео',
    video_upscale: 'Улучшить видео',
    analyze_describe: 'Описать изображение',
    analyze_ocr: 'Извлечь текст (OCR)',
    analyze_prompt: 'Получить промпт',
  };
  return labels[action];
}
