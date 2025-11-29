/**
 * ПОЛНАЯ конфигурация моделей с всеми параметрами
 * На основе официальной документации Replicate API
 * Обновлено: 2025-11-26
 */

export type ActionType = 'create' | 'edit' | 'upscale' | 'remove_bg' | 'video_create' | 'video_i2v' | 'video_edit' | 'video_upscale';

export type SettingType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'slider' 
  | 'select' 
  | 'checkbox' 
  | 'file'
  | 'file_array';

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
  // 1. FLUX 2 Pro
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
      },
      {
        name: 'input_images',
        label: 'Референсные изображения',
        type: 'file_array',
        description: 'До 8 изображений для img2img генерации (jpeg, png, gif, webp)',
        maxFiles: 8,
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
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
        description: 'Не используется при aspect_ratio=custom',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Только при aspect_ratio=custom',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 2048,
        step: 32,
        description: 'Только при aspect_ratio=custom',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Для воспроизводимости',
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
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 0,
        max: 100,
        description: 'Не влияет на PNG',
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 5,
        description: '1 = строгий, 5 = свободный',
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
      },
      {
        name: 'image_input',
        label: 'Референсные изображения',
        type: 'file_array',
        description: '1-10 изображений для img2img',
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
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Только при size=custom',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 2048,
        min: 1024,
        max: 4096,
        step: 64,
        description: 'Только при size=custom',
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
        description: 'Не используется при size=custom',
      },
      {
        name: 'max_images',
        label: 'Макс. изображений',
        type: 'slider',
        default: 1,
        min: 1,
        max: 15,
        description: 'При sequential_image_generation=auto',
      },
      {
        name: 'enhance_prompt',
        label: 'Улучшить промпт',
        type: 'checkbox',
        default: true,
        description: 'Автоулучшение для лучшего качества',
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
      },
    ],
  },

  // 3. Nano Banana Pro (Google Gemini 2.5)
  {
    id: 'nano-banana-pro',
    name: 'nano-banana-pro',
    displayName: 'Nano Banana Pro',
    replicateModel: 'google/nano-banana-pro',
    action: 'create',
    runs: '725.6K runs',
    price: 'Priced by multiple properties',
    description: 'Google Gemini 2.5 - генерация и редактирование',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'image_input',
        label: 'Референсные изображения',
        type: 'file_array',
        description: 'До 14 изображений для трансформации',
        maxFiles: 14,
      },
      {
        name: 'resolution',
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
          { value: 'match_input_image', label: 'Как входное изображение' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
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
          { value: 'block_low_and_above', label: 'Строгий' },
          { value: 'block_medium_and_above', label: 'Средний' },
          { value: 'block_only_high', label: 'Свободный' },
        ],
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
        name: 'image',
        label: 'Изображение для inpainting',
        type: 'file',
        description: 'Требуется маска',
      },
      {
        name: 'mask',
        label: 'Маска',
        type: 'file',
        description: 'Черные пиксели = inpaint, белые = сохранить',
      },
      {
        name: 'style_reference_images',
        label: 'Референсы стиля',
        type: 'file_array',
        description: 'Изображения для переноса стиля',
        maxFiles: 5,
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
        default: 'None',
        options: [
          { value: 'None', label: 'Авто' },
          { value: 'Realistic', label: 'Реалистичный' },
          { value: 'Design', label: 'Дизайн' },
          { value: '3D', label: '3D' },
          { value: 'Anime', label: 'Аниме' },
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
      },
      {
        name: 'image_prompt',
        label: 'Референсное изображение',
        type: 'file',
        description: 'Для FLUX Redux - направляет композицию',
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
          { value: 'custom', label: 'Свой размер' },
        ],
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        min: 256,
        max: 1440,
        step: 32,
        description: 'Только при aspect_ratio=custom',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        min: 256,
        max: 1440,
        step: 32,
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
      {
        name: 'output_quality',
        label: 'Качество',
        type: 'slider',
        default: 80,
        min: 0,
        max: 100,
      },
      {
        name: 'safety_tolerance',
        label: 'Уровень безопасности',
        type: 'slider',
        default: 2,
        min: 1,
        max: 6,
      },
      {
        name: 'prompt_upsampling',
        label: 'Улучшение промпта',
        type: 'checkbox',
        default: false,
        description: 'Автомодификация для креативности',
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
        ],
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
      },
      {
        name: 'subject_reference',
        label: 'Референс лица',
        type: 'file',
        description: 'Фото человека для переноса в генерацию',
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
        ],
      },
      {
        name: 'number_of_images',
        label: 'Количество изображений',
        type: 'slider',
        default: 1,
        min: 1,
        max: 9,
      },
      {
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
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
        description: 'До 3 изображений для сохранения персонажа/локации',
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
    runs: '936K runs',
    description: 'Google Gemini 3 Pro - редактирование и генерация с текстом',
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
          { value: '1K', label: '1K' },
          { value: '2K', label: '2K' },
          { value: '4K', label: '4K (медленнее)' },
        ],
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: 'match_input_image',
        options: [
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1 (квадрат)' },
          { value: '16:9', label: '16:9 (горизонталь)' },
          { value: '9:16', label: '9:16 (вертикаль)' },
          { value: '4:3', label: '4:3' },
          { value: '3:4', label: '3:4' },
          { value: '3:2', label: '3:2' },
          { value: '2:3', label: '2:3' },
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
        description: 'Google Safety Filter. При ошибках попробуйте Минимальный.',
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

  // 4. Bria Eraser
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
    action: 'edit',
    runs: '103.4K runs',
    price: '$0.04 per image',
    description: 'Расширение границ изображения',
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
        ],
      },
      {
        name: 'canvas_size',
        label: 'Размер канвы',
        type: 'text',
        default: '[1000, 1000]',
        description: '[ширина, высота]',
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
      },
      {
        name: 'compression_quality',
        label: 'Качество сжатия',
        type: 'slider',
        default: 80,
        min: 1,
        max: 100,
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
      },
      {
        name: 'scale',
        label: 'Масштаб',
        type: 'slider',
        default: 4,
        min: 1,
        max: 10,
        step: 0.5,
        description: '2 или 4 рекомендуется',
      },
      {
        name: 'face_enhance',
        label: 'Улучшение лиц (GFPGAN)',
        type: 'checkbox',
        default: false,
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
        description: 'ControlNet без промпта',
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
      },
      {
        name: 'format',
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
      },
      {
        name: 'threshold',
        label: 'Порог',
        type: 'slider',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
        description: '0 = мягкая альфа',
      },
      {
        name: 'reverse',
        label: 'Удалить передний план',
        type: 'checkbox',
        default: false,
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
      },
      {
        name: 'aspect_ratio',
        label: 'Соотношение сторон',
        type: 'select',
        default: '16:9',
        options: [
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
        ],
      },
      {
        name: 'duration',
        label: 'Длительность (сек)',
        type: 'select',
        default: '5',
        options: [
          { value: '5', label: '5 секунд' },
          { value: '8', label: '8 секунд' },
        ],
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
        description: 'Для воспроизводимости',
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
        description: 'Соответствие промпту',
      },
      {
        name: 'seed',
        label: 'Seed',
        type: 'number',
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
        name: 'prompt_optimizer',
        label: 'Оптимизация промпта',
        type: 'checkbox',
        default: true,
      },
    ],
  },

  // Kling v2.1 УДАЛЁН из T2V - модель требует start_image (только I2V)
  // Используйте kling-v2.1-i2v для анимации изображений

  // 4. Wan 2.5 T2V
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
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
        default: '',
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

  // 5. Kling v2.0
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

  // REMOVED: Hailuo 2.3 Fast - это только I2V модель, требует first_frame_image
  // Используйте Hailuo 2.3 (не Fast) для T2V или другие модели
];

/**
 * КАРТИНКА → ВИДЕО (Image-to-Video) - 8 моделей
 */
export const VIDEO_I2V_MODELS: Model[] = [
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

  // 5. Seedance 1 Pro
  {
    id: 'seedance-1-pro',
    name: 'seedance-1-pro',
    displayName: 'Seedance 1 Pro',
    replicateModel: 'bytedance/seedance-1-pro',
    action: 'video_i2v',
    description: 'ByteDance - премиум качество',
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
        name: 'seed',
        label: 'Seed',
        type: 'number',
      },
    ],
  },

  // 6. Kling v2.1 I2V
  {
    id: 'kling-v2.1-i2v',
    name: 'kling-v2.1',
    displayName: 'Kling v2.1',
    replicateModel: 'kwaivgi/kling-v2.1',
    action: 'video_i2v',
    description: 'Kuaishou - стабильная анимация 1080p',
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

  // 7. Kling v2.0 I2V
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

  // 8. Video-01 Director
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

  // 9. Runway Gen4 Turbo
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
          { value: '21:9', label: '21:9' },
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
        description: 'Макс. 100MB, 30 сек',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Опишите изменения...',
        description: 'make it anime, make it cinematic...',
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
        description: 'Насколько близко к оригиналу',
      },
      {
        name: 'first_frame',
        label: 'Первый кадр',
        type: 'file',
        description: 'Модифицированный первый кадр для направления',
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
        placeholder: 'Опишите желаемый звук...',
        default: '',
        description: 'galloping, rain, birds chirping...',
      },
      {
        name: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'textarea',
        placeholder: 'Что исключить...',
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

  // 5. Autocaption
  {
    id: 'autocaption',
    name: 'autocaption',
    displayName: 'Autocaption',
    replicateModel: 'fictions-ai/autocaption',
    action: 'video_edit',
    description: 'Добавить субтитры к видео',
    settings: [
      {
        name: 'video_file',
        label: 'Видео',
        type: 'file',
        required: true,
      },
      {
        name: 'font',
        label: 'Шрифт',
        type: 'select',
        default: 'Poppins/Poppins-ExtraBold.ttf',
        options: [
          { value: 'Poppins/Poppins-ExtraBold.ttf', label: 'Poppins ExtraBold' },
          { value: 'Poppins/Poppins-Bold.ttf', label: 'Poppins Bold' },
          { value: 'Arial.ttf', label: 'Arial' },
        ],
      },
      {
        name: 'color',
        label: 'Цвет текста',
        type: 'text',
        default: 'white',
        description: 'white, yellow, #FF0000',
      },
      {
        name: 'highlight_color',
        label: 'Цвет выделения',
        type: 'text',
        default: 'yellow',
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
        name: 'fontsize',
        label: 'Размер шрифта',
        type: 'number',
        default: 7,
        description: '% от высоты видео',
      },
      {
        name: 'opacity',
        label: 'Прозрачность',
        type: 'slider',
        default: 0,
        min: 0,
        max: 1,
        step: 0.1,
        description: '0 = непрозрачный',
      },
    ],
  },

  // 6. Runway Gen4 Aleph
  {
    id: 'gen4-aleph',
    name: 'gen4-aleph',
    displayName: 'Runway Gen4 Aleph',
    replicateModel: 'runwayml/gen4-aleph',
    action: 'video_edit',
    description: 'Runway - продвинутое редактирование',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
        description: 'Первый кадр',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите видео...',
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
        name: 'seed',
        label: 'Seed',
        type: 'number',
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
 * Все модели
 */
export const ALL_MODELS: Model[] = [
  ...CREATE_MODELS,
  ...UPSCALE_MODELS,
  ...EDIT_MODELS,
  ...REMOVE_BG_MODELS,
  ...VIDEO_CREATE_MODELS,
  ...VIDEO_I2V_MODELS,
  ...VIDEO_EDIT_MODELS,
  ...VIDEO_UPSCALE_MODELS,
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
    case 'video_create':
      return VIDEO_CREATE_MODELS;
    case 'video_i2v':
      return VIDEO_I2V_MODELS;
    case 'video_edit':
      return VIDEO_EDIT_MODELS;
    case 'video_upscale':
      return VIDEO_UPSCALE_MODELS;
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
    video_create: 'Создать видео',
    video_i2v: 'Картинка → Видео',
    video_edit: 'Редактировать видео',
    video_upscale: 'Улучшить видео',
  };
  return labels[action];
}
