'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function ZImagePage() {
  return (
    <ModelPageTemplate
      name="Z-Image Turbo"
      familyName="Z-Image"
      familyHref="/docs/models/other"
      shortDescription="Быстрая модель с хорошим качеством. Турбо-режим для ускоренной генерации."
      description={`Z-Image Turbo — оптимизированная модель генерации с акцентом на скорость. Использует ускоренный pipeline без значительной потери качества.

Модель подходит для задач где важен баланс между скоростью и качеством. Быстрее стандартных моделей, но качественнее ультрабыстрых.

Хорошо справляется с большинством типов изображений: люди, объекты, пейзажи, абстракции.`}
      specs={[
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1024 × 1024 px' },
        { label: 'Время генерации', value: '3-6 секунд' },
        { label: 'Режим', value: 'Turbo (ускоренный)' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1024 × 1024 px' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16' },
        { label: 'Шаги генерации', value: 'Оптимизировано' },
      ]}
      promptExamples={[
        {
          title: 'Быстрый портрет',
          prompt: 'Portrait of young man with beard, casual style, natural lighting, friendly smile',
        },
        {
          title: 'Объект',
          prompt: 'Modern smartphone on wooden desk, soft shadows, minimalist photography',
        },
        {
          title: 'Сцена',
          prompt: 'Busy street market in Asia, colorful stalls, morning light, street photography',
        },
      ]}
      details={`Z-Image Turbo использует оптимизированный scheduler и меньшее количество шагов диффузии для ускорения генерации.

Результаты сопоставимы с полной версией для большинства промптов, но могут быть менее детальными при сложных описаниях.

Хороший выбор для: итеративной работы, проверки композиций, подготовки черновиков.`}
      idealFor={[
        'Быстрые итерации',
        'Тестирование композиций',
        'Массовая генерация',
        'Социальные сети',
        'Черновики перед финальной версией',
      ]}
      tip="Используйте для быстрого тестирования идей, затем регенерируйте лучшие на FLUX для финала."
      actionHref="/"
    />
  );
}

