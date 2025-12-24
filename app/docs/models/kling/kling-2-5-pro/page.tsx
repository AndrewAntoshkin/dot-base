'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Kling25ProPage() {
  return (
    <ModelPageTemplate
      name="Kling 2.5 PRO"
      familyName="Kling"
      familyHref="/docs/models/kling"
      shortDescription="Флагманская модель видеогенерации от Kuaishou. Реалистичная физика, плавные движения, до 10 секунд видео."
      description={`Kling 2.5 PRO — это последняя флагманская модель от Kuaishou, представляющая передний край видеогенерации. Модель известна исключительной физической достоверностью движений и высокой стабильностью генерации.

Kling использует собственную архитектуру с 3D пространственно-временным вниманием, что позволяет генерировать видео с консистентными объектами и реалистичной физикой.

Особенно хорошо модель справляется с движениями людей, взаимодействием объектов и сложными сценами с множеством элементов.`}
      specs={[
        { label: 'Разработчик', value: 'Kuaishou Technology' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p (1920×1080)' },
        { label: 'Макс. длительность', value: '10 секунд' },
        { label: 'Время генерации', value: '2-5 минут' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Максимальная длительность', value: '10 секунд' },
        { label: 'Минимальная длительность', value: '2 секунды' },
        { label: 'FPS', value: '24' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1' },
        { label: 'Размер входного изображения', value: 'До 4096 × 4096 px' },
      ]}
      promptExamples={[
        {
          title: 'Движение персонажа',
          prompt: 'A woman in a flowing white dress walking through a wheat field at golden hour, hair blowing in the wind, cinematic camera tracking shot, slow motion',
        },
        {
          title: 'Динамичная сцена',
          prompt: 'Racing car drifting around a corner on a mountain road, smoke from tires, dramatic angle, action movie style, high speed motion',
        },
        {
          title: 'Природа и атмосфера',
          prompt: 'Time-lapse of clouds moving over mountain peaks at sunrise, mist flowing through valleys, epic landscape, aerial perspective',
        },
      ]}
      details={`Kling 2.5 PRO — это выбор для задач где важна физическая достоверность. Движения людей, взаимодействие объектов, динамика ткани — всё это выглядит естественно.

Модель поддерживает два режима: Text-to-Video (генерация с нуля) и Image-to-Video (оживление изображения). Image-to-Video даёт больше контроля и рекомендуется для сложных сцен.

Генерация занимает несколько минут — это нормально для видео такого качества. Планируйте время соответственно.`}
      idealFor={[
        'Промо-ролики и рекламные видео',
        'Оживление фотографий и иллюстраций',
        'Контент для социальных сетей',
        'Превиз для видеопроизводства',
        'Сцены с движением людей',
      ]}
      tip="Используйте Image-to-Video для большего контроля. Сначала создайте идеальный кадр, затем оживите."
      actionHref="/video"
    />
  );
}
