'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function LumaModifyPage() {
  return (
    <ModelPageTemplate
      name="Luma Modify Video"
      familyName="Luma"
      familyHref="/docs/models/other"
      shortDescription="Редактирование видео с помощью AI. Изменяйте стиль и содержимое существующего видео."
      description={`Luma Modify Video — модель для AI-редактирования видео. Позволяет изменять стиль, добавлять эффекты и трансформировать существующее видео с помощью текстовых инструкций.

Модель анализирует входное видео и применяет указанные изменения, сохраняя при этом структуру движения и композицию оригинала.

Отлично подходит для стилизации видео, изменения атмосферы и добавления визуальных эффектов.`}
      specs={[
        { label: 'Разработчик', value: 'Luma AI' },
        { label: 'Тип', value: 'Video-to-Video' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность входа', value: '10 секунд' },
        { label: 'Время обработки', value: '2-5 минут' },
      ]}
      limits={[
        { label: 'Входное разрешение', value: 'До 1920×1080' },
        { label: 'Длительность', value: 'До 10 секунд' },
        { label: 'Форматы', value: 'MP4, MOV, WebM' },
      ]}
      promptExamples={[
        {
          title: 'Стилизация',
          prompt: 'Transform into anime style, vibrant colors, cel shading, Studio Ghibli aesthetic',
        },
        {
          title: 'Атмосфера',
          prompt: 'Make it look like a rainy day, wet surfaces, moody lighting, cinematic color grading',
        },
        {
          title: 'Эффекты',
          prompt: 'Add magical particles and sparkles, fantasy atmosphere, ethereal glow',
        },
      ]}
      details={`Luma Modify сохраняет движение и основную структуру оригинального видео, изменяя только стиль и атмосферу.

Можно использовать для: смены времени суток, изменения погоды, стилизации под разные художественные направления, добавления визуальных эффектов.

Для сильных изменений может потребоваться несколько итераций с разными промптами.`}
      idealFor={[
        'Стилизация видео контента',
        'Изменение атмосферы и настроения',
        'Добавление визуальных эффектов',
        'Креативные эксперименты',
        'Ретуширование видео',
      ]}
      tip="Чем конкретнее описание стиля в промпте, тем лучше результат. Используйте референсы стилей."
      actionHref="/video"
    />
  );
}

