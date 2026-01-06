'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function RunwayGen4Page() {
  return (
    <ModelPageTemplate
      name="Runway Gen4 Turbo"
      familyName="Runway"
      familyHref="/docs/models/other"
      shortDescription="Новейшая модель от Runway. Быстрая генерация видео с отличным качеством."
      description={`Runway Gen4 Turbo — последняя модель видеогенерации от Runway ML, известных пионеров в области AI-видео. Gen4 представляет значительный скачок в качестве и скорости.

Модель отличается отличным пониманием физики, особенно для человеческих движений и взаимодействия объектов. Генерация происходит быстрее предыдущих версий.

Gen4 Turbo оптимизирован для скорости при сохранении высокого качества, что делает его идеальным для production-задач.`}
      specs={[
        { label: 'Разработчик', value: 'Runway ML' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность', value: '10 секунд' },
        { label: 'Время генерации', value: '1-3 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '10 секунд' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Кинематографический',
          prompt: 'Epic aerial shot flying over ancient temple ruins in jungle, morning mist, cinematic lighting, movie quality',
        },
        {
          title: 'Человек в движении',
          prompt: 'Athlete running through city streets at dawn, dynamic camera following, determined expression, urban energy',
        },
        {
          title: 'Фантастика',
          prompt: 'Futuristic city with flying cars, neon lights reflecting off glass buildings, cyberpunk atmosphere, night scene',
        },
      ]}
      details={`Runway Gen4 Aleph — премиум версия с максимальным качеством. Дольше генерируется, но даёт лучшие результаты для сложных сцен.

Gen4 Turbo — оптимальный выбор для большинства задач. Быстрый, качественный, универсальный.

Runway модели хорошо понимают кинематографические термины: "dolly shot", "crane shot", "slow motion" и т.д.`}
      idealFor={[
        'Кинематографические промо-ролики',
        'Контент для рекламы',
        'Музыкальные клипы',
        'Социальные сети премиум-качества',
        'Креативные эксперименты',
      ]}
      tip="Используйте кинематографические термины в промпте для более профессионального результата."
      actionHref="/video"
    />
  );
}

