'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Hailuo02Page() {
  return (
    <ModelPageTemplate
      name="Hailuo 02"
      familyName="Hailuo"
      familyHref="/docs/models/hailuo"
      shortDescription="Предыдущая версия Hailuo. Быстрее, но с меньшими возможностями."
      description={`Hailuo 02 — это предыдущее поколение модели видеогенерации от MiniMax. Остаётся доступной для задач где важна скорость.

Модель работает быстрее чем 2.3, но с ограничениями по качеству и длительности. Хороший выбор для прототипирования.

Сохраняет характерный для Hailuo креативный подход к движению, но с меньшей детализацией.`}
      specs={[
        { label: 'Разработчик', value: 'MiniMax' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '720p' },
        { label: 'Макс. длительность', value: '4 секунды' },
        { label: 'Время генерации', value: '1-2 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1280 × 720 px' },
        { label: 'Максимальная длительность', value: '4 секунды' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Быстрый тест',
          prompt: 'Butterfly flying through garden, colorful flowers, gentle breeze',
        },
        {
          title: 'Простая анимация',
          prompt: 'Fish swimming in aquarium, bubbles rising, underwater lighting',
        },
        {
          title: 'Атмосфера',
          prompt: 'Rain drops falling on window, blurred city lights in background, melancholic mood',
        },
      ]}
      details={`Hailuo 02 — это рабочий инструмент для быстрых итераций. Качество ниже чем у 2.3, но скорость выше.

Используйте для тестирования идей и подбора нужного промпта. Финальную версию генерируйте на 2.3.

Разрешение 720p достаточно для оценки концепции и просмотра на мобильных устройствах.`}
      idealFor={[
        'Быстрое прототипирование',
        'Тестирование промптов',
        'Короткие анимации',
        'Проверка концепций',
      ]}
      tip="Используйте для быстрой проверки, затем генерируйте в 2.3 для качества."
      actionHref="/video"
    />
  );
}
