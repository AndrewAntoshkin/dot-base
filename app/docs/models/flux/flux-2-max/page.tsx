'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Flux2MaxPage() {
  return (
    <ModelPageTemplate
      name="FLUX 2 Max"
      familyName="FLUX"
      familyHref="/docs/models/flux"
      shortDescription="Максимальное качество от Black Forest Labs. Лучшее следование промпту и поддержка до 8 референсных изображений."
      description={`FLUX 2 Max — флагманская модель от Black Forest Labs, представляющая вершину развития линейки FLUX. Это самая мощная модель семейства, оптимизированная для максимального качества генерации и точного следования сложным текстовым описаниям.

Модель использует улучшенную архитектуру Rectified Flow Transformers с увеличенным количеством параметров, что позволяет генерировать изображения с невероятной детализацией и фотореалистичностью.

FLUX 2 Max особенно хорош в понимании сложных многокомпонентных промптов, где другие модели могут терять детали или неправильно интерпретировать инструкции.`}
      specs={[
        { label: 'Разработчик', value: 'Black Forest Labs' },
        { label: 'Тип', value: 'Text-to-Image, Image-to-Image' },
        { label: 'Макс. разрешение', value: '2048 × 2048 px' },
        { label: 'Референсы', value: 'До 8 изображений' },
        { label: 'Время генерации', value: '15-30 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '2048 × 2048 px' },
        { label: 'Минимальное разрешение', value: '256 × 256 px' },
        { label: 'Максимальная длина промпта', value: '~500 токенов' },
        { label: 'Референсных изображений', value: 'До 8' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:2, 21:9' },
      ]}
      promptExamples={[
        {
          title: 'Кинематографический портрет',
          prompt: 'Cinematic portrait of a woman in her 30s with auburn hair, dramatic side lighting, shallow depth of field, shot on Arri Alexa, film grain, teal and orange color grading, 8k resolution',
        },
        {
          title: 'Продуктовая съёмка',
          prompt: 'Premium wireless headphones floating on pure white background, soft studio lighting, professional product photography, subtle reflections, minimalist aesthetic, advertisement quality',
        },
        {
          title: 'Фэнтези-иллюстрация',
          prompt: 'Ancient dragon perched on crystalline mountain peak at dawn, bioluminescent scales reflecting morning light, ethereal mist in valleys below, epic fantasy art, hyper-detailed, dramatic composition',
        },
      ]}
      details={`При использовании референсных изображений модель сохраняет консистентность персонажей, стилей и объектов между генерациями. Это делает FLUX 2 Max идеальным выбором для создания серий изображений с одним персонажем или в едином стиле.

Модель поддерживает различные соотношения сторон: от квадратных 1:1 до ультрашироких 21:9 и вертикальных 9:16 для Stories.

Рекомендуется использовать детальные промпты на английском языке для достижения наилучших результатов. Модель хорошо понимает художественные стили, освещение и композицию.`}
      idealFor={[
        'Высококачественные маркетинговые материалы',
        'Серии изображений с консистентными персонажами',
        'Сложные сцены с множеством элементов',
        'Фотореалистичные портреты и продуктовые съёмки',
        'Художественные иллюстрации с детальной проработкой',
      ]}
      tip="Для сохранения консистентности персонажа добавьте его фото как референс и опишите в промпте."
      actionHref="/"
    />
  );
}
