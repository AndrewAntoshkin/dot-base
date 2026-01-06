'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function MagicRefinerPage() {
  return (
    <ModelPageTemplate
      name="Magic Image Refiner"
      familyName="Upscale"
      familyHref="/docs/models/upscale"
      shortDescription="Комбо апскейл + улучшение. Максимальное качество с генерацией деталей."
      description={`Magic Image Refiner — продвинутая модель, объединяющая апскейл с генеративным улучшением. Не просто увеличивает, а переосмысливает изображение в высоком разрешении.

Модель использует диффузию для добавления реалистичных деталей: текстуры материалов, освещение, атмосфера — всё становится богаче и детальнее.

Лучший выбор когда нужно максимальное качество и "вау-эффект" от улучшения.`}
      specs={[
        { label: 'Тип', value: 'Image Upscale + Refine' },
        { label: 'Технология', value: 'Diffusion-based' },
        { label: 'Максимальное увеличение', value: 'До 4x' },
        { label: 'Время обработки', value: '20-60 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Выходное разрешение', value: 'До 8192 × 8192 px' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Фото',
          prompt: 'Ultra detailed photograph, natural skin texture, sharp eyes, professional quality',
        },
        {
          title: 'Арт',
          prompt: 'Highly detailed digital art, intricate textures, professional illustration',
        },
        {
          title: 'Продукт',
          prompt: 'Premium product photography, detailed materials, studio quality',
        },
      ]}
      details={`Magic Image Refiner агрессивно добавляет детали используя AI-генерацию. Результат может немного отличаться от оригинала, но всегда в сторону улучшения.

Рекомендуется для:
- Финальной обработки важных изображений
- Подготовки к печати большого формата
- Улучшения AI-генерированных изображений
- Создания "hero" визуалов

Для сохранения точности оригинала используйте Clarity или Real-ESRGAN.`}
      idealFor={[
        'Максимальное качество',
        'Подготовка к печати',
        'Улучшение AI-генераций',
        'Hero-изображения',
        'Портфолио и презентации',
      ]}
      tip="Используйте детальный промпт для направления улучшения в нужную сторону."
      actionHref="/"
    />
  );
}

