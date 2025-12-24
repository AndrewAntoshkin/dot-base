'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Hailuo23Page() {
  return (
    <ModelPageTemplate
      name="Hailuo 2.3"
      familyName="Hailuo"
      familyHref="/docs/models/hailuo"
      shortDescription="Новейшая модель видеогенерации от MiniMax. Креативные движения и выразительная стилизация."
      description={`Hailuo 2.3 — последняя версия модели видеогенерации от MiniMax (также известной как Hailuoai). Модель славится креативным подходом к движению и способностью создавать стилизованные видео.

В отличие от Kling, Hailuo фокусируется на художественной выразительности больше, чем на физической точности. Это делает её отличным выбором для креативных проектов.

Модель особенно хороша в стилизованных видео: аниме, живопись в движении, сюрреалистические сцены.`}
      specs={[
        { label: 'Разработчик', value: 'MiniMax' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность', value: '6 секунд' },
        { label: 'Время генерации', value: '2-4 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '6 секунд' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Стилизованная сцена',
          prompt: 'Anime girl with long flowing hair running through cherry blossom forest, petals swirling around her, magical atmosphere, Studio Ghibli style animation',
        },
        {
          title: 'Сюрреализм',
          prompt: 'Melting clock dripping from tree branch, Salvador Dali surrealism, dreamlike desert landscape, impossible physics, artistic interpretation',
        },
        {
          title: 'Атмосферное видео',
          prompt: 'Candle flame flickering in dark room, smoke trails dancing upward, moody lighting, intimate atmosphere, close-up macro shot',
        },
      ]}
      details={`Hailuo 2.3 — выбор для креативных проектов где важна художественность, а не физическая точность.

Модель отлично справляется со стилизованными сценами: аниме, акварель, масляная живопись в движении. Если Kling генерирует "реальные" видео, Hailuo генерирует "художественные".

Image-to-Video режим сохраняет стиль исходного изображения, что полезно для оживления иллюстраций.`}
      idealFor={[
        'Стилизованные анимации',
        'Художественные видео',
        'Музыкальные визуализации',
        'Оживление иллюстраций и артов',
        'Экспериментальный контент',
      ]}
      tip="Для сохранения стиля иллюстрации используйте Image-to-Video с готовым артом."
      actionHref="/video"
    />
  );
}
