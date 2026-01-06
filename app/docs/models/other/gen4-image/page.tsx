'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Gen4ImagePage() {
  return (
    <ModelPageTemplate
      name="Gen4 Image Turbo"
      familyName="Runway"
      familyHref="/docs/models/other"
      shortDescription="Генерация изображений от Runway. Высокое качество с кинематографическим стилем."
      description={`Gen4 Image Turbo — модель генерации изображений от Runway ML, создатели известной серии видео-моделей Gen.

Модель отличается кинематографическим качеством изображений с профессиональным освещением и композицией. Хорошо понимает терминологию фотографии и кино.

Отлично подходит для создания кадров для последующей анимации в Runway Gen4 Video.`}
      specs={[
        { label: 'Разработчик', value: 'Runway ML' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1536 × 1536 px' },
        { label: 'Время генерации', value: '5-10 секунд' },
        { label: 'Стиль', value: 'Кинематографический' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1536 × 1536 px' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3' },
        { label: 'Prompt', value: 'До 500 токенов' },
      ]}
      promptExamples={[
        {
          title: 'Кинокадр',
          prompt: 'Film still, woman standing in doorway, silhouette against bright window, noir lighting, 35mm film grain',
        },
        {
          title: 'Продакшн',
          prompt: 'Behind the scenes on film set, camera on dolly, dramatic lighting setup, professional production',
        },
        {
          title: 'Атмосферный',
          prompt: 'Abandoned warehouse interior, dust particles in light beams, moody atmosphere, cinematic composition',
        },
      ]}
      details={`Gen4 Image создаёт изображения идеально подходящие для последующей анимации в Runway Gen4 Video. Стиль и качество согласованы между моделями.

Модель хорошо понимает: типы камер (35mm, anamorphic), освещение (Rembrandt, butterfly), композицию (rule of thirds, leading lines).

Для максимального кинематографического эффекта используйте терминологию кино и фотографии.`}
      idealFor={[
        'Кадры для анимации в Gen4 Video',
        'Кинематографический контент',
        'Профессиональные визуалы',
        'Storyboard кадры',
        'Концепты для видеопроизводства',
      ]}
      tip="Добавляйте 'film still', '35mm', 'cinematic' для усиления кинематографического эффекта."
      actionHref="/"
    />
  );
}

