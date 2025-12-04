/**
 * ОБНОВЛЕННАЯ конфигурация моделей с полными параметрами
 * На основе официальной документации Replicate API
 */

export type ActionType = 'create' | 'edit' | 'upscale' | 'remove_bg';

export type SettingType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'slider' 
  | 'select' 
  | 'checkbox' 
  | 'file';

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
}

/**
 * СОЗДАТЬ ИЗОБРАЖЕНИЕ - 8 моделей (ОБНОВЛЕНО)
 */
export const CREATE_MODELS: Model[] = [
  {
    id: 'flux-schnell',
    name: 'flux-schnell',
    displayName: 'FLUX Schnell',
    replicateModel: 'black-forest-labs/flux-schnell',
    action: 'create',
    runs: '552M runs',
    description: 'Самая быстрая модель FLUX (1-4 шага)',
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
          { value: '21:9', label: '21:9' },
          { value: '9:21', label: '9:21' },
        ],
      },
      {
        name: 'num_outputs',
        label: 'Количество',
        type: 'number',
        default: 1,
        min: 1,
        max: 4,
      },
      {
        name: 'megapixels',
        label: 'Мегапиксели',
        type: 'select',
        default: '1',
        options: [
          { value: '0.25', label: '0.25 MP (быстро)' },
          { value: '1', label: '1 MP (стандарт)' },
        ],
        description: 'Приблизительное разрешение',
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 4,
        min: 1,
        max: 4,
        description: '4 = лучшее качество',
      },
      {
        name: 'go_fast',
        label: 'Быстрый режим (FP8)',
        type: 'checkbox',
        default: true,
        description: 'Оптимизация скорости',
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
        name: 'disable_safety_checker',
        label: 'Отключить safety checker',
        type: 'checkbox',
        default: false,
      },
    ],
  },
  {
    id: 'sdxl-lightning-4step',
    name: 'sdxl-lightning-4step',
    displayName: 'SDXL Lightning',
    replicateModel: 'bytedance/sdxl-lightning-4step',
    action: 'create',
    runs: '1B runs',
    description: 'ByteDance - генерация за 4 шага',
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
        default: 'worst quality, low quality',
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 1280,
        step: 64,
        description: '1024 или 1280 рекомендуется',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 1024,
        min: 256,
        max: 1280,
        step: 64,
      },
      {
        name: 'num_outputs',
        label: 'Количество',
        type: 'number',
        default: 1,
        min: 1,
        max: 4,
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 4,
        min: 1,
        max: 10,
        description: '4 для лучшего результата',
      },
      {
        name: 'guidance_scale',
        label: 'Guidance',
        type: 'slider',
        default: 0,
        min: 0,
        max: 50,
        step: 0.5,
      },
      {
        name: 'scheduler',
        label: 'Scheduler',
        type: 'select',
        default: 'K_EULER',
        options: [
          { value: 'K_EULER', label: 'K_EULER' },
          { value: 'DPMSolverMultistep', label: 'DPM Solver' },
        ],
      },
      {
        name: 'disable_safety_checker',
        label: 'Отключить safety checker',
        type: 'checkbox',
        default: false,
      },
    ],
  },
  {
    id: 'stable-diffusion',
    name: 'stable-diffusion',
    displayName: 'Stable Diffusion',
    replicateModel: 'stability-ai/stable-diffusion',
    action: 'create',
    runs: '110M runs',
    description: 'Классика генерации изображений',
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
      },
      {
        name: 'width',
        label: 'Ширина',
        type: 'slider',
        default: 768,
        min: 64,
        max: 1024,
        step: 64,
        description: 'Кратно 64',
      },
      {
        name: 'height',
        label: 'Высота',
        type: 'slider',
        default: 768,
        min: 64,
        max: 1024,
        step: 64,
      },
      {
        name: 'num_outputs',
        label: 'Количество',
        type: 'number',
        default: 1,
        min: 1,
        max: 4,
      },
      {
        name: 'num_inference_steps',
        label: 'Шаги',
        type: 'slider',
        default: 50,
        min: 1,
        max: 500,
      },
      {
        name: 'guidance_scale',
        label: 'Guidance Scale',
        type: 'slider',
        default: 7.5,
        min: 1,
        max: 20,
        step: 0.1,
      },
      {
        name: 'scheduler',
        label: 'Scheduler',
        type: 'select',
        default: 'DPMSolverMultistep',
        options: [
          { value: 'DPMSolverMultistep', label: 'DPM Solver' },
          { value: 'K_EULER', label: 'K_EULER' },
          { value: 'DDIM', label: 'DDIM' },
          { value: 'KLMS', label: 'KLMS' },
        ],
      },
    ],
  },
  {
    id: 'nano-banana',
    name: 'nano-banana',
    displayName: 'Nano Banana',
    replicateModel: 'google/nano-banana',
    action: 'create',
    runs: '43.8M runs',
    description: 'Google Gemini 2.5 - генерация и редактирование',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение или изменения...',
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
  {
    id: 'seedream-4',
    name: 'seedream-4',
    displayName: 'SeeDream 4',
    replicateModel: 'bytedance/seedream-4',
    action: 'create',
    runs: '13.8M runs',
    description: 'ByteDance - до 4K разрешения',
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
        name: 'num_outputs',
        label: 'Количество',
        type: 'number',
        default: 1,
        min: 1,
        max: 4,
      },
    ],
  },
  {
    id: 'recraft-v3',
    name: 'recraft-v3',
    displayName: 'Recraft V3',
    replicateModel: 'recraft-ai/recraft-v3',
    action: 'create',
    runs: '6.9M runs',
    description: 'Контроль стиля',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изображение...',
      },
      {
        name: 'style',
        label: 'Стиль',
        type: 'select',
        default: 'realistic_image',
        options: [
          { value: 'realistic_image', label: 'Реалистичное изображение' },
          { value: 'digital_illustration', label: 'Цифровая иллюстрация' },
          { value: 'vector_illustration', label: 'Векторная иллюстрация' },
        ],
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
        ],
      },
    ],
  },
  {
    id: 'imagen-4',
    name: 'imagen-4',
    displayName: 'Imagen 4',
    replicateModel: 'google/imagen-4',
    action: 'create',
    runs: '2.1M runs',
    description: 'Google - высокое качество',
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
          { value: '3:4', label: '3:4' },
          { value: '4:3', label: '4:3' },
          { value: '9:16', label: '9:16' },
          { value: '16:9', label: '16:9' },
        ],
      },
      {
        name: 'output_format',
        label: 'Формат',
        type: 'select',
        default: 'jpeg',
        options: [
          { value: 'jpeg', label: 'JPEG' },
          { value: 'png', label: 'PNG' },
        ],
      },
    ],
  },
  {
    id: 'ideogram-v3-turbo',
    name: 'ideogram-v3-turbo',
    displayName: 'Ideogram V3 Turbo',
    replicateModel: 'ideogram-ai/ideogram-v3-turbo',
    action: 'create',
    runs: '4.5M runs',
    description: 'Быстрая версия Ideogram V3',
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
    ],
  },
];

/**
 * УЛУЧШИТЬ КАЧЕСТВО - 3 модели (ОБНОВЛЕНО)
 */
export const UPSCALE_MODELS: Model[] = [
  {
    id: 'real-esrgan',
    name: 'real-esrgan',
    displayName: 'Real-ESRGAN',
    replicateModel: 'nightmareai/real-esrgan',
    action: 'upscale',
    runs: '78.6M runs',
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
        description: 'Фактор увеличения (2 или 4 рекомендуется)',
      },
      {
        name: 'face_enhance',
        label: 'Улучшение лиц (GFPGAN)',
        type: 'checkbox',
        default: false,
        description: 'Запустить улучшение лиц',
      },
    ],
  },
  {
    id: 'clarity-upscaler',
    name: 'clarity-upscaler',
    displayName: 'Clarity Upscaler',
    replicateModel: 'philz1337x/clarity-upscaler',
    action: 'upscale',
    runs: '193K runs',
    description: 'Высокоточный для портретов',
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
        type: 'number',
        default: 2,
        min: 1,
        max: 4,
      },
      {
        name: 'creativity',
        label: 'Креативность',
        type: 'slider',
        default: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Баланс: детали vs улучшение',
      },
      {
        name: 'resemblance',
        label: 'Сходство',
        type: 'slider',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Насколько сохранять оригинал',
      },
      {
        name: 'tiling_width',
        label: 'Ширина тайла',
        type: 'number',
        default: 112,
        min: 16,
        max: 200,
        description: 'Для больших изображений',
      },
      {
        name: 'tiling_height',
        label: 'Высота тайла',
        type: 'number',
        default: 144,
        min: 16,
        max: 200,
      },
    ],
  },
  {
    id: 'recraft-crisp-upscale',
    name: 'recraft-crisp-upscale',
    displayName: 'Recraft Crisp',
    replicateModel: 'recraft-ai/recraft-crisp-upscale',
    action: 'upscale',
    runs: '948K runs',
    description: 'Четкое увеличение',
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
        type: 'select',
        default: '2',
        options: [
          { value: '2', label: '2x' },
          { value: '4', label: '4x' },
        ],
      },
    ],
  },
];

/**
 * РЕДАКТИРОВАТЬ - 5 моделей
 */
export const EDIT_MODELS: Model[] = [
  {
    id: 'nano-banana-edit',
    name: 'nano-banana',
    displayName: 'Nano Banana',
    replicateModel: 'google/nano-banana',
    action: 'edit',
    runs: '43.8M runs',
    description: 'Google - редактирование и генерация',
    settings: [
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Опишите изменения или что создать...',
      },
      {
        name: 'image_input',
        label: 'Изображение (опционально)',
        type: 'file',
        description: 'Для редактирования существующего изображения',
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
  {
    id: 'seedream-4-edit',
    name: 'seedream-4',
    displayName: 'SeeDream 4',
    replicateModel: 'bytedance/seedream-4',
    action: 'edit',
    runs: '13.8M runs',
    description: 'Точное редактирование до 4K',
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
        placeholder: 'Опишите изменения одним предложением...',
      },
    ],
  },
  {
    id: 'flux-kontext-pro',
    name: 'flux-kontext-pro',
    displayName: 'FLUX Kontext Pro',
    replicateModel: 'black-forest-labs/flux-kontext-pro',
    action: 'edit',
    runs: '34M runs',
    description: 'Контекстное редактирование',
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
        placeholder: 'Опишите изменения...',
      },
    ],
  },
  {
    id: 'multi-image-kontext-pro',
    name: 'multi-image-kontext-pro',
    displayName: 'Multi-Image Kontext',
    replicateModel: 'flux-kontext-apps/multi-image-kontext-pro',
    action: 'edit',
    runs: '1.1M runs',
    description: 'Редактирование нескольких изображений',
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
        placeholder: 'Опишите изменения...',
      },
    ],
  },
  {
    id: 'flux-fill-pro',
    name: 'flux-fill-pro',
    displayName: 'FLUX Fill Pro',
    replicateModel: 'black-forest-labs/flux-fill-pro',
    action: 'edit',
    runs: '3.2M runs',
    description: 'Inpainting и заполнение',
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
        description: 'Область для редактирования',
      },
      {
        name: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        required: true,
        placeholder: 'Что добавить/изменить...',
      },
    ],
  },
];

/**
 * УДАЛИТЬ ФОН - 3 модели
 */
export const REMOVE_BG_MODELS: Model[] = [
  {
    id: 'background-remover',
    name: 'background-remover',
    displayName: 'Background Remover',
    replicateModel: '851-labs/background-remover',
    action: 'remove_bg',
    runs: '10.2M runs',
    description: 'Быстрое удаление фона',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },
  {
    id: 'birefnet',
    name: 'birefnet',
    displayName: 'BiRefNet',
    replicateModel: 'men1scus/birefnet',
    action: 'remove_bg',
    runs: '3.8M runs',
    description: 'Точное удаление фона',
    settings: [
      {
        name: 'image',
        label: 'Изображение',
        type: 'file',
        required: true,
      },
    ],
  },
  {
    id: 'remove-background',
    name: 'remove-background',
    displayName: 'Remove Background',
    replicateModel: 'bria/remove-background',
    action: 'remove_bg',
    runs: '136K runs',
    description: 'Профессиональное удаление',
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





