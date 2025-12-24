'use client';

import { ModelPageTemplate } from '@/components/docs/model-page-template';

export default function IdeogramV3Page() {
  return (
    <ModelPageTemplate
      name="Ideogram V3 Turbo"
      familyName="Ideogram"
      familyHref="/docs/models/ideogram"
      shortDescription="Лучшая модель для текста на изображениях. Безупречная типографика и стабильная генерация надписей."
      description={`Ideogram V3 Turbo — модель, созданная с фокусом на генерацию текста. Это, возможно, лучшая модель для создания изображений с надписями.

Текст — главная проблема большинства генераторов: буквы искажаются, слова становятся нечитаемыми. Ideogram решает эту проблему.

Turbo версия сочетает отличную генерацию текста с высокой скоростью, что делает её идеальной для коммерческих задач.`}
      specs={[
        { label: 'Разработчик', value: 'Ideogram AI' },
        { label: 'Тип', value: 'Text-to-Image' },
        { label: 'Макс. разрешение', value: '1536 × 1536 px' },
        { label: 'Генерация текста', value: 'Лучшая в классе' },
        { label: 'Время генерации', value: '8-12 сек' },
      ]}
      limits={[
        { label: 'Максимальное разрешение', value: '1536 × 1536 px' },
        { label: 'Минимальное разрешение', value: '512 × 512 px' },
        { label: 'Максимальная длина промпта', value: '~400 токенов' },
        { label: 'Максимальная длина текста', value: '~50 символов' },
        { label: 'Соотношения сторон', value: '1:1, 16:9, 9:16, 4:3' },
      ]}
      promptExamples={[
        {
          title: 'Обложка книги',
          prompt: 'Book cover design, title text "THE LAST VOYAGE" in elegant serif font, sailing ship on stormy sea, dramatic lightning, dark moody atmosphere',
        },
        {
          title: 'Мем или карточка',
          prompt: 'Birthday card design, text "HAPPY BIRTHDAY" in playful colorful letters, confetti and balloons, cheerful celebration theme, white background',
        },
        {
          title: 'Постер мероприятия',
          prompt: 'Music festival poster, text "SUMMER BEATS 2025" in bold modern typography, gradient sunset background, palm tree silhouettes, tropical vibes',
        },
      ]}
      details={`Ideogram V3 — выбор №1 когда нужен читаемый текст на изображении. Никакая другая модель не справляется лучше.

Используйте формат: text "YOUR TEXT" в промпте. Модель точно воспроизведёт надпись.

Ограничение: очень длинные тексты (более 50 символов) могут генерироваться с ошибками. Для коротких надписей — идеально.`}
      idealFor={[
        'Постеры и плакаты с текстом',
        'Обложки книг',
        'Логотипы и брендинг',
        'Карточки и приглашения',
        'Любой контент требующий надписей',
      ]}
      tip="Указывайте текст в кавычках: text \"YOUR TEXT\" — модель воспроизведёт его точно."
      actionHref="/"
    />
  );
}
