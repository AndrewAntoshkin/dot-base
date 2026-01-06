'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function CrystalPage() {
  return (
    <ModelPageTemplate
      name="Crystal Upscaler"
      familyName="Upscale"
      familyHref="/docs/models/upscale"
      shortDescription="AI-апскейл с улучшением деталей. Увеличивает разрешение добавляя новые детали."
      description={`Crystal Upscaler — продвинутая модель увеличения разрешения изображений с использованием AI для добавления реалистичных деталей.

В отличие от простого интерполяционного увеличения, Crystal анализирует изображение и генерирует новые детали: текстуры кожи, волос, ткани, текст и т.д.

Результат — не просто увеличенное изображение, а улучшенное с новыми деталями, которых не было в оригинале.`}
      specs={[
        { label: 'Тип', value: 'Image Upscale' },
        { label: 'Максимальное увеличение', value: 'До 4x' },
        { label: 'Технология', value: 'AI Generative Upscale' },
        { label: 'Время обработки', value: '10-30 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 4096 × 4096 px' },
        { label: 'Выходное разрешение', value: 'До 16384 × 16384 px' },
        { label: 'Коэффициенты', value: '2x, 4x' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Портрет',
          prompt: 'Enhance facial details, skin texture, hair strands, sharp eyes',
        },
        {
          title: 'Пейзаж',
          prompt: 'Add natural texture details, foliage, rocks, water ripples',
        },
        {
          title: 'Продукт',
          prompt: 'Sharp product details, clean edges, professional quality',
        },
      ]}
      details={`Crystal особенно хорош для:
- Портретов — улучшает кожу, глаза, волосы
- Природных сцен — добавляет текстуры растительности, камней, воды
- Продуктовых фото — делает края чётче, материалы реалистичнее

Промпт опционален, но помогает направить улучшение. Опишите что должно быть улучшено.

Для фотореалистичных результатов комбинируйте с моделями шумоподавления при необходимости.`}
      idealFor={[
        'Увеличение AI-генерированных изображений',
        'Улучшение старых фотографий',
        'Подготовка к печати',
        'Увеличение для рекламы',
        'Восстановление деталей',
      ]}
      tip="Добавьте описание желаемых деталей в промпт: 'sharp eyes', 'detailed skin texture'."
      actionHref="/"
    />
  );
}

