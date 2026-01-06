'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function BLIP2Page() {
  return (
    <ModelPageTemplate
      name="BLIP-2"
      familyName="Analyze"
      familyHref="/docs/models/analyze"
      shortDescription="Captioning от Salesforce. Качественные подписи к изображениям."
      description={`BLIP-2 — модель от Salesforce Research для генерации подписей к изображениям. Создаёт естественные, информативные описания визуального контента.

Модель использует архитектуру Q-Former для эффективного соединения визуального энкодера с языковой моделью.

Отлично подходит для автоматической генерации alt-текстов и подписей.`}
      specs={[
        { label: 'Разработчик', value: 'Salesforce Research' },
        { label: 'Тип', value: 'Image Captioning' },
        { label: 'Архитектура', value: 'Q-Former' },
        { label: 'Время ответа', value: '2-5 секунд' },
      ]}
      limits={[
        { label: 'Входное изображение', value: 'До 2048 × 2048 px' },
        { label: 'Длина подписи', value: 'До 200 токенов' },
        { label: 'Форматы', value: 'PNG, JPG, WebP' },
      ]}
      promptExamples={[
        {
          title: 'Стандартная подпись',
          prompt: 'Generate a caption for this image',
        },
        {
          title: 'Детальная',
          prompt: 'Describe this image in detail',
        },
      ]}
      details={`BLIP-2 оптимизирован для генерации подписей:
- Краткие, информативные описания
- Естественный язык
- Фокус на главных элементах
- Контекстуально релевантные детали

Для вопросов и диалога лучше использовать LLaVa.

Для генерации промптов для AI — CLIP Interrogator.`}
      idealFor={[
        'Alt-тексты для accessibility',
        'Автоматические подписи',
        'Каталогизация изображений',
        'SEO описания',
        'Контент-менеджмент',
      ]}
      tip="BLIP-2 генерирует краткие подписи — для длинных описаний используйте LLaVa."
      actionHref="/analyze"
    />
  );
}

