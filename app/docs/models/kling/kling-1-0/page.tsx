'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Kling10Page() {
  return (
    <ModelPageTemplate
      name="Kling 1.0 T2V"
      familyName="Kling"
      familyHref="/docs/models/kling"
      shortDescription="Стандартная версия Kling для текста в видео. Надёжная и проверенная модель."
      description={`Kling 1.0 — оригинальная версия модели видеогенерации от Kuaishou. Несмотря на появление новых версий, Kling 1.0 остаётся надёжным выбором для базовых задач.

Модель обеспечивает стабильное качество генерации и хорошо подходит для простых сцен без сложной физики или быстрых движений.

Быстрее и дешевле новых версий, что делает её подходящей для массовой генерации или быстрых тестов.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou Technology' },
        { label: 'Тип', value: 'Text-to-Video' },
        { label: 'Макс. разрешение', value: '720p' },
        { label: 'Макс. длительность', value: '5 секунд' },
        { label: 'Время генерации', value: '1-2 минуты' },
      ]}
      limits={[
        { label: 'Разрешение', value: '1280×720, 720×1280, 720×720' },
        { label: 'Максимальная длительность', value: '5 секунд' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Простая сцена',
          prompt: 'Cat sleeping on windowsill, afternoon sunlight, peaceful, gentle breathing',
        },
        {
          title: 'Природа',
          prompt: 'Ocean waves gently rolling onto sandy beach, sunset colors, relaxing atmosphere',
        },
        {
          title: 'Абстракция',
          prompt: 'Colorful abstract shapes morphing and flowing, smooth transitions, artistic',
        },
      ]}
      details={`Kling 1.0 — хороший выбор когда не нужно максимальное качество, но важна скорость и стоимость.

Лучше всего работает с простыми сценами: пейзажи, медленные движения, атмосферные кадры. Для сложной динамики рекомендуется Kling 2.5 Pro.

Поддерживает negative prompt для исключения нежелательных элементов.`}
      idealFor={[
        'Быстрые тесты идей',
        'Простые атмосферные видео',
        'Фоновые видео для презентаций',
        'Массовая генерация контента',
        'Обучение работе с видео-AI',
      ]}
      tip="Для более качественных результатов используйте Kling 2.5 Pro. Kling 1.0 — для скорости и экономии."
      actionHref="/video"
    />
  );
}

