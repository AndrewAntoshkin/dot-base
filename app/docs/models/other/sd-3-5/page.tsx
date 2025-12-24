'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function SD35Page() {
  return (
    <ModelPageTemplate
      name="SD 3.5 Large"
      familyName="Другие модели"
      familyHref="/docs/models/other"
      shortDescription="Последняя версия Stable Diffusion от Stability AI. Open-source модель с хорошим качеством."
      description={`Stable Diffusion 3.5 Large — последняя версия легендарной open-source модели от Stability AI. Это одна из самых известных моделей генерации изображений.

SD 3.5 использует улучшенную архитектуру с лучшим пониманием промптов и более качественной генерацией. Поддерживает различные стили от фотореализма до аниме.

Как open-source модель, SD имеет огромное сообщество с множеством ресурсов, промптов и техник.`}
      specs={[
        { label: 'Разработчик', value: 'Stability AI' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1536 × 1536 px' },
        { label: 'Лицензия', value: 'Open-source' },
        { label: 'Время генерации', value: '12-18 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1536 × 1536 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3' },
      ]}
      promptExamples={[
        {
          title: 'Фотореалистичный портрет',
          prompt: 'Portrait of a young woman with green eyes, soft studio lighting, shallow depth of field, photorealistic, highly detailed skin texture, 8k',
        },
        {
          title: 'Аниме стиль',
          prompt: 'Anime girl with blue hair in sailor uniform, cherry blossom background, soft pastel colors, Studio Ghibli inspired, illustration',
        },
        {
          title: 'Фэнтези сцена',
          prompt: 'Magical forest with glowing mushrooms, fairy lights, mystical atmosphere, fantasy art, digital painting, artstation trending',
        },
      ]}
      details={`Stable Diffusion — это классика. Огромная база проверенных промптов и техник доступна онлайн.

Модель хорошо справляется с большинством задач. Не лучшая в каждой категории, но универсальная и надёжная.

Сообщество SD создало множество стилей и техник которые работают с этой моделью.`}
      idealFor={[
        'Универсальная генерация',
        'Эксперименты со стилями',
        'Использование проверенных промптов',
        'Аниме и иллюстрации',
        'Фэнтези арт',
      ]}
      tip="Ищите проверенные промпты в сообществе — для SD их больше всего."
      actionHref="/"
    />
  );
}
