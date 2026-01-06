'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function ClarityPage() {
  return (
    <ModelPageTemplate
      name="Clarity Upscaler"
      familyName="Upscale"
      familyHref="/docs/models/upscale"
      shortDescription="Умный апскейлер с акцентом на чёткость. Идеален для текста и деталей."
      description={`Clarity Upscaler — модель увеличения разрешения с акцентом на сохранение чёткости и читаемости деталей.

Особенно хорошо справляется с текстом, тонкими линиями, мелкими деталями — там, где другие апскейлеры могут размывать.

Использует адаптивный алгоритм, который определяет разные типы контента и применяет оптимальную обработку для каждого.`}
      specs={[
        { label: 'Тип', value: 'Image Upscale' },
        { label: 'Специализация', value: 'Чёткость и детали' },
        { label: 'Максимальное увеличение', value: 'До 4x' },
        { label: 'Время обработки', value: '10-20 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 4096 × 4096 px' },
        { label: 'Коэффициенты', value: '2x, 4x' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Документы',
          prompt: 'Enhance text clarity, sharp edges, readable typography',
        },
        {
          title: 'UI/Скриншоты',
          prompt: 'Crisp interface elements, clear icons, sharp text',
        },
        {
          title: 'Графика',
          prompt: 'Sharp vector-like edges, clean lines, precise details',
        },
      ]}
      details={`Clarity особенно хорош для:
- Документов и скриншотов с текстом
- UI/UX дизайнов
- Логотипов и графики
- Изображений с мелкими деталями

В отличие от моделей, добавляющих текстуры, Clarity сохраняет оригинальный характер изображения, только увеличивая его чётко.

Для фотографий с текстурами (портреты, пейзажи) лучше использовать Crystal или Magic Image Refiner.`}
      idealFor={[
        'Скриншоты с текстом',
        'Документы',
        'UI дизайны',
        'Логотипы и иконки',
        'Техническая графика',
      ]}
      tip="Идеален когда важно сохранить читаемость текста при увеличении."
      actionHref="/"
    />
  );
}

