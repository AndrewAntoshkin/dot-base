/**
 * ПОЛНАЯ конфигурация моделей с всеми параметрами
 * На основе официальной документации Replicate API
 * Обновлено: 2025-11-26
 */

export type ActionType = 'create' | 'edit' | 'upscale' | 'remove_bg';

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
 * СОЗДАТЬ ИЗОБРАЖЕНИЕ - 12 моделей
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
    runs: '725.6K runs',
    description: 'Google - редактирование и генерация',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения...',
      },
      {
        name: 'image_input',
        label: 'Изображения для редактирования',
        type: 'file_array',
        required: true,
        description: 'До 14 изображений',
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
          { value: 'match_input_image', label: 'Как входное' },
          { value: '1:1', label: '1:1' },
          { value: '16:9', label: '16:9' },
          { value: '9:16', label: '9:16' },
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
 * Все модели
 */
export const ALL_MODELS: Model[] = [
  ...CREATE_MODELS,
  ...UPSCALE_MODELS,
  ...EDIT_MODELS,
  ...REMOVE_BG_MODELS,
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
  };
  return labels[action];
}
