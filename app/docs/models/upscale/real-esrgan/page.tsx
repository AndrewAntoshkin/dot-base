'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function RealESRGANPage() {
  return (
    <ModelPageTemplate
      name="Real-ESRGAN"
      familyName="Upscale"
      familyHref="/docs/models/upscale"
      shortDescription="Классический AI-апскейлер. Быстрое и качественное увеличение разрешения."
      description={`Real-ESRGAN — проверенная временем модель увеличения разрешения изображений. Один из первых и до сих пор один из лучших AI-апскейлеров.

Модель использует Enhanced Super-Resolution GAN (ESRGAN) с улучшениями для работы с реальными изображениями. Хорошо справляется с различными типами контента.

Быстрая и надёжная — отличный выбор для базового апскейла без лишних экспериментов.`}
      specs={[
        { label: 'Тип', value: 'Image Upscale' },
        { label: 'Архитектура', value: 'ESRGAN' },
        { label: 'Максимальное увеличение', value: 'До 4x' },
        { label: 'Время обработки', value: '5-15 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Коэффициенты', value: '2x, 4x' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Без промпта',
          prompt: '(Модель не требует промпта — работает автоматически)',
        },
      ]}
      details={`Real-ESRGAN не требует промпта — модель автоматически определяет что нужно улучшить.

Хорошо работает с:
- Аниме и иллюстрациями
- Фотографиями
- Скриншотами игр
- Старыми изображениями низкого качества

Для более агрессивного улучшения с добавлением деталей используйте Crystal или Magic Image Refiner.`}
      idealFor={[
        'Базовое увеличение разрешения',
        'Аниме и иллюстрации',
        'Массовая обработка',
        'Скриншоты',
        'Быстрый апскейл',
      ]}
      tip="Для аниме контента Real-ESRGAN часто даёт лучшие результаты чем более новые модели."
      actionHref="/"
    />
  );
}

