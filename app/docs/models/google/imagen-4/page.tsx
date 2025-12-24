'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Imagen4Page() {
  return (
    <ModelPageTemplate
      name="Imagen 4 Ultra"
      familyName="Google"
      familyHref="/docs/models/google"
      shortDescription="Флагманская модель генерации изображений от Google. Максимальное качество и детализация."
      description={`Imagen 4 Ultra — это последняя и самая мощная модель генерации изображений от Google DeepMind. Представляет вершину развития серии Imagen.

Модель известна исключительной детализацией и фотореалистичностью. Особенно хорошо справляется с текстурами, освещением и мелкими деталями.

Google использовал свои возможности в области понимания языка (Gemini) для создания модели с превосходным пониманием сложных промптов.`}
      specs={[
        { label: 'Разработчик', value: 'Google DeepMind' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '2048 × 2048 px' },
        { label: 'Качество', value: 'Ultra' },
        { label: 'Время генерации', value: '18-30 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '2048 × 2048 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~500 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:2' },
      ]}
      promptExamples={[
        {
          title: 'Продуктовая фотография',
          prompt: 'Luxury watch on black velvet surface, professional product photography, perfect reflections, micro-detailed scratches on metal, magazine advertisement quality',
        },
        {
          title: 'Кинематографический портрет',
          prompt: 'Close-up portrait of elderly fisherman with weathered skin, every wrinkle telling a story, piercing blue eyes, golden hour rim lighting, National Geographic cover quality',
        },
        {
          title: 'Архитектура',
          prompt: 'Ultra-modern glass skyscraper reflecting sunset clouds, architectural photography, perfect symmetry, dramatic perspective from below, Architectural Digest feature',
        },
      ]}
      details={`Imagen 4 Ultra — один из самых детализированных генераторов изображений. Если вам нужно максимальное качество — это хороший выбор.

Модель особенно хороша в фотореалистичных сценах. Текстуры, отражения, освещение — всё на высшем уровне.

Время генерации выше среднего, но результат того стоит для финальных версий.`}
      idealFor={[
        'Рекламные материалы премиум-класса',
        'Продуктовая фотография',
        'Кинематографические портреты',
        'Архитектурная визуализация',
        'Любые задачи требующие максимального качества',
      ]}
      tip="Используйте для финальных версий. Для итераций выбирайте более быстрые модели."
      actionHref="/"
    />
  );
}
