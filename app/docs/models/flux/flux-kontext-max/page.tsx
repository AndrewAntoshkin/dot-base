'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function FluxKontextMaxPage() {
  return (
    <ModelPageTemplate
      name="FLUX Kontext Max"
      familyName="FLUX"
      familyHref="/docs/models/flux"
      shortDescription="Лучшая модель для редактирования изображений. Изменяйте любые аспекты сохраняя общую композицию и стиль."
      description={`FLUX Kontext Max — специализированная модель для редактирования изображений по текстовому описанию. В отличие от Inpaint, не требует маски — модель сама определяет что изменить на основе инструкций.

Kontext означает "контекст" — модель глубоко понимает содержимое изображения и может изменять его части, сохраняя общую целостность и стиль.

Идеальна для задач: изменение цвета волос, добавление/удаление аксессуаров, смена фона, стилизация, изменение одежды и многое другое.`}
      specs={[
        { label: 'Разработчик', value: 'Black Forest Labs' },
        { label: 'Тип', value: 'Image Editing' },
        { label: 'Макс. разрешение', value: '2048 × 2048 px' },
        { label: 'Входное изображение', value: 'Обязательно' },
        { label: 'Время генерации', value: '12-20 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '2048 × 2048 px' },
        { label: 'Минимальный размер входа', value: '256 × 256 px' },
        { label: 'Максимальный размер файла', value: '10 MB' },
        { label: 'Форматы входа', value: 'JPEG, PNG, WebP' },
        { label: 'Максимальная длина промпта', value: '~500 токенов' },
      ]}
      promptExamples={[
        {
          title: 'Изменение внешности',
          prompt: 'Change her hair color to vibrant red, add subtle freckles on her cheeks, keep the same lighting and pose',
        },
        {
          title: 'Смена фона',
          prompt: 'Replace the background with a cozy coffee shop interior, warm ambient lighting, maintain the subject in focus',
        },
        {
          title: 'Стилизация',
          prompt: 'Transform this photo into a Studio Ghibli anime style illustration, soft watercolor textures, dreamy atmosphere',
        },
      ]}
      details={`FLUX Kontext Max — это самый точный инструмент для редактирования на платформе. Модель понимает контекст изображения и вносит изменения органично.

Ключевое преимущество — сохранение идентичности. При изменении одного аспекта (например, цвета волос) остальные черты лица остаются неизменными.

Для точных локальных изменений используйте Inpaint. Kontext лучше для общих изменений, затрагивающих несколько областей.`}
      idealFor={[
        'Редактирование портретов',
        'Смена стиля изображения',
        'Изменение фона',
        'Добавление/удаление элементов',
        'Цветокоррекция и стилизация',
      ]}
      tip="Будьте конкретны в инструкциях. 'Make it better' не работает — опишите что именно изменить."
      actionHref="/edit"
    />
  );
}
