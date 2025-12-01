/**
 * Лёгкая версия конфигурации моделей для быстрой загрузки на клиенте
 * Содержит только данные необходимые для отображения в селекторах
 * Полная конфигурация загружается по требованию через getModelById
 * 
 * ~140 строк вместо 3800+ в полной версии - критично для мобильного интернета!
 */

export type ActionType = 
  | 'create' | 'edit' | 'upscale' | 'remove_bg'  // Image
  | 'video_create' | 'video_i2v' | 'video_edit' | 'video_upscale'  // Video
  | 'analyze_describe' | 'analyze_ocr' | 'analyze_prompt';  // Analyze

export interface ModelLite {
  id: string;
  displayName: string;
  description?: string;
  action: ActionType;
}

// Лёгкие данные для селектора моделей - только id, название и описание
export const CREATE_MODELS_LITE: ModelLite[] = [
  { id: 'flux-2-pro', displayName: 'FLUX 2 Pro', description: 'Генерация и редактирование с поддержкой до 8 референсных изображений', action: 'create' },
  { id: 'seedream-4', displayName: 'SeeDream 4', description: 'ByteDance - генерация и редактирование до 4K разрешения', action: 'create' },
  { id: 'nano-banana-pro', displayName: 'Nano Banana Pro', description: 'Google Gemini 2.5 - генерация и редактирование', action: 'create' },
  { id: 'ideogram-v3-turbo', displayName: 'Ideogram V3 Turbo', description: 'Быстрая генерация с поддержкой стилей и inpainting', action: 'create' },
  { id: 'flux-1.1-pro', displayName: 'FLUX 1.1 Pro', description: 'Быстрая генерация с отличным качеством', action: 'create' },
  { id: 'imagen-4-ultra', displayName: 'Imagen 4 Ultra', description: 'Google - максимальное качество', action: 'create' },
  { id: 'flux-kontext-max', displayName: 'FLUX Kontext Max', description: 'Премиум редактирование и генерация текста', action: 'create' },
  { id: 'recraft-v3-svg', displayName: 'Recraft V3 SVG', description: 'Генерация SVG - логотипы, иконки', action: 'create' },
  { id: 'recraft-v3', displayName: 'Recraft V3', description: 'SOTA генерация с контролем стиля', action: 'create' },
  { id: 'sd-3.5-large', displayName: 'SD 3.5 Large', description: 'Высокое разрешение с поддержкой img2img', action: 'create' },
  { id: 'minimax-image-01', displayName: 'MiniMax Image-01', description: 'Дешевая генерация с поддержкой референса лица', action: 'create' },
  { id: 'reve-create', displayName: 'Reve Create', description: 'Генерация от Reve', action: 'create' },
  { id: 'z-image-turbo', displayName: 'Z-Image Turbo', description: 'Супербыстрая генерация (8 шагов)', action: 'create' },
  { id: 'gen4-image-turbo', displayName: 'Gen4 Image Turbo', description: 'Runway - быстрая генерация с референсами', action: 'create' },
];

export const EDIT_MODELS_LITE: ModelLite[] = [
  { id: 'nano-banana-pro-edit', displayName: 'Nano Banana Pro', description: 'Google Gemini 3 Pro - редактирование и генерация с текстом', action: 'edit' },
  { id: 'flux-kontext-max-edit', displayName: 'FLUX Kontext Max', description: 'Премиум редактирование с текстом', action: 'edit' },
  { id: 'seedream-4-edit', displayName: 'SeeDream 4', description: 'ByteDance - точное редактирование до 4K', action: 'edit' },
  { id: 'bria-eraser', displayName: 'Bria Eraser', description: 'SOTA удаление объектов', action: 'edit' },
  { id: 'bria-genfill', displayName: 'Bria GenFill', description: 'Добавление объектов и трансформация', action: 'edit' },
  { id: 'flux-kontext-fast', displayName: 'FLUX Kontext Fast', description: 'Ультрабыстрое редактирование', action: 'edit' },
  { id: 'bria-expand', displayName: 'Bria Expand', description: 'Расширение границ изображения', action: 'edit' },
  { id: 'reve-edit', displayName: 'Reve Edit', description: 'Редактирование от Reve', action: 'edit' },
  { id: 'flux-fill-pro', displayName: 'FLUX Fill Pro', description: '🔥 Zoom Out / Outpainting - расширение кадра как в Midjourney', action: 'edit' },
  { id: 'luma-reframe-image', displayName: 'Luma Reframe', description: '🖼️ Zoom Out - изменение aspect ratio с AI (не обрезка!)', action: 'edit' },
];

export const UPSCALE_MODELS_LITE: ModelLite[] = [
  { id: 'google-upscaler', displayName: 'Google Upscaler', description: 'Google - увеличение 2x или 4x', action: 'upscale' },
  { id: 'recraft-crisp-upscale', displayName: 'Recraft Crisp', description: 'Четкое увеличение для веб и печати', action: 'upscale' },
  { id: 'crystal-upscaler', displayName: 'Crystal Upscaler', description: 'Высокоточный для портретов и продуктов', action: 'upscale' },
  { id: 'real-esrgan', displayName: 'Real-ESRGAN', description: 'Популярный универсальный апскейлер', action: 'upscale' },
  { id: 'magic-image-refiner', displayName: 'Magic Image Refiner', description: 'Улучшение качества и inpainting', action: 'upscale' },
  { id: 'clarity-upscaler', displayName: 'Clarity Upscaler', description: 'Продвинутый апскейлер с множеством настроек', action: 'upscale' },
];

export const REMOVE_BG_MODELS_LITE: ModelLite[] = [
  { id: '851-background-remover', displayName: 'Background Remover', description: 'Быстрое удаление фона с опциями', action: 'remove_bg' },
  { id: 'lucataco-remove-bg', displayName: 'Remove BG', description: 'Простое удаление фона', action: 'remove_bg' },
  { id: 'bria-remove-background', displayName: 'Bria Remove BG', description: 'Bria AI - профессиональное удаление', action: 'remove_bg' },
  { id: 'birefnet', displayName: 'BiRefNet', description: 'Точная сегментация для сложных объектов', action: 'remove_bg' },
];

export const VIDEO_CREATE_MODELS_LITE: ModelLite[] = [
  { id: 'veo-3.1-fast', displayName: 'Veo 3.1 Fast', description: 'Google - быстрая генерация видео с аудио', action: 'video_create' },
  { id: 'kling-v2.5-turbo-pro-t2v', displayName: 'Kling v2.5 Turbo Pro', description: 'Kuaishou - высококачественное видео', action: 'video_create' },
  { id: 'seedance-1-pro-t2v', displayName: 'Seedance 1 Pro', description: 'ByteDance - премиум качество до 1080p с last frame', action: 'video_create' },
  { id: 'hailuo-02-t2v', displayName: 'Hailuo 02', description: 'MiniMax - отличная физика, 768p/1080p с last frame', action: 'video_create' },
  { id: 'hailuo-2.3-t2v', displayName: 'Hailuo 2.3', description: 'MiniMax - качественное видео с управлением камерой', action: 'video_create' },
  { id: 'kling-v2.1-master-t2v', displayName: 'Kling v2.1 Master', description: 'Kuaishou - премиум качество 1080p', action: 'video_create' },
  { id: 'wan-2.5-t2v', displayName: 'Wan 2.5 T2V', description: 'Wan - текст в видео высокого качества', action: 'video_create' },
  { id: 'kling-v2.0-t2v', displayName: 'Kling v2.0', description: 'Kuaishou - базовая версия 720p', action: 'video_create' },
];

export const VIDEO_I2V_MODELS_LITE: ModelLite[] = [
  { id: 'kling-v2.5-turbo-pro-i2v', displayName: 'Kling v2.5 Turbo Pro', description: 'Kuaishou - анимация изображения', action: 'video_i2v' },
  { id: 'seedance-1-pro-fast', displayName: 'Seedance 1 Pro Fast', description: 'ByteDance - быстрая анимация до 1080p', action: 'video_i2v' },
  { id: 'wan-2.5-i2v-fast', displayName: 'Wan 2.5 I2V Fast', description: 'Wan - быстрая анимация изображений', action: 'video_i2v' },
  { id: 'hailuo-2.3-fast-i2v', displayName: 'Hailuo 2.3 Fast', description: 'MiniMax - быстрая анимация', action: 'video_i2v' },
  { id: 'seedance-1-pro', displayName: 'Seedance 1 Pro', description: 'ByteDance - премиум качество с last frame', action: 'video_i2v' },
  { id: 'kling-v2.1-i2v', displayName: 'Kling v2.1', description: 'Kuaishou - 720p/1080p с last frame (pro)', action: 'video_i2v' },
  { id: 'hailuo-02-i2v', displayName: 'Hailuo 02', description: 'MiniMax - 768p/1080p с first/last frame', action: 'video_i2v' },
  { id: 'kling-v2.0-i2v', displayName: 'Kling v2.0', description: 'Kuaishou - базовая анимация', action: 'video_i2v' },
  { id: 'video-01-director', displayName: 'Video-01 Director', description: 'MiniMax - управление камерой', action: 'video_i2v' },
  { id: 'gen4-turbo-i2v', displayName: 'Runway Gen4 Turbo', description: 'Runway - премиум анимация', action: 'video_i2v' },
];

export const VIDEO_EDIT_MODELS_LITE: ModelLite[] = [
  { id: 'luma-modify-video', displayName: 'Luma Modify Video', description: 'Luma - стиль и трансформация видео', action: 'video_edit' },
  { id: 'luma-reframe-video', displayName: 'Luma Reframe Video', description: 'Luma - изменение соотношения сторон', action: 'video_edit' },
  { id: 'mmaudio', displayName: 'MMAudio', description: 'Добавить звук к видео с помощью AI', action: 'video_edit' },
  { id: 'video-merge', displayName: 'Video Merge', description: 'Объединить несколько видео', action: 'video_edit' },
  { id: 'autocaption', displayName: 'Autocaption', description: 'Добавить субтитры к видео', action: 'video_edit' },
  { id: 'gen4-aleph', displayName: 'Runway Gen4 Aleph', description: 'Runway - продвинутое редактирование', action: 'video_edit' },
];

export const VIDEO_UPSCALE_MODELS_LITE: ModelLite[] = [
  { id: 'topaz-video-upscale', displayName: 'Topaz Video Upscale', description: 'Topaz Labs - профессиональный апскейл до 4K', action: 'video_upscale' },
];

// Analyze models
export const ANALYZE_DESCRIBE_MODELS_LITE: ModelLite[] = [
  { id: 'moondream2', displayName: 'Moondream 2', description: 'Быстрое описание изображений, VQA', action: 'analyze_describe' },
  { id: 'llava-13b', displayName: 'LLaVa 13B', description: 'Детальные описания с GPT-4 уровнем', action: 'analyze_describe' },
  { id: 'blip-2', displayName: 'BLIP-2', description: 'Универсальные ответы на вопросы', action: 'analyze_describe' },
];

export const ANALYZE_OCR_MODELS_LITE: ModelLite[] = [
  { id: 'deepseek-ocr', displayName: 'DeepSeek OCR', description: '100+ языков, Markdown вывод', action: 'analyze_ocr' },
  { id: 'text-extract-ocr', displayName: 'Text Extract OCR', description: 'Простое извлечение текста', action: 'analyze_ocr' },
];

export const ANALYZE_PROMPT_MODELS_LITE: ModelLite[] = [
  { id: 'clip-interrogator', displayName: 'CLIP Interrogator', description: 'Генерация промпта для Stable Diffusion', action: 'analyze_prompt' },
  { id: 'sdxl-clip-interrogator', displayName: 'SDXL CLIP Interrogator', description: 'Оптимизирован для SDXL моделей', action: 'analyze_prompt' },
  { id: 'img2prompt', displayName: 'Img2Prompt', description: 'Промпт со стилем для SD 1.x', action: 'analyze_prompt' },
];

/**
 * Получить модели по действию (лёгкая версия)
 */
export function getModelsByActionLite(action: ActionType): ModelLite[] {
  switch (action) {
    case 'create':
      return CREATE_MODELS_LITE;
    case 'upscale':
      return UPSCALE_MODELS_LITE;
    case 'edit':
      return EDIT_MODELS_LITE;
    case 'remove_bg':
      return REMOVE_BG_MODELS_LITE;
    case 'video_create':
      return VIDEO_CREATE_MODELS_LITE;
    case 'video_i2v':
      return VIDEO_I2V_MODELS_LITE;
    case 'video_edit':
      return VIDEO_EDIT_MODELS_LITE;
    case 'video_upscale':
      return VIDEO_UPSCALE_MODELS_LITE;
    case 'analyze_describe':
      return ANALYZE_DESCRIBE_MODELS_LITE;
    case 'analyze_ocr':
      return ANALYZE_OCR_MODELS_LITE;
    case 'analyze_prompt':
      return ANALYZE_PROMPT_MODELS_LITE;
    default:
      return [];
  }
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
    analyze_describe: 'Описать изображение',
    analyze_ocr: 'Извлечь текст (OCR)',
    analyze_prompt: 'Получить промпт',
  };
  return labels[action];
}

