/**
 * Ограничения моделей из документации Replicate
 * Используются для валидации входных данных и показа понятных ошибок пользователям
 * Обновлено: 2025-11-28
 */

export interface VideoLimits {
  maxDurationSec: number;
  maxFileSizeMB: number;
  /** Ограничения длительности по разрешению */
  resolutionDurationLimits?: {
    [resolution: string]: number; // max seconds for this resolution
  };
  /** Поддерживаемые разрешения */
  supportedResolutions?: string[];
  /** Поддерживаемые aspect ratios */
  supportedAspectRatios?: string[];
  /** Требуется изображение (только I2V) */
  requiresImage?: boolean;
  /** Выходное разрешение */
  outputResolution?: string;
}

export interface ModelLimits {
  modelId: string;
  video?: VideoLimits;
  image?: {
    maxFileSizeMB: number;
    supportedFormats?: string[];
  };
}

/**
 * Ограничения для видео моделей
 */
export const VIDEO_MODEL_LIMITS: Record<string, VideoLimits> = {
  // === VIDEO EDIT ===
  'luma-modify-video': {
    maxDurationSec: 30,
    maxFileSizeMB: 100,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
  },
  'luma-reframe-video': {
    maxDurationSec: 30,
    maxFileSizeMB: 100,
    outputResolution: '720p',
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
  },
  'mmaudio': {
    maxDurationSec: 60, // видео для добавления звука
    maxFileSizeMB: 100,
  },

  // === VIDEO CREATE (T2V) ===
  'veo-3.1-fast': {
    maxDurationSec: 8,
    maxFileSizeMB: 100,
    supportedResolutions: ['720p', '1080p'],
    supportedAspectRatios: ['16:9', '9:16'],
  },
  'kling-v2.5-turbo-pro-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
  },
  'hailuo-2.3-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    resolutionDurationLimits: {
      '768p': 10,
      '1080p': 6, // 1080p only supports 6 seconds!
    },
    supportedResolutions: ['768p', '1080p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
  },
  'hailuo-02-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    resolutionDurationLimits: {
      '512p': 10,
      '768p': 10,
      '1080p': 6, // 1080p only supports 6 seconds!
    },
    supportedResolutions: ['512p', '768p', '1080p'],
  },
  'kling-v2.1-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
  },
  'kling-v2.0-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
  },
  'seedance-1-pro-t2v': {
    maxDurationSec: 12,
    maxFileSizeMB: 100,
    supportedResolutions: ['480p', '720p', '1080p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'],
  },
  'wan-2.5-t2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    supportedResolutions: ['720p', '1080p'],
  },

  // === VIDEO I2V (Image-to-Video) ===
  'kling-v2.5-turbo-pro-i2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    requiresImage: true,
  },
  'hailuo-2.3-fast-i2v': {
    maxDurationSec: 6, // Fast версия только 6 сек
    maxFileSizeMB: 100,
    requiresImage: true, // ВАЖНО: только Image-to-Video!
    resolutionDurationLimits: {
      '768p': 10,
      '1080p': 6,
    },
  },
  'hailuo-02-i2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    resolutionDurationLimits: {
      '512p': 10,
      '768p': 10,
      '1080p': 6,
    },
    supportedResolutions: ['512p', '768p', '1080p'],
  },
  'gen4-turbo-i2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    requiresImage: true,
    outputResolution: '720p',
    supportedAspectRatios: ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
  },
  'seedance-1-pro': {
    maxDurationSec: 12,
    maxFileSizeMB: 100,
    supportedResolutions: ['480p', '720p', '1080p'],
  },
  'seedance-1-pro-fast': {
    maxDurationSec: 12,
    maxFileSizeMB: 100,
    supportedResolutions: ['480p', '720p', '1080p'],
  },
  'wan-2.5-i2v-fast': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    requiresImage: true,
    supportedResolutions: ['720p', '1080p'],
  },
  'kling-v2.1-i2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    requiresImage: true,
  },
  'kling-v2.0-i2v': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
    requiresImage: true,
  },
  'video-01-director': {
    maxDurationSec: 10,
    maxFileSizeMB: 100,
  },

  // === VIDEO UPSCALE ===
  'topaz-video-upscale': {
    maxDurationSec: 300, // 5 минут
    maxFileSizeMB: 500, // большие файлы для апскейла
    supportedResolutions: ['720p', '1080p', '4k'],
  },
};

/**
 * Получить ограничения модели по ID
 */
export function getModelLimits(modelId: string): VideoLimits | undefined {
  return VIDEO_MODEL_LIMITS[modelId];
}

/**
 * Валидация видео файла для модели
 * @returns null если валидно, строка с ошибкой если нет
 */
export function validateVideoForModel(
  modelId: string,
  durationSec: number,
  fileSizeMB: number,
  resolution?: string
): string | null {
  const limits = VIDEO_MODEL_LIMITS[modelId];
  if (!limits) return null; // Нет ограничений для этой модели

  // Проверка размера файла
  if (fileSizeMB > limits.maxFileSizeMB) {
    return `Файл слишком большой: ${fileSizeMB.toFixed(1)} МБ. Максимум: ${limits.maxFileSizeMB} МБ`;
  }

  // Проверка длительности с учетом разрешения
  let maxDuration = limits.maxDurationSec;
  if (resolution && limits.resolutionDurationLimits) {
    const resLimit = limits.resolutionDurationLimits[resolution];
    if (resLimit !== undefined) {
      maxDuration = resLimit;
    }
  }

  if (durationSec > maxDuration) {
    const resNote = resolution && limits.resolutionDurationLimits?.[resolution] 
      ? ` для разрешения ${resolution}` 
      : '';
    return `Видео слишком длинное: ${Math.round(durationSec)} сек. Максимум${resNote}: ${maxDuration} сек`;
  }

  return null;
}

/**
 * Проверка требования изображения для I2V модели
 */
export function modelRequiresImage(modelId: string): boolean {
  const limits = VIDEO_MODEL_LIMITS[modelId];
  return limits?.requiresImage ?? false;
}

/**
 * Получить максимальную длительность для модели и разрешения
 */
export function getMaxDuration(modelId: string, resolution?: string): number {
  const limits = VIDEO_MODEL_LIMITS[modelId];
  if (!limits) return 30; // default

  if (resolution && limits.resolutionDurationLimits?.[resolution]) {
    return limits.resolutionDurationLimits[resolution];
  }

  return limits.maxDurationSec;
}

/**
 * Сообщения об ошибках для пользователей (без упоминания Replicate)
 */
export const ERROR_MESSAGES = {
  VIDEO_TOO_LONG: (duration: number, max: number, resolution?: string) => 
    `Видео слишком длинное (${Math.round(duration)} сек). ` +
    `Максимальная длительность${resolution ? ` для ${resolution}` : ''}: ${max} сек. ` +
    `Обрежьте видео и попробуйте снова.`,
  
  VIDEO_TOO_LARGE: (sizeMB: number, maxMB: number) =>
    `Файл слишком большой (${sizeMB.toFixed(1)} МБ). ` +
    `Максимальный размер: ${maxMB} МБ. ` +
    `Сожмите видео или уменьшите разрешение.`,
  
  IMAGE_REQUIRED: (modelName: string) =>
    `Модель "${modelName}" требует загрузки изображения. ` +
    `Это модель Image-to-Video — добавьте изображение как первый кадр.`,
  
  RESOLUTION_DURATION_MISMATCH: (resolution: string, maxDuration: number) =>
    `Для разрешения ${resolution} максимальная длительность ${maxDuration} сек. ` +
    `Выберите меньшее разрешение для более длинного видео или сократите длительность.`,
  
  UNSUPPORTED_ASPECT_RATIO: (ratio: string, supported: string[]) =>
    `Соотношение сторон ${ratio} не поддерживается. ` +
    `Доступные варианты: ${supported.join(', ')}.`,
  
  INVALID_FORMAT: (format: string) =>
    `Формат файла "${format}" не поддерживается. ` +
    `Используйте MP4, WebM или MOV для видео, JPG/PNG/WebP для изображений.`,
};

