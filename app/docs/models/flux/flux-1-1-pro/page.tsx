'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Flux11ProPage() {
  return (
    <ModelPageTemplate
      name="FLUX 1.1 Pro"
      familyName="FLUX"
      familyHref="/docs/models/flux"
      shortDescription="Проверенная временем модель первого поколения. Стабильная работа и предсказуемые результаты."
      description={`FLUX 1.1 Pro — это усовершенствованная версия оригинальной модели FLUX, которая остаётся популярной благодаря своей стабильности и предсказуемости результатов.

Несмотря на появление более новых версий, 1.1 Pro продолжает использоваться для задач, где важна консистентность и проверенное качество.

Модель хорошо изучена сообществом, и для неё существует множество проверенных промптов и техник.`}
      specs={[
        { label: 'Разработчик', value: 'Black Forest Labs' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1440 × 1440 px' },
        { label: 'Время генерации', value: '10-15 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1440 × 1440 px' },
        { label: 'Минимальное разрешение', value: '256 × 256 px' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3' },
      ]}
      promptExamples={[
        {
          title: 'Классический портрет',
          prompt: 'Portrait of an elderly man with weathered face, dramatic Rembrandt lighting, dark background, oil painting style, masterful brushwork, museum quality',
        },
        {
          title: 'Природный пейзаж',
          prompt: 'Misty mountain lake at sunrise, pine forest reflection in still water, fog rolling through valleys, landscape photography, Ansel Adams style, black and white',
        },
        {
          title: 'Концепт-арт',
          prompt: 'Futuristic space station interior, curved corridors with ambient lighting, holographic displays, sci-fi concept art, cinematic composition, detailed environment design',
        },
      ]}
      details={`FLUX 1.1 Pro — это надёжный выбор для тех, кто ценит стабильность. Модель ведёт себя предсказуемо, и вы можете рассчитывать на консистентные результаты.

Для этой модели существует обширная база проверенных промптов в сообществе. Если вы нашли работающий промпт — он будет работать стабильно.

Рекомендуется для задач, где важна воспроизводимость результатов.`}
      idealFor={[
        'Задачи требующие стабильности',
        'Воспроизводимые результаты',
        'Использование проверенных промптов',
        'Консистентная серийная генерация',
      ]}
      tip="Используйте проверенные промпты из сообщества для предсказуемых результатов."
      actionHref="/"
    />
  );
}
