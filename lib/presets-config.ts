/**
 * Конфигурация пресетов для I2V моделей
 * Пресеты применяются к промпту или параметрам модели
 */

export interface Preset {
  id: string;
  label: string;
  icon?: string;
  /** Краткое описание для тултипа */
  description?: string;
  /** Для моделей с motion параметром (Higgsfield) */
  motion?: string;
  /** Тег для добавления в промпт (Hailuo) */
  promptTag?: string;
  /** Текст для добавления в промпт (универсальные модели) */
  promptText?: string;
  /** Категория пресета */
  category: 'camera' | 'motion' | 'effect';
}

export interface PresetCategory {
  id: string;
  label: string;
  presets: Preset[];
}

// Пресеты движения камеры для Hailuo (используют теги в промпте)
export const HAILUO_CAMERA_PRESETS: Preset[] = [
  { id: 'pan-left', label: 'Панорама ←', promptTag: '[Pan left]', category: 'camera' },
  { id: 'pan-right', label: 'Панорама →', promptTag: '[Pan right]', category: 'camera' },
  { id: 'push-in', label: 'Наезд', promptTag: '[Push in]', category: 'camera' },
  { id: 'push-out', label: 'Отъезд', promptTag: '[Push out]', category: 'camera' },
  { id: 'zoom-in', label: 'Zoom In', promptTag: '[Zoom in]', category: 'camera' },
  { id: 'zoom-out', label: 'Zoom Out', promptTag: '[Zoom out]', category: 'camera' },
  { id: 'tilt-up', label: 'Наклон ↑', promptTag: '[Tilt up]', category: 'camera' },
  { id: 'tilt-down', label: 'Наклон ↓', promptTag: '[Tilt down]', category: 'camera' },
  { id: 'tracking', label: 'Следящая', promptTag: '[Tracking shot]', category: 'camera' },
];

// Пресеты движения для Higgsfield DoP (используют параметр motion)
// Значения должны совпадать с options в models-config.ts для Higgsfield
export const HIGGSFIELD_MOTION_PRESETS: Preset[] = [
  // Общие стили
  { id: 'general', label: 'Авто', motion: 'general', category: 'motion', description: 'AI сам выберет лучшее движение камеры исходя из содержимого изображения. Подходит когда не уверены что выбрать.' },
  { id: 'cinematic', label: 'Кинематограф', motion: 'cinematic', category: 'motion', description: 'Плавное профессиональное движение камеры как в голливудском кино. Идеально для продуктовых и имиджевых роликов.' },
  { id: 'static', label: 'Статика', motion: 'static', category: 'motion', description: 'Камера остаётся неподвижной, анимируется только объект на изображении. Хорошо для портретов и фокуса на деталях.' },
  { id: 'handheld', label: 'Handheld', motion: 'handheld', category: 'motion', description: 'Лёгкое дрожание камеры как при съёмке с рук. Создаёт эффект реалистичности и присутствия.' },
  // Движения камеры
  { id: 'zoom_in', label: 'Zoom In', motion: 'zoom_in', category: 'motion', description: 'Оптическое приближение к объекту без физического движения камеры. Фокусирует внимание на детали.' },
  { id: 'zoom_out', label: 'Zoom Out', motion: 'zoom_out', category: 'motion', description: 'Оптическое отдаление от объекта. Раскрывает контекст сцены и окружение.' },
  { id: 'dolly_in', label: 'Dolly In', motion: 'dolly_in', category: 'motion', description: 'Камера физически движется к объекту. Создаёт более глубокое погружение чем зум.' },
  { id: 'dolly_out', label: 'Dolly Out', motion: 'dolly_out', category: 'motion', description: 'Камера физически отъезжает от объекта. Эффектное раскрытие сцены.' },
  { id: 'dolly_left', label: 'Dolly Left', motion: 'dolly_left', category: 'motion', description: 'Камера перемещается влево параллельно сцене. Классическое кинематографическое движение.' },
  { id: 'dolly_right', label: 'Dolly Right', motion: 'dolly_right', category: 'motion', description: 'Камера перемещается вправо параллельно сцене. Раскрывает пространство кадра.' },
  { id: 'crane_up', label: 'Crane Up', motion: 'crane_up', category: 'motion', description: 'Камера поднимается вертикально вверх на кране. Эпичное раскрытие масштаба сцены.' },
  { id: 'crane_down', label: 'Crane Down', motion: 'crane_down', category: 'motion', description: 'Камера опускается вертикально вниз. Драматичное приближение к объекту сверху.' },
  { id: 'tilt_up', label: 'Tilt Up', motion: 'tilt_up', category: 'motion', description: 'Камера остаётся на месте но поворачивается вверх. Взгляд от земли к небу.' },
  { id: 'tilt_down', label: 'Tilt Down', motion: 'tilt_down', category: 'motion', description: 'Камера остаётся на месте но поворачивается вниз. Взгляд сверху вниз.' },
  { id: 'arc_left', label: 'Arc Left', motion: 'arc_left', category: 'motion', description: 'Камера движется по дуге вокруг объекта влево. Объект остаётся в центре кадра.' },
  { id: 'arc_right', label: 'Arc Right', motion: 'arc_right', category: 'motion', description: 'Камера движется по дуге вокруг объекта вправо. Показывает объект с разных сторон.' },
  { id: '360_orbit', label: '360° Orbit', motion: '360_orbit', category: 'motion', description: 'Полный круговой облёт камеры вокруг объекта на 360°. Эффектный показ товара со всех сторон.' },
  { id: '3d_rotation', label: '3D Rotation', motion: '3d_rotation', category: 'motion', description: 'Вся сцена поворачивается в 3D пространстве. Создаёт сюрреалистический эффект.' },
  { id: 'crash_zoom_in', label: 'Crash Zoom In', motion: 'crash_zoom_in', category: 'motion', description: 'Очень быстрый резкий наезд камеры для драматического акцента. Используется для шока или внимания.' },
  { id: 'crash_zoom_out', label: 'Crash Zoom Out', motion: 'crash_zoom_out', category: 'motion', description: 'Очень быстрый резкий отъезд камеры. Создаёт эффект неожиданности и масштаба.' },
  { id: 'hyperlapse', label: 'Hyperlapse', motion: 'hyperlapse', category: 'motion', description: 'Ускоренное движение камеры сквозь пространство. Эффект таймлапса с движением.' },
  { id: 'object_pov', label: 'Object POV', motion: 'object_pov', category: 'motion', description: 'Камера показывает вид от первого лица объекта на изображении. Погружение в перспективу.' },
];

// Универсальные пресеты (добавляют текст в промпт)
export const UNIVERSAL_CAMERA_PRESETS: Preset[] = [
  { id: 'zoom-in', label: 'Zoom In', promptText: 'camera slowly zooms in', category: 'camera' },
  { id: 'zoom-out', label: 'Zoom Out', promptText: 'camera slowly zooms out', category: 'camera' },
  { id: 'pan-left', label: 'Pan Left', promptText: 'camera pans left', category: 'camera' },
  { id: 'pan-right', label: 'Pan Right', promptText: 'camera pans right', category: 'camera' },
  { id: 'dolly-in', label: 'Dolly In', promptText: 'camera dollies forward towards subject', category: 'camera' },
  { id: 'orbit', label: 'Orbit', promptText: 'camera orbits around the subject', category: 'camera' },
  { id: 'static', label: 'Static', promptText: 'static camera, subtle movements only', category: 'effect' },
];

// Модели и их поддерживаемые пресеты
export type PresetType = 'higgsfield' | 'hailuo' | 'universal' | 'none';

interface ModelPresetConfig {
  type: PresetType;
  presets: Preset[];
  /** Название параметра для motion (для Higgsfield) */
  motionParam?: string;
}

const MODEL_PRESETS: Record<string, ModelPresetConfig> = {
  // Higgsfield DoP models
  'higgsfield-dop-preview': { type: 'higgsfield', presets: HIGGSFIELD_MOTION_PRESETS, motionParam: 'motion' },
  'higgsfield-dop-standard': { type: 'higgsfield', presets: HIGGSFIELD_MOTION_PRESETS, motionParam: 'motion' },
  'higgsfield-dop-lite': { type: 'higgsfield', presets: HIGGSFIELD_MOTION_PRESETS, motionParam: 'motion' },
  'higgsfield-dop-lite-flf': { type: 'higgsfield', presets: HIGGSFIELD_MOTION_PRESETS, motionParam: 'motion' },
  
  // Hailuo/MiniMax models (support camera tags)
  'hailuo-2.3-fast-i2v': { type: 'hailuo', presets: HAILUO_CAMERA_PRESETS },
  'hailuo-02-i2v': { type: 'hailuo', presets: HAILUO_CAMERA_PRESETS },
  'video-01-director': { type: 'hailuo', presets: HAILUO_CAMERA_PRESETS },
  
  // Universal models (add text to prompt)
  'kling-v2.5-turbo-pro-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'kling-1.0-i2v-fal': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'kling-v2.1-master-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'kling-v2.1-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'kling-v2.0-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'kling-2.6-motion-control-fal': { type: 'none', presets: [] }, // Has its own motion control
  'veo-3.1-fast-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'seedance-1-pro-fast': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'seedance-1-pro': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'seedance-1.5-pro-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'wan-2.5-i2v-fast': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
  'gen4-turbo-i2v': { type: 'universal', presets: UNIVERSAL_CAMERA_PRESETS },
};

/**
 * Получить конфигурацию пресетов для модели
 */
export function getPresetsForModel(modelId: string): ModelPresetConfig | null {
  return MODEL_PRESETS[modelId] || null;
}

/**
 * Проверить, поддерживает ли модель пресеты
 */
export function modelSupportsPresets(modelId: string): boolean {
  const config = MODEL_PRESETS[modelId];
  return config !== undefined && config.type !== 'none' && config.presets.length > 0;
}

/**
 * Применить пресет к данным формы
 * @returns Обновлённые данные формы
 */
export function applyPreset(
  modelId: string,
  preset: Preset,
  currentFormData: Record<string, any>
): Record<string, any> {
  const config = getPresetsForModel(modelId);
  if (!config) return currentFormData;

  const updatedData = { ...currentFormData };

  switch (config.type) {
    case 'higgsfield':
      // Устанавливаем motion параметр
      if (preset.motion && config.motionParam) {
        updatedData[config.motionParam] = preset.motion;
      }
      break;

    case 'hailuo':
      // Добавляем тег в начало промпта
      if (preset.promptTag) {
        const currentPrompt = updatedData.prompt || '';
        // Проверяем, нет ли уже этого тега
        if (!currentPrompt.includes(preset.promptTag)) {
          // Удаляем другие camera теги и добавляем новый
          const cleanedPrompt = currentPrompt
            .replace(/\[(Pan left|Pan right|Push in|Push out|Zoom in|Zoom out|Tilt up|Tilt down|Tracking shot)\]/gi, '')
            .trim();
          updatedData.prompt = `${preset.promptTag} ${cleanedPrompt}`.trim();
        }
      }
      break;

    case 'universal':
      // Добавляем текст в промпт
      if (preset.promptText) {
        const currentPrompt = updatedData.prompt || '';
        // Добавляем в начало если ещё нет
        if (!currentPrompt.toLowerCase().includes(preset.promptText.toLowerCase())) {
          updatedData.prompt = `${preset.promptText}, ${currentPrompt}`.replace(/,\s*$/, '').trim();
        }
      }
      break;
  }

  return updatedData;
}

/**
 * Получить категории пресетов с группировкой
 */
export function getPresetCategories(modelId: string): PresetCategory[] {
  const config = getPresetsForModel(modelId);
  if (!config || config.presets.length === 0) return [];

  const categories: Record<string, PresetCategory> = {};

  for (const preset of config.presets) {
    const catId = preset.category;
    if (!categories[catId]) {
      categories[catId] = {
        id: catId,
        label: catId === 'camera' ? 'Камера' : catId === 'motion' ? 'Движение' : 'Эффекты',
        presets: [],
      };
    }
    categories[catId].presets.push(preset);
  }

  // Возвращаем в порядке: camera, motion, effect
  const order = ['camera', 'motion', 'effect'];
  return order.map(id => categories[id]).filter(Boolean);
}
