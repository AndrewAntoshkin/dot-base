'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function MMAudioPage() {
  return (
    <ModelPageTemplate
      name="MMAudio"
      familyName="Audio"
      familyHref="/docs/models/other"
      shortDescription="Генерация аудио для видео. Создаёт звуковое сопровождение на основе содержимого видео."
      description={`MMAudio — модель для автоматической генерации аудио к видео. Анализирует визуальное содержимое и создаёт соответствующее звуковое сопровождение.

Модель понимает контекст видео: если на экране лес — генерирует звуки природы, город — городской шум, разговор — голоса в фоне.

Идеально подходит для добавления атмосферного аудио к сгенерированному видео или немому контенту.`}
      specs={[
        { label: 'Тип', value: 'Video-to-Audio' },
        { label: 'Формат выхода', value: 'WAV, MP3' },
        { label: 'Качество', value: '44.1 kHz stereo' },
        { label: 'Длительность', value: 'По длине видео' },
        { label: 'Время генерации', value: '30 сек - 2 мин' },
      ]}
      limits={[
        { label: 'Входное видео', value: 'До 30 секунд' },
        { label: 'Форматы видео', value: 'MP4, MOV, WebM' },
        { label: 'Качество аудио', value: '44.1 kHz, 16-bit' },
      ]}
      promptExamples={[
        {
          title: 'Природа',
          prompt: 'Forest ambience with birds chirping, wind through leaves, peaceful atmosphere',
        },
        {
          title: 'Город',
          prompt: 'Busy city street sounds, cars passing, distant conversations, urban energy',
        },
        {
          title: 'Музыка',
          prompt: 'Upbeat electronic music, energetic rhythm, modern production',
        },
      ]}
      details={`MMAudio может генерировать разные типы аудио: эмбиентные звуки, музыку, звуковые эффекты.

Промпт помогает направить генерацию: опишите желаемую атмосферу или конкретные звуки. Без промпта модель сама определит подходящее аудио.

Результат можно использовать напрямую или как основу для дальнейшего звукового дизайна.`}
      idealFor={[
        'Озвучка AI-видео',
        'Атмосферные звуки для контента',
        'Быстрое прототипирование со звуком',
        'Фоновая музыка',
        'Звуковые эффекты',
      ]}
      tip="Опишите желаемое настроение аудио: 'mysterious', 'energetic', 'calm' — это влияет на результат."
      actionHref="/video"
    />
  );
}

