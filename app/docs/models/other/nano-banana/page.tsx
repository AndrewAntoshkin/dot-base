'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function NanoBananaPage() {
  return (
    <ModelPageTemplate
      name="Nano Banana Pro"
      familyName="Nano Banana"
      familyHref="/docs/models/other"
      shortDescription="Сверхбыстрая модель генерации изображений. Мгновенные результаты для быстрых итераций."
      description={`Nano Banana Pro — ультрабыстрая модель генерации изображений, оптимизированная для скорости. Генерация занимает всего несколько секунд, что делает её идеальной для быстрого прототипирования.

Модель использует оптимизированную архитектуру с уменьшенным количеством шагов диффузии, сохраняя при этом хорошее качество для большинства задач.

Идеально подходит для быстрых экспериментов с промптами и генерации большого количества вариантов.`}
      specs={[
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1024 × 1024 px' },
        { label: 'Время генерации', value: '1-3 секунды' },
        { label: 'Стиль', value: 'Универсальный' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1024 × 1024 px' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:4' },
        { label: 'Batch', value: 'До 4 изображений' },
      ]}
      promptExamples={[
        {
          title: 'Концепт-арт',
          prompt: 'Fantasy character design, warrior with glowing sword, dark armor, dramatic pose',
        },
        {
          title: 'Простой объект',
          prompt: 'Red apple on white background, studio lighting, product photography',
        },
        {
          title: 'Абстракция',
          prompt: 'Abstract colorful fluid art, vibrant gradients, flowing shapes',
        },
      ]}
      details={`Nano Banana Pro — отличный выбор для:
- Быстрого тестирования промптов перед использованием более качественных моделей
- Генерации большого количества вариантов для выбора лучшего
- Ситуаций когда время критично

Качество ниже чем у FLUX или Recraft, но скорость компенсирует это для итеративных задач.`}
      idealFor={[
        'Быстрое прототипирование',
        'Тестирование промптов',
        'Массовая генерация вариантов',
        'Концепт-арт наброски',
        'Обучение работе с AI',
      ]}
      tip="Используйте для быстрых тестов, затем переключайтесь на FLUX 2 Max для финального качества."
      actionHref="/"
    />
  );
}

