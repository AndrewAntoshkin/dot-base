'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function LumaReframePage() {
  return (
    <ModelPageTemplate
      name="Luma Reframe Video"
      familyName="Luma"
      familyHref="/docs/models/video-edit"
      shortDescription="Изменение соотношения сторон видео. AI-расширение кадра."
      description={`Luma Reframe Video — модель для изменения соотношения сторон видео без потери контента. Расширяет кадр, генерируя продолжение сцены.

Превращайте вертикальное видео (9:16) в горизонтальное (16:9) или наоборот — без обрезки важного контента. AI дорисует недостающие области.

Идеально для адаптации контента под разные платформы: YouTube, TikTok, Instagram.`}
      specs={[
        { label: 'Разработчик', value: 'Luma AI' },
        { label: 'Тип', value: 'Video Reframe' },
        { label: 'Направления', value: 'Все стороны' },
        { label: 'Время обработки', value: '2-5 минут' },
      ]}
      limits={[
        { label: 'Входное разрешение', value: 'До 1080p' },
        { label: 'Длительность', value: 'До 10 секунд' },
        { label: 'Форматы', value: 'MP4, MOV, WebM' },
      ]}
      promptExamples={[
        {
          title: 'Вертикальное в горизонтальное',
          prompt: 'Expand sides to create 16:9 format, continue the background naturally',
        },
        {
          title: 'Горизонтальное в квадрат',
          prompt: 'Add space above and below for 1:1 format, extend the scene',
        },
      ]}
      details={`Luma Reframe анализирует видео и генерирует согласованное продолжение по бокам/сверху/снизу.

Отлично работает с:
- Видео с простыми фонами
- Пейзажами и природой
- Статичными сценами
- Контентом для адаптации под соцсети

Для сложных сцен с движущимися объектами на краях кадра результат может быть менее точным.`}
      idealFor={[
        'Адаптация под разные соцсети',
        'Изменение формата без обрезки',
        'Создание широкоформатных версий',
        'Подготовка для разных платформ',
        'Сохранение контента при смене формата',
      ]}
      tip="Лучше всего работает с видео где главный объект в центре, а края — фон."
      actionHref="/video"
    />
  );
}

