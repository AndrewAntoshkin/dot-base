'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function BriaExpandPage() {
  return (
    <ModelPageTemplate
      name="Bria Expand"
      familyName="Bria AI"
      familyHref="/docs/models/edit"
      shortDescription="Расширение изображений от Bria. Генерирует продолжение за пределами кадра."
      description={`Bria Expand — модель для расширения изображений за пределы оригинального кадра. Генерирует естественное продолжение сцены в любом направлении.

Идеально подходит для изменения соотношения сторон изображения без обрезки важного контента. Расширяйте портрет 4:3 до 16:9, добавляя фон по бокам.

Модель анализирует стиль, освещение и содержимое оригинала для создания согласованного продолжения.`}
      specs={[
        { label: 'Разработчик', value: 'Bria AI' },
        { label: 'Тип', value: 'Outpainting / Expand' },
        { label: 'Направления', value: 'Все стороны' },
        { label: 'Время обработки', value: '5-15 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Максимальное расширение', value: 'До 2x в каждую сторону' },
        { label: 'Направления', value: 'Вверх, вниз, влево, вправо' },
      ]}
      promptExamples={[
        {
          title: 'Пейзаж',
          prompt: 'Continue the mountain landscape with snow and forest',
        },
        {
          title: 'Интерьер',
          prompt: 'Extend the room with matching furniture and decor',
        },
        {
          title: 'Небо',
          prompt: 'Continue the sky with clouds and sunset colors',
        },
      ]}
      details={`Bria Expand полезен когда:
- Нужно изменить соотношение сторон
- Изображение "тесное" и нужно больше пространства
- Нужен фон для текста или элементов дизайна
- Требуется симметричное расширение

Промпт опционален, но помогает направить генерацию. Опишите что должно появиться в расширенной области.`}
      idealFor={[
        'Изменение соотношения сторон',
        'Добавление пространства для дизайна',
        'Расширение фонов',
        'Подготовка баннеров',
        'Социальные сети разных форматов',
      ]}
      tip="Выберите направление расширения и опишите желаемое содержимое в промпте."
      actionHref="/expand"
    />
  );
}

