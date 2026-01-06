'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function MoondreamPage() {
  return (
    <ModelPageTemplate
      name="Moondream 2"
      familyName="Analyze"
      familyHref="/docs/models/analyze"
      shortDescription="Компактная модель анализа изображений. Быстрые ответы на вопросы о картинке."
      description={`Moondream 2 — компактная и быстрая модель для анализа изображений и ответов на вопросы о них. Понимает содержимое изображения и отвечает на естественном языке.

Несмотря на небольшой размер, модель хорошо справляется с описанием сцен, идентификацией объектов и ответами на вопросы о содержимом.

Оптимальный выбор для быстрого анализа когда не нужны развёрнутые описания.`}
      specs={[
        { label: 'Тип', value: 'Vision Language Model' },
        { label: 'Размер', value: 'Компактная (~2B)' },
        { label: 'Время ответа', value: '1-3 секунды' },
        { label: 'Языки', value: 'Английский' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Длина ответа', value: 'До 500 токенов' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Описание',
          prompt: 'What is in this image?',
        },
        {
          title: 'Подсчёт',
          prompt: 'How many people are in this photo?',
        },
        {
          title: 'Детали',
          prompt: 'What color is the car?',
        },
      ]}
      details={`Moondream 2 отвечает на вопросы об изображениях:
- Что изображено на картинке?
- Сколько объектов определённого типа?
- Какого цвета/размера/формы объект?
- Что происходит на сцене?

Для более детального анализа и длинных описаний используйте LLaVa 13B.

Для генерации промптов из изображений используйте CLIP Interrogator.`}
      idealFor={[
        'Быстрый анализ изображений',
        'Ответы на вопросы',
        'Идентификация объектов',
        'Подсчёт элементов',
        'Базовое описание',
      ]}
      tip="Задавайте конкретные вопросы для получения точных ответов."
      actionHref="/analyze"
    />
  );
}

