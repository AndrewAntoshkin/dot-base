'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function ReveCreatePage() {
  return (
    <ModelPageTemplate
      name="Reve Create"
      familyName="Reve"
      familyHref="/docs/models/other"
      shortDescription="Универсальная модель с отличным балансом качества и скорости."
      description={`Reve Create — универсальная модель генерации изображений с хорошим балансом между качеством, скоростью и стоимостью.

Модель хорошо справляется с широким спектром задач: от фотореалистичных изображений до иллюстраций и концепт-арта.

Стабильная и надёжная — отличный выбор для повседневных задач генерации.`}
      specs={[
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1536 × 1536 px' },
        { label: 'Время генерации', value: '5-10 секунд' },
        { label: 'Стиль', value: 'Универсальный' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1536 × 1536 px' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:4, 21:9' },
        { label: 'Длина промпта', value: 'До 1000 символов' },
      ]}
      promptExamples={[
        {
          title: 'Пейзаж',
          prompt: 'Majestic mountain range at golden hour, snow-capped peaks, mirror lake reflection, dramatic clouds, landscape photography',
        },
        {
          title: 'Портрет',
          prompt: 'Professional headshot of business woman, confident smile, studio lighting, corporate style',
        },
        {
          title: 'Иллюстрация',
          prompt: 'Cozy coffee shop interior, warm lighting, plants and books, watercolor illustration style',
        },
      ]}
      details={`Reve Create — "рабочая лошадка" для ежедневных задач. Не самая быстрая и не самая качественная, но отличный баланс.

Хорошо понимает различные стили: фотореализм, иллюстрация, цифровое искусство, аниме.

Рекомендуется для задач где не нужно максимальное качество FLUX 2 Max, но важна надёжность результата.`}
      idealFor={[
        'Повседневная генерация контента',
        'Иллюстрации для статей и постов',
        'Концепты и наброски',
        'Социальные сети',
        'Презентации',
      ]}
      tip="Добавляйте стиль в промпт: 'watercolor', 'digital art', 'photography' для лучших результатов."
      actionHref="/"
    />
  );
}

