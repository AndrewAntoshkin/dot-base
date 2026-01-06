'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function VideoMergePage() {
  return (
    <ModelPageTemplate
      name="Video Merge"
      familyName="Video Edit"
      familyHref="/docs/models/video-edit"
      shortDescription="Объединение видео с AI-переходами. Плавное слияние клипов."
      description={`Video Merge — инструмент для объединения нескольких видеоклипов с автоматическими AI-переходами. Создаёт плавные переходы между клипами.

В отличие от простой склейки, модель анализирует контент соседних клипов и генерирует естественные переходы между ними.

Идеально для создания единого видео из нескольких сгенерированных клипов.`}
      specs={[
        { label: 'Тип', value: 'Video Merge' },
        { label: 'Переходы', value: 'AI-генерируемые' },
        { label: 'Количество клипов', value: 'До 5' },
        { label: 'Время обработки', value: '1-3 минуты' },
      ]}
      limits={[
        { label: 'Разрешение', value: 'До 1080p' },
        { label: 'Общая длительность', value: 'До 60 секунд' },
        { label: 'Форматы', value: 'MP4, MOV' },
      ]}
      promptExamples={[
        {
          title: 'Плавный переход',
          prompt: 'Smooth crossfade transition between clips',
        },
        {
          title: 'Динамичный',
          prompt: 'Dynamic wipe transition, energetic feel',
        },
      ]}
      details={`Video Merge полезен когда:
- Нужно объединить несколько сгенерированных клипов
- Хотите плавные переходы вместо резких склеек
- Создаёте длинное видео из коротких сегментов

Модель подбирает стиль перехода на основе контента клипов или по вашему описанию.

Для базовой склейки без AI-переходов можно использовать обычные видеоредакторы.`}
      idealFor={[
        'Объединение AI-видео',
        'Создание длинных роликов',
        'Плавные переходы',
        'Монтаж без редактора',
        'Быстрая сборка контента',
      ]}
      tip="Для лучших результатов используйте клипы с похожим стилем и цветовой гаммой."
      actionHref="/video"
    />
  );
}

