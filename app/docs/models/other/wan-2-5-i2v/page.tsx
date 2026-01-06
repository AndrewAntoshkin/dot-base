'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Wan25I2VPage() {
  return (
    <ModelPageTemplate
      name="Wan 2.5 I2V"
      familyName="Wan Video"
      familyHref="/docs/models/other"
      shortDescription="Image-to-Video модель от Wan. Оживление изображений с высоким качеством."
      description={`Wan 2.5 I2V — модель для оживления статичных изображений. Превращает фотографии и иллюстрации в плавное видео с естественным движением.

Модель хорошо понимает физику объектов и создаёт реалистичные движения: развевающиеся волосы, колыхающаяся ткань, движение воды и облаков.

Отлично подходит для создания "живых" фотографий для социальных сетей и рекламных материалов.`}
      specs={[
        { label: 'Разработчик', value: 'Wan Video' },
        { label: 'Тип', value: 'Image-to-Video' },
        { label: 'Макс. разрешение', value: '720p' },
        { label: 'Макс. длительность', value: '5 секунд' },
        { label: 'Время генерации', value: '1-2 минуты' },
      ]}
      limits={[
        { label: 'Разрешение', value: '1280×720, 720×1280, 1024×1024' },
        { label: 'Максимальная длительность', value: '5 секунд' },
        { label: 'Входное изображение', value: 'Любой размер (будет масштабировано)' },
      ]}
      promptExamples={[
        {
          title: 'Портрет',
          prompt: 'Woman slightly turning head and smiling, hair gently moving, soft breeze, natural movement',
        },
        {
          title: 'Пейзаж',
          prompt: 'Clouds slowly moving across sky, trees swaying in wind, peaceful nature scene',
        },
        {
          title: 'Продукт',
          prompt: 'Product rotating slowly, studio lighting, professional showcase, smooth 360 rotation',
        },
      ]}
      details={`Wan 2.5 I2V Fast — быстрая версия с ускоренной генерацией. Качество немного ниже, но подходит для быстрых итераций.

Для наилучших результатов используйте качественные входные изображения с хорошим освещением. Модель лучше работает с простыми композициями.

Промпт должен описывать желаемое движение, а не статичную сцену.`}
      idealFor={[
        'Оживление портретных фотографий',
        'Создание "живых" обоев',
        'Динамичные посты в соцсетях',
        'Анимация иллюстраций',
        'Превью для видеопроектов',
      ]}
      tip="Описывайте движение в промпте: 'wind blowing hair', 'clouds drifting', 'water rippling'."
      actionHref="/video"
    />
  );
}

