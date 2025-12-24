'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function RecraftV3SvgPage() {
  return (
    <ModelPageTemplate
      name="Recraft V3 SVG"
      familyName="Recraft"
      familyHref="/docs/models/recraft"
      shortDescription="Генерация векторных изображений в формате SVG. Масштабируемая графика без потери качества."
      description={`Recraft V3 SVG — уникальная модель для генерации векторной графики. Результат — настоящий SVG файл, который можно масштабировать без потери качества.

В отличие от растровых изображений, SVG можно редактировать в Adobe Illustrator, Figma или любом векторном редакторе.

Идеально для иконок, логотипов, иллюстраций для сайтов и любой графики требующей масштабирования.`}
      specs={[
        { label: 'Разработчик', value: 'Recraft AI' },
        { label: 'Тип', value: 'Text-to-SVG' },
        { label: 'Формат вывода', value: 'SVG (векторный)' },
        { label: 'Масштабирование', value: 'Бесконечное' },
        { label: 'Время генерации', value: '15-25 сек' },
      ]}
      limits={[
        { label: 'Формат вывода', value: 'SVG' },
        { label: 'Сложность', value: 'До ~1000 путей' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Стили', value: 'Flat, Line art, Icon' },
      ]}
      promptExamples={[
        {
          title: 'Иконка',
          prompt: 'Simple icon of a rocket ship, single color, minimal design, suitable for app icon, flat style',
        },
        {
          title: 'Логотип',
          prompt: 'Abstract geometric logo mark, overlapping circles, gradient from blue to purple, modern tech company style',
        },
        {
          title: 'Иллюстрация',
          prompt: 'Flat vector illustration of mountain landscape, minimalist style, limited color palette, three layers of hills',
        },
      ]}
      details={`Recraft V3 SVG — единственная модель генерирующая настоящий вектор. Результат можно открыть в Illustrator и редактировать каждый элемент.

Лучше всего работает с простыми формами: иконки, логотипы, минималистичные иллюстрации. Сложные детальные сцены могут генерироваться с артефактами.

Цвета и формы редактируемы после генерации — это главное преимущество перед растром.`}
      idealFor={[
        'Иконки и UI элементы',
        'Логотипы',
        'Инфографика',
        'Иллюстрации для сайтов',
        'Графика для печати любого размера',
      ]}
      tip="Для лучших результатов используйте простые формы и ограниченную палитру цветов."
      actionHref="/"
    />
  );
}
