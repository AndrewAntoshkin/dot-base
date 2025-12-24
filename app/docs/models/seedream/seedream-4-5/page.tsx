'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function SeeDream45Page() {
  return (
    <ModelPageTemplate
      name="SeeDream 4.5"
      familyName="SeeDream"
      familyHref="/docs/models/seedream"
      shortDescription="Новейшая модель от ByteDance с поддержкой редактирования. Отличная анатомия и естественные позы."
      description={`SeeDream 4.5 — последняя модель генерации изображений от ByteDance (создатели TikTok). Известна превосходной анатомией человека и естественными позами.

Модель поддерживает как генерацию, так и редактирование изображений. Это делает её универсальным инструментом для полного цикла работы.

Особенно хорошо справляется с портретами, фигурами в движении и сложными позами — там где другие модели часто ошибаются.`}
      specs={[
        { label: 'Разработчик', value: 'ByteDance' },
        { label: 'Тип', value: 'Text-to-Image, Image Editing' },
        { label: 'Макс. разрешение', value: '2048 × 2048 px' },
        { label: 'Режим редактирования', value: 'Да' },
        { label: 'Время генерации', value: '12-18 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '2048 × 2048 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:2' },
        { label: 'Редактирование', value: 'Поддерживается' },
      ]}
      promptExamples={[
        {
          title: 'Динамичный портрет',
          prompt: 'Dynamic action pose of a martial artist mid-kick, flowing robes, motion blur, dramatic studio lighting, professional sports photography',
        },
        {
          title: 'Фигура в окружении',
          prompt: 'Young woman sitting cross-legged on floor reading book, cozy living room with plants, natural window lighting, lifestyle photography',
        },
        {
          title: 'Группа людей',
          prompt: 'Group of friends laughing together at outdoor cafe, candid moment, warm summer afternoon, documentary style photography',
        },
      ]}
      details={`SeeDream 4.5 — один из лучших выборов для изображений с людьми. Анатомия, позы, руки — всё на высоте.

Режим редактирования работает аналогично FLUX Kontext: опишите изменения текстом без маски. Полезно для итеративной работы.

Модель обучена на большом количестве TikTok контента, что делает её отличной для современного lifestyle-стиля.`}
      idealFor={[
        'Портреты и фигуры',
        'Динамичные позы',
        'Lifestyle-контент',
        'Изображения с несколькими людьми',
        'Редактирование существующих фото',
      ]}
      tip="Для сложных поз используйте референсное изображение с похожей позой."
      actionHref="/"
    />
  );
}
