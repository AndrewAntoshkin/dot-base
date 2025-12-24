'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Kling21MasterPage() {
  return (
    <ModelPageTemplate
      name="Kling 2.1 Master"
      familyName="Kling"
      familyHref="/docs/models/kling"
      shortDescription="Сбалансированная версия с хорошим качеством и разумной скоростью генерации."
      description={`Kling 2.1 Master — это предыдущее поколение флагманской модели, которое остаётся отличным выбором для большинства задач.

Модель предлагает хороший баланс между качеством и скоростью генерации. Если вам не нужны максимальные возможности 2.5 PRO, Master справится быстрее.

Особенно хорошо подходит для более коротких видео и простых сцен, где полная мощность PRO не требуется.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou Technology' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p (1920×1080)' },
        { label: 'Макс. длительность', value: '5 секунд' },
        { label: 'Время генерации', value: '1-3 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '5 секунд' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
      ]}
      promptExamples={[
        {
          title: 'Простое движение',
          prompt: 'Portrait of a woman smiling, subtle head movement, natural blinking, soft lighting, photorealistic',
        },
        {
          title: 'Элемент окружения',
          prompt: 'Leaves falling from a tree in autumn park, gentle breeze, warm sunlight filtering through branches',
        },
        {
          title: 'Продуктовое видео',
          prompt: 'Perfume bottle rotating slowly on reflective surface, dramatic lighting, luxury product showcase, smooth motion',
        },
      ]}
      details={`Master версия быстрее PRO примерно в 1.5-2 раза при сопоставимом качестве для простых сцен. Для итеративной работы это может быть значительным преимуществом.

Ограничение в 5 секунд достаточно для большинства социальных форматов: Stories, Reels, TikTok тизеры.

Если результат Master вас устраивает — нет необходимости переключаться на PRO.`}
      idealFor={[
        'Короткие видео для соцсетей',
        'Итеративная работа над концепцией',
        'Простые сцены с одним субъектом',
        'Продуктовые демонстрации',
      ]}
      tip="Начните с Master для тестирования концепции, переключитесь на PRO если нужно больше длительности или качества."
      actionHref="/video"
    />
  );
}
