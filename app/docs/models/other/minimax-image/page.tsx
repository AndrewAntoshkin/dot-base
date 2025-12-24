'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function MinimaxImagePage() {
  return (
    <ModelPageTemplate
      name="MiniMax Image-01"
      familyName="Другие модели"
      familyHref="/docs/models/other"
      shortDescription="Модель генерации изображений от создателей Hailuo. Хорошее качество с азиатской эстетикой."
      description={`MiniMax Image-01 — модель генерации изображений от MiniMax, той же компании которая создала видео-модель Hailuo.

Модель имеет характерную эстетику с хорошей проработкой азиатских лиц и стилей. Отлично справляется с аниме и современной азиатской фотографией.

Быстрая генерация с хорошим качеством делает её полезной для ежедневных задач.`}
      specs={[
        { label: 'Разработчик', value: 'MiniMax' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1536 × 1536 px' },
        { label: 'Время генерации', value: '8-12 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1536 × 1536 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~300 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3' },
      ]}
      promptExamples={[
        {
          title: 'K-pop стиль',
          prompt: 'Young Korean idol in stylish streetwear, trendy hairstyle, urban backdrop, professional photography, magazine cover quality',
        },
        {
          title: 'Аниме персонаж',
          prompt: 'Detailed anime character, long silver hair, magical girl costume, glowing effects, fantasy illustration, high quality rendering',
        },
        {
          title: 'Азиатский пейзаж',
          prompt: 'Traditional Chinese garden with pavilion, lotus pond, morning mist, peaceful atmosphere, landscape photography',
        },
      ]}
      details={`MiniMax Image-01 — хороший выбор если вы работаете с азиатской тематикой или аниме стилем.

Модель обучена с акцентом на азиатский контент, что даёт лучшие результаты для соответствующих задач.

Для западных лиц и стилей лучше подойдут FLUX или SeeDream.`}
      idealFor={[
        'Азиатские портреты',
        'Аниме и манга стили',
        'K-pop эстетика',
        'Традиционные азиатские сцены',
      ]}
      tip="Лучше всего работает с азиатской тематикой и аниме стилем."
      actionHref="/"
    />
  );
}
