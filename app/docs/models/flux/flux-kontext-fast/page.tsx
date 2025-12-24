'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function FluxKontextFastPage() {
  return (
    <ModelPageTemplate
      name="FLUX Kontext Fast"
      familyName="FLUX"
      familyHref="/docs/models/flux"
      shortDescription="Быстрая версия Kontext для итеративного редактирования. Тестируйте идеи быстрее."
      description={`FLUX Kontext Fast — ускоренная версия модели редактирования Kontext. Предназначена для быстрого тестирования идей и итеративной работы.

Модель использует те же принципы контекстного редактирования, но с оптимизациями для скорости. Качество немного ниже Max, но скорость значительно выше.

Идеальный workflow: тестируйте варианты на Fast, затем генерируйте финальную версию на Max.`}
      specs={[
        { label: 'Разработчик', value: 'Black Forest Labs' },
        { label: 'Тип', value: 'Image Editing' },
        { label: 'Макс. разрешение', value: '1440 × 1440 px' },
        { label: 'Входное изображение', value: 'Обязательно' },
        { label: 'Время генерации', value: '5-10 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1440 × 1440 px' },
        { label: 'Минимальный размер входа', value: '256 × 256 px' },
        { label: 'Максимальный размер файла', value: '10 MB' },
        { label: 'Форматы входа', value: 'JPEG, PNG, WebP' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
      ]}
      promptExamples={[
        {
          title: 'Быстрая смена цвета',
          prompt: 'Make the dress blue instead of red',
        },
        {
          title: 'Добавление элемента',
          prompt: 'Add sunglasses and a baseball cap',
        },
        {
          title: 'Изменение времени суток',
          prompt: 'Change the scene to nighttime with city lights',
        },
      ]}
      details={`Fast версия оптимальна для итераций. Когда нужно попробовать несколько вариантов — используйте Fast, чтобы не тратить время.

Качество достаточное для оценки результата и выбора направления. Финальную версию лучше генерировать на Max.

Поддерживает все те же функции редактирования, что и Max, но с ограничением по разрешению.`}
      idealFor={[
        'Быстрое тестирование идей',
        'Итеративное редактирование',
        'Сравнение вариантов',
        'Прототипирование',
      ]}
      tip="Используйте Fast для поиска правильного промпта, затем Max для финального качества."
      actionHref="/edit"
    />
  );
}
