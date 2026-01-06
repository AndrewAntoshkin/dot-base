'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function KlingEditPage() {
  return (
    <ModelPageTemplate
      name="Kling O1 Edit"
      familyName="Kling"
      familyHref="/docs/models/video-edit"
      shortDescription="Редактирование видео по инструкции. Точечные изменения в видео."
      description={`Kling O1 Edit — модель для редактирования видео по текстовым инструкциям. Позволяет вносить точечные изменения: заменять объекты, изменять цвета, добавлять элементы.

В отличие от V2V (полная стилизация), Edit позволяет изменить только конкретные элементы, сохраняя остальное без изменений.

Удобно для правок когда нужно изменить только одну деталь в уже готовом видео.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou' },
        { label: 'Тип', value: 'Video Edit' },
        { label: 'Разрешение', value: 'До 1080p' },
        { label: 'Время обработки', value: '3-10 минут' },
      ]}
      limits={[
        { label: 'Входное разрешение', value: 'До 1920×1080' },
        { label: 'Длительность', value: 'До 10 секунд' },
        { label: 'Инструкция', value: 'До 300 символов' },
      ]}
      promptExamples={[
        {
          title: 'Замена цвета',
          prompt: 'Change the car from red to blue',
        },
        {
          title: 'Добавление объекта',
          prompt: 'Add a hat to the person',
        },
        {
          title: 'Изменение погоды',
          prompt: 'Make it a rainy day with wet surfaces',
        },
      ]}
      details={`Kling O1 Edit понимает инструкции для точечного редактирования:
- Изменение цветов объектов
- Добавление аксессуаров
- Изменение погоды/времени суток
- Замена фона

Модель автоматически отслеживает объект через все кадры и применяет изменение консистентно.

Для полной стилизации видео используйте Kling O1 V2V.`}
      idealFor={[
        'Точечные правки в видео',
        'Изменение цветов',
        'Добавление элементов',
        'Изменение деталей',
        'Быстрые правки без пересъёмки',
      ]}
      tip="Пишите инструкции конкретно: 'Change X to Y', не 'Make it different'."
      actionHref="/video"
    />
  );
}

