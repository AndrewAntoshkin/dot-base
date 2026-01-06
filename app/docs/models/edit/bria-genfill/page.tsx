'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function BriaGenFillPage() {
  return (
    <ModelPageTemplate
      name="Bria GenFill"
      familyName="Bria AI"
      familyHref="/docs/models/edit"
      shortDescription="Генеративное заполнение от Bria. Замена и добавление объектов по маске."
      description={`Bria GenFill — профессиональная модель генеративного заполнения. Позволяет заменять части изображения на новый контент, описанный в промпте.

Модель анализирует контекст изображения (освещение, стиль, перспективу) и генерирует новый контент, идеально вписывающийся в сцену.

Используйте для замены объектов, добавления элементов или удаления с заполнением фона.`}
      specs={[
        { label: 'Разработчик', value: 'Bria AI' },
        { label: 'Тип', value: 'Inpainting / GenFill' },
        { label: 'Качество', value: 'Коммерческое' },
        { label: 'Время обработки', value: '5-15 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Формат маски', value: 'PNG с прозрачностью' },
        { label: 'Длина промпта', value: 'До 500 символов' },
      ]}
      promptExamples={[
        {
          title: 'Замена объекта',
          prompt: 'Modern leather armchair, minimalist design, matching the room style',
        },
        {
          title: 'Добавление элемента',
          prompt: 'Potted plant with green leaves, natural lighting',
        },
        {
          title: 'Заполнение фона',
          prompt: 'Continuation of the wooden floor and white wall',
        },
      ]}
      details={`Bria GenFill работает с маской — выделите область для замены, опишите что должно появиться.

Модель автоматически подбирает:
- Освещение, соответствующее сцене
- Перспективу и масштаб
- Стиль и цветовую гамму
- Тени и отражения

Для удаления объектов без замены используйте Bria Eraser.`}
      idealFor={[
        'Замена объектов на фото',
        'Добавление элементов в сцену',
        'Продуктовые композиции',
        'Интерьерная визуализация',
        'Ретушь и редактирование',
      ]}
      tip="Описывайте желаемый объект детально, включая стиль и материалы."
      actionHref="/inpaint"
    />
  );
}

