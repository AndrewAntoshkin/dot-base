'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Flux2ProPage() {
  return (
    <ModelPageTemplate
      name="FLUX 2 Pro"
      familyName="FLUX"
      familyHref="/docs/models/flux"
      shortDescription="Оптимальный баланс скорости и качества. Быстрее Max при сохранении высокого качества генерации."
      description={`FLUX 2 Pro — профессиональная модель для повседневного использования, сочетающая высокое качество генерации с оптимизированной скоростью работы.

Модель построена на той же архитектуре Rectified Flow Transformers, что и Max, но с оптимизациями для более быстрой работы. Это делает её идеальным выбором для итеративной работы, когда нужно быстро протестировать идеи.

FLUX 2 Pro отлично справляется с большинством задач: от фотореалистичных портретов до стилизованных иллюстраций.`}
      specs={[
        { label: 'Разработчик', value: 'Black Forest Labs' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1440 × 1440 px' },
        { label: 'Время генерации', value: '8-12 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1440 × 1440 px' },
        { label: 'Минимальное разрешение', value: '256 × 256 px' },
        { label: 'Максимальная длина промпта', value: '~500 токенов' },
        { label: 'Референсных изображений', value: 'Не поддерживается' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:2' },
      ]}
      promptExamples={[
        {
          title: 'Уличная фотография',
          prompt: 'Street photography of Tokyo at night, neon lights reflecting on wet pavement, lone figure with umbrella, cyberpunk atmosphere, Blade Runner aesthetic, 35mm film look',
        },
        {
          title: 'Портрет в студии',
          prompt: 'Professional headshot of a businessman in navy suit, neutral gray background, soft box lighting, corporate photography, confident expression, sharp focus on eyes',
        },
        {
          title: 'Архитектурная визуализация',
          prompt: 'Modern minimalist house exterior, floor-to-ceiling windows, infinity pool, tropical landscaping, architectural photography, golden hour, luxury real estate',
        },
      ]}
      details={`FLUX 2 Pro — это рабочая лошадка для ежедневных задач. Модель достаточно быстрая для итеративной работы и достаточно качественная для финальных результатов.

В отличие от Max, Pro не поддерживает референсные изображения, но компенсирует это скоростью. Для большинства задач text-to-image это оптимальный выбор.

Поддерживает все популярные соотношения сторон. Хорошо работает с промптами средней детализации.`}
      idealFor={[
        'Ежедневная генерация контента',
        'Быстрое тестирование идей',
        'Контент для социальных сетей',
        'Коммерческая фотография',
        'Итеративная работа над концепциями',
      ]}
      tip="Используйте Pro для тестирования промптов, затем переключайтесь на Max для финальной версии."
      actionHref="/"
    />
  );
}
