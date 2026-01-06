'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function LLaVAPage() {
  return (
    <ModelPageTemplate
      name="LLaVa 13B"
      familyName="Analyze"
      familyHref="/docs/models/analyze"
      shortDescription="Продвинутый анализ изображений. Детальные описания и сложные вопросы."
      description={`LLaVa 13B (Large Language-and-Vision Assistant) — мощная модель для глубокого анализа изображений. Комбинирует визуальное понимание с языковыми способностями большой языковой модели.

Способна генерировать развёрнутые описания, отвечать на сложные вопросы, анализировать контекст и связи между объектами.

Лучший выбор когда нужен детальный анализ и осмысленные ответы.`}
      specs={[
        { label: 'Тип', value: 'Vision Language Model' },
        { label: 'Размер', value: '13B параметров' },
        { label: 'Время ответа', value: '3-10 секунд' },
        { label: 'Языки', value: 'Многоязычный' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Длина ответа', value: 'До 2000 токенов' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Детальное описание',
          prompt: 'Describe this image in detail, including the mood, composition, and notable elements.',
        },
        {
          title: 'Анализ',
          prompt: 'What story does this image tell? What might have happened before and after this moment?',
        },
        {
          title: 'Технический анализ',
          prompt: 'Analyze the lighting, color palette, and photographic techniques used in this image.',
        },
      ]}
      details={`LLaVa 13B превосходит компактные модели в:
- Развёрнутых описаниях сцен
- Анализе настроения и атмосферы
- Понимании контекста и отношений
- Ответах на сложные, многоступенчатые вопросы
- Творческой интерпретации

Работает медленнее Moondream, но даёт более глубокий анализ.

Поддерживает вопросы на разных языках.`}
      idealFor={[
        'Детальный анализ изображений',
        'Сложные вопросы',
        'Описание для accessibility',
        'Анализ художественных работ',
        'Контент-модерация',
      ]}
      tip="Для лучших результатов формулируйте вопросы развёрнуто, указывая что именно вас интересует."
      actionHref="/analyze"
    />
  );
}

