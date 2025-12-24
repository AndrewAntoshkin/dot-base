'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Wan25Page() {
  return (
    <ModelPageTemplate
      name="Wan 2.5 T2V"
      familyName="Другие модели"
      familyHref="/docs/models/other"
      shortDescription="Text-to-Video модель с хорошим пониманием промптов. Альтернатива основным видео-моделям."
      description={`Wan 2.5 T2V — модель видеогенерации нового поколения с фокусом на понимание текстовых описаний.

Модель хорошо справляется с генерацией видео по сложным промптам, понимая детали и следуя инструкциям.

Представляет альтернативу основным моделям (Kling, Hailuo, Veo) с собственными сильными сторонами.`}
      specs={[
        { label: 'Разработчик', value: 'Wan AI' },
        { label: 'Тип', value: 'Text-to-Video' },
        { label: 'Макс. разрешение', value: '720p' },
        { label: 'Макс. длительность', value: '5 секунд' },
        { label: 'Время генерации', value: '2-3 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1280 × 720 px' },
        { label: 'Максимальная длительность', value: '5 секунд' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Детальная сцена',
          prompt: 'A small robot carefully watering a potted plant, morning sunlight streaming through window, cozy apartment, gentle movements',
        },
        {
          title: 'Природа',
          prompt: 'Waterfall cascading into crystal clear pool, tropical rainforest, mist rising, birds flying through scene, nature documentary',
        },
        {
          title: 'Анимация объекта',
          prompt: 'Vintage compass needle spinning then pointing north, old wooden desk, candlelight, mystical atmosphere',
        },
      ]}
      details={`Wan 2.5 — полезная альтернатива когда основные модели не дают желаемого результата.

Разрешение ограничено 720p, но для социальных сетей и прототипирования этого достаточно.

Экспериментируйте: иногда Wan даёт результаты которые не получаются на других моделях.`}
      idealFor={[
        'Эксперименты и альтернативы',
        'Детальные описания сцен',
        'Анимация объектов',
        'Прототипирование',
      ]}
      tip="Попробуйте если Kling или Hailuo не дают нужного результата."
      actionHref="/video"
    />
  );
}
