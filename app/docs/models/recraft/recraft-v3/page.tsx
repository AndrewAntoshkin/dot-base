'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function RecraftV3Page() {
  return (
    <ModelPageTemplate
      name="Recraft V3"
      familyName="Recraft"
      familyHref="/docs/models/recraft"
      shortDescription="Специализированная модель для иллюстраций и дизайна. Отличный текст на изображениях."
      description={`Recraft V3 — модель, созданная специально для дизайнеров и иллюстраторов. Отличается превосходной генерацией текста и чистыми векторными стилями.

Одна из немногих моделей, которая стабильно генерирует читаемый текст на изображениях. Если вам нужна надпись — Recraft справится.

Поддерживает множество стилей: от фотореализма до плоских иллюстраций и иконок.`}
      specs={[
        { label: 'Разработчик', value: 'Recraft AI' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '2048 × 2048 px' },
        { label: 'Генерация текста', value: 'Отличная' },
        { label: 'Время генерации', value: '12-18 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '2048 × 2048 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3, 3:2' },
        { label: 'Текст в изображении', value: 'Поддерживается' },
      ]}
      promptExamples={[
        {
          title: 'Логотип с текстом',
          prompt: 'Minimalist logo design for coffee shop, text "BREW LAB" in modern sans-serif font, steam rising from cup icon, clean lines, flat design',
        },
        {
          title: 'Плакат',
          prompt: 'Vintage travel poster for Tokyo Japan, text "VISIT TOKYO" in retro typography, Mount Fuji and cherry blossoms, 1960s aesthetic',
        },
        {
          title: 'Иллюстрация',
          prompt: 'Flat vector illustration of woman working on laptop in modern office, geometric shapes, limited color palette, corporate style',
        },
      ]}
      details={`Recraft V3 — лучший выбор когда в изображении нужен текст. Указывайте текст в кавычках: text "YOUR TEXT" — модель воспроизведёт его точно.

Поддерживает различные стили: realistic, digital illustration, vector art, icon design. Указывайте стиль явно в промпте.

Отлично подходит для создания мокапов, логотипов, постеров и маркетинговых материалов.`}
      idealFor={[
        'Логотипы и брендинг',
        'Постеры и плакаты',
        'Иллюстрации для сайтов',
        'Маркетинговые материалы',
        'Любой контент с текстом',
      ]}
      tip="Для точного текста используйте формат: text \"YOUR TEXT HERE\" в промпте."
      actionHref="/"
    />
  );
}
