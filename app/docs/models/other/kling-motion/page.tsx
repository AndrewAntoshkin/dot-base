'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function KlingMotionPage() {
  return (
    <ModelPageTemplate
      name="Kling 2.6 Motion Control"
      familyName="Kling"
      familyHref="/docs/models/kling"
      shortDescription="Kling с управлением движением камеры. Точный контроль над траекторией камеры."
      description={`Kling 2.6 Motion Control — специализированная версия Kling с продвинутым управлением движением камеры. Позволяет задавать точную траекторию камеры для создания профессиональных кинематографических эффектов.

Модель понимает команды движения камеры: pan, tilt, zoom, dolly, tracking и их комбинации. Это даёт полный контроль над динамикой видео.

Идеально подходит для создания промо-роликов и рекламы где важна точная хореография камеры.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou Technology' },
        { label: 'Тип', value: 'Text-to-Video с Motion Control' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность', value: '10 секунд' },
        { label: 'Управление камерой', value: 'Pan, Tilt, Zoom, Dolly, Track' },
      ]}
      limits={[
        { label: 'Разрешение', value: '1920×1080, 1080×1920, 1080×1080' },
        { label: 'Длительность', value: '5-10 секунд' },
        { label: 'Типы движения', value: 'Pan L/R, Tilt U/D, Zoom In/Out, Dolly, Track' },
      ]}
      promptExamples={[
        {
          title: 'Drone shot',
          prompt: 'Mountain landscape at sunrise, camera slowly rising and revealing vast valley below, epic cinematic',
        },
        {
          title: 'Tracking shot',
          prompt: 'Camera following runner through city streets, tracking from side, urban morning, dynamic',
        },
        {
          title: 'Zoom reveal',
          prompt: 'Mysterious ancient artifact on pedestal, slow zoom in revealing intricate details, dramatic lighting',
        },
      ]}
      details={`Motion Control позволяет комбинировать разные типы движения камеры. Например: "pan left while zooming in" или "dolly forward with slight tilt up".

Выберите тип движения в настройках модели, затем опишите сцену в промпте. Модель автоматически применит указанное движение.

Для сложных движений рекомендуется разбивать на несколько коротких клипов.`}
      idealFor={[
        'Кинематографические промо',
        'Продуктовые видео с динамикой',
        'Архитектурные визуализации',
        'Туристический контент',
        'Профессиональная реклама',
      ]}
      tip="Комбинируйте движения камеры для более интересного результата: 'dolly in + slight tilt up'."
      actionHref="/video"
    />
  );
}

