'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Veo31Page() {
  return (
    <ModelPageTemplate
      name="Veo 3.1 Fast"
      familyName="Google"
      familyHref="/docs/models/google"
      shortDescription="Видеогенерация от Google. Быстрая модель с хорошим качеством и пониманием физики."
      description={`Veo 3.1 Fast — модель видеогенерации от Google DeepMind. Представляет собой ускоренную версию серии Veo, оптимизированную для баланса скорости и качества.

Google использует свои наработки в области понимания видео (YouTube) для создания модели с хорошим пониманием физики и движения.

Модель особенно хороша в генерации реалистичных сцен с людьми и понимании сложных текстовых описаний.`}
      specs={[
        { label: 'Разработчик', value: 'Google DeepMind' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность', value: '8 секунд' },
        { label: 'Время генерации', value: '1-3 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '8 секунд' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Реалистичная сцена',
          prompt: 'A chef preparing sushi in traditional Japanese restaurant, precise knife movements, steam rising from rice, documentary style filming',
        },
        {
          title: 'Природа',
          prompt: 'Majestic eagle soaring over mountain range, wings spread wide, wind ruffling feathers, BBC nature documentary style, slow motion',
        },
        {
          title: 'Городская жизнь',
          prompt: 'Time-lapse of busy Tokyo intersection at night, thousands of people crossing, neon lights reflecting on wet pavement, aerial view',
        },
      ]}
      details={`Veo 3.1 Fast — хороший универсал среди видео-моделей. Быстрее чем Kling PRO при сопоставимом качестве для многих сцен.

Google тренировал модель на огромном датасете видео, что даёт хорошее понимание реальных движений и физики.

Особенно хорош в documentary-style видео и реалистичных сценах.`}
      idealFor={[
        'Реалистичные видео',
        'Documentary стиль',
        'Природа и животные',
        'Городские сцены',
        'Time-lapse эффекты',
      ]}
      tip="Добавляйте стиль съёмки в промпт: documentary style, cinematic, time-lapse."
      actionHref="/video"
    />
  );
}
