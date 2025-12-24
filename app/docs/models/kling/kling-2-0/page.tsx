'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Kling20Page() {
  return (
    <ModelPageTemplate
      name="Kling 2.0"
      familyName="Kling"
      familyHref="/docs/models/kling"
      shortDescription="Базовая версия для быстрого прототипирования. Самая быстрая модель семейства."
      description={`Kling 2.0 — это базовая версия модели, оптимизированная для скорости. Идеальна для быстрого прототипирования и тестирования идей.

Модель генерирует видео в более низком разрешении и с меньшей детализацией, но делает это значительно быстрее.

Рекомендуется использовать для предварительной оценки концепций перед переходом на более качественные версии.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou Technology' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '720p (1280×720)' },
        { label: 'Макс. длительность', value: '5 секунд' },
        { label: 'Время генерации', value: '1-2 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1280 × 720 px' },
        { label: 'Максимальная длительность', value: '5 секунд' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Тест концепции',
          prompt: 'Person walking through city street, urban environment, daytime',
        },
        {
          title: 'Быстрый прототип',
          prompt: 'Dog running on beach, splashing water, happy mood',
        },
        {
          title: 'Проверка движения',
          prompt: 'Camera slowly orbiting around a statue, marble texture, museum lighting',
        },
      ]}
      details={`Kling 2.0 — самая быстрая модель семейства. Используйте её для проверки идей и направления генерации.

Качество достаточное для оценки композиции, движения и общей идеи. Для финального результата переключитесь на Master или PRO.

Разрешение 720p подходит для просмотра на мобильных устройствах, но не для профессионального использования.`}
      idealFor={[
        'Быстрое прототипирование',
        'Тестирование промптов',
        'Проверка концепций',
        'Итерации над идеей',
      ]}
      tip="Используйте для быстрой проверки идеи, затем генерируйте финал на PRO."
      actionHref="/video"
    />
  );
}
