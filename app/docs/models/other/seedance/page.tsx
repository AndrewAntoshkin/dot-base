'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function SeedancePage() {
  return (
    <ModelPageTemplate
      name="Seedance 1 Pro"
      familyName="Другие модели"
      familyHref="/docs/models/other"
      shortDescription="Модель видеогенерации для танцевальных и музыкальных видео. Синхронизация с ритмом."
      description={`Seedance 1 Pro — специализированная модель для генерации танцевальных видео. Создана для синхронизации движений с музыкой.

Модель понимает ритм и может генерировать персонажей выполняющих танцевальные движения. Особенно хороша для TikTok-style контента.

Поддерживает различные стили танца: от классического до современного уличного.`}
      specs={[
        { label: 'Разработчик', value: 'SeedDance Team' },
        { label: 'Тип', value: 'Dance Video Generation' },
        { label: 'Макс. разрешение', value: '1080p' },
        { label: 'Макс. длительность', value: '10 секунд' },
        { label: 'Время генерации', value: '3-5 минут' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '10 секунд' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Современный танец',
          prompt: 'Young dancer performing contemporary dance moves, flowing movements, studio with dramatic lighting, professional dance video',
        },
        {
          title: 'Hip-hop',
          prompt: 'Street dancer doing hip-hop moves, urban backdrop, streetwear outfit, energetic and dynamic, TikTok style video',
        },
        {
          title: 'K-pop хореография',
          prompt: 'K-pop idol performing choreography, colorful stage lighting, synchronized movements, music video aesthetic',
        },
      ]}
      details={`Seedance — нишевая модель для специфической задачи: танцевальные видео.

Если вам нужен персонаж выполняющий танцевальные движения — это лучший выбор. Для других типов видео используйте Kling или Hailuo.

Модель оптимизирована для вертикального формата 9:16 (TikTok, Reels).`}
      idealFor={[
        'TikTok контент',
        'Танцевальные ролики',
        'Музыкальные видео',
        'Хореографические демо',
      ]}
      tip="Используйте вертикальный формат 9:16 для лучших результатов."
      actionHref="/video"
    />
  );
}
