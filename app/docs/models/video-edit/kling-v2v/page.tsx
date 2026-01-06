'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function KlingV2VPage() {
  return (
    <ModelPageTemplate
      name="Kling O1 V2V"
      familyName="Kling"
      familyHref="/docs/models/video-edit"
      shortDescription="Video-to-Video от Kling. Стилизация и трансформация видео."
      description={`Kling O1 V2V — модель для трансформации существующего видео. Применяет стилистические изменения, сохраняя структуру движения оригинала.

Можно превратить реальное видео в анимацию, изменить атмосферу, добавить эффекты — всё сохраняя оригинальное движение и композицию.

Использует архитектуру Kling O1 с оптимизациями для video-to-video задач.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou' },
        { label: 'Тип', value: 'Video-to-Video' },
        { label: 'Разрешение', value: 'До 1080p' },
        { label: 'Время обработки', value: '3-8 минут' },
      ]}
      limits={[
        { label: 'Входное разрешение', value: 'До 1920×1080' },
        { label: 'Длительность', value: 'До 10 секунд' },
        { label: 'Форматы', value: 'MP4, MOV' },
      ]}
      promptExamples={[
        {
          title: 'Аниме стиль',
          prompt: 'Transform into anime style, vibrant colors, Studio Ghibli aesthetic',
        },
        {
          title: 'Киберпанк',
          prompt: 'Cyberpunk city, neon lights, futuristic atmosphere, blade runner style',
        },
        {
          title: 'Винтаж',
          prompt: 'Old film look, grainy texture, sepia tones, vintage 1920s aesthetic',
        },
      ]}
      details={`Kling O1 V2V сохраняет движение и структуру оригинального видео, изменяя только визуальный стиль.

Хорошо работает для:
- Стилизации под разные арт-направления
- Изменения атмосферы и настроения
- Добавления визуальных эффектов
- Создания альтернативных версий

Чем детальнее промпт описывает желаемый стиль, тем точнее результат.`}
      idealFor={[
        'Стилизация реального видео',
        'Создание арт-версий',
        'Изменение атмосферы',
        'Визуальные эксперименты',
        'Креативные проекты',
      ]}
      tip="Описывайте стиль детально: цвета, текстуры, референсы на известные стили."
      actionHref="/video"
    />
  );
}

