'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function SeeDream4Page() {
  return (
    <ModelPageTemplate
      name="SeeDream 4"
      familyName="SeeDream"
      familyHref="/docs/models/seedream"
      shortDescription="Предыдущая версия SeeDream. Быстрая генерация с хорошим качеством."
      description={`SeeDream 4 — это предыдущее поколение модели от ByteDance. Остаётся популярной благодаря скорости и стабильности.

Модель хорошо справляется с большинством задач, хотя 4.5 превосходит её в сложных сценах с людьми.

Не поддерживает режим редактирования — только генерация text-to-image.`}
      specs={[
        { label: 'Разработчик', value: 'ByteDance' },
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
          title: 'Простой портрет',
          prompt: 'Portrait of a young man with short brown hair, casual outfit, natural outdoor lighting, friendly smile',
        },
        {
          title: 'Пейзаж',
          prompt: 'Peaceful lake surrounded by autumn forest, morning mist, reflection in water, landscape photography',
        },
        {
          title: 'Объект',
          prompt: 'Vintage camera on wooden desk, soft window lighting, shallow depth of field, still life photography',
        },
      ]}
      details={`SeeDream 4 — надёжный выбор для ежедневных задач. Быстрее чем 4.5, но с меньшими возможностями.

Хорошо подходит для задач где не требуется сложная анатомия или редактирование.

Используйте для быстрых итераций и простых сцен.`}
      idealFor={[
        'Быстрая генерация контента',
        'Простые сцены',
        'Пейзажи и объекты',
        'Прототипирование идей',
      ]}
      tip="Для сложных поз и редактирования переключитесь на SeeDream 4.5."
      actionHref="/"
    />
  );
}
