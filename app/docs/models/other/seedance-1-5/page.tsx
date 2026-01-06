'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function Seedance15ProPage() {
  return (
    <ModelPageTemplate
      name="Seedance 1.5 Pro"
      familyName="Seedance"
      familyHref="/docs/models/other"
      shortDescription="Улучшенная версия от ByteDance. Премиум качество до 1080p, до 10 секунд видео."
      description={`Seedance 1.5 Pro — обновлённая флагманская модель видеогенерации от ByteDance. Это улучшенная версия Seedance 1 Pro с более качественной физикой движений и лучшей стабильностью генерации.

Модель использует архитектуру DiT (Diffusion Transformer) с улучшенным пространственно-временным вниманием, что позволяет создавать видео с плавными переходами и консистентными объектами.

Seedance 1.5 Pro особенно хорош для создания динамичных сцен с движением людей и сложных композиций.`}
      specs={[
        { label: 'Разработчик', value: 'ByteDance' },
        { label: 'Тип', value: 'Text-to-Video, Image-to-Video' },
        { label: 'Макс. разрешение', value: '1080p (1920×1080)' },
        { label: 'Макс. длительность', value: '10 секунд' },
        { label: 'Время генерации', value: '2-4 минуты' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1920 × 1080 px' },
        { label: 'Варианты разрешения', value: '480p, 720p, 1080p' },
        { label: 'Максимальная длительность', value: '10 секунд' },
        { label: 'Соотношения сторон', value: '16:9, 9:16, 1:1, 4:3, 3:4' },
      ]}
      promptExamples={[
        {
          title: 'Танец',
          prompt: 'Professional dancer performing contemporary dance in empty studio, dramatic spotlight, fluid movements, slow motion, artistic cinematography',
        },
        {
          title: 'Природа',
          prompt: 'Waterfall cascading into crystal clear pool in tropical jungle, mist rising, sunlight filtering through canopy, peaceful atmosphere',
        },
        {
          title: 'Городская динамика',
          prompt: 'Busy city intersection at night, cars and pedestrians, neon lights reflecting on wet pavement, timelapse effect, cinematic',
        },
      ]}
      details={`Seedance 1.5 Pro предлагает отличный баланс между качеством и скоростью генерации. Модель хорошо справляется с различными стилями — от фотореалистичных сцен до стилизованной анимации.

Поддерживает как Text-to-Video (генерация с нуля), так и Image-to-Video (оживление изображения). Для более предсказуемых результатов рекомендуется использовать Image-to-Video.

Модель понимает описания камеры: "tracking shot", "zoom in", "pan left" и другие.`}
      idealFor={[
        'Рекламные и промо-ролики',
        'Контент для социальных сетей',
        'Оживление фотографий',
        'Динамичные сцены с людьми',
        'Музыкальные визуализации',
      ]}
      tip="Для лучших результатов с людьми используйте Image-to-Video и качественное фото как входной кадр."
      actionHref="/video"
    />
  );
}

