'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';

const TIPS = [
  {
    category: 'Скорость генерации',
    tips: [
      {
        title: 'Используйте Turbo-версии моделей',
        description: 'FLUX 2 Pro, Ideogram V3 Turbo, Kling Turbo — быстрее без значительной потери качества.',
      },
      {
        title: 'Меньшее разрешение для тестов',
        description: 'Начните с 1024×1024, увеличьте только для финального результата.',
      },
      {
        title: 'Короткие видео для итераций',
        description: 'Для видео используйте 5 секунд вместо 10 при тестировании промптов.',
      },
    ],
  },
  {
    category: 'Качество результата',
    tips: [
      {
        title: 'Детальные промпты',
        description: 'Чем подробнее описание, тем ближе результат к ожиданиям. Указывайте стиль, освещение, композицию.',
      },
      {
        title: 'Используйте референсы',
        description: 'Image-to-Image даёт больше контроля. Загрузите референс и опишите изменения.',
      },
      {
        title: 'Итерируйте',
        description: 'Редко получается идеально с первого раза. Корректируйте промпт на основе результата.',
      },
    ],
  },
  {
    category: 'Работа с текстом',
    tips: [
      {
        title: 'Ideogram и Recraft для текста',
        description: 'Только эти модели гарантируют читаемый текст. FLUX тоже неплох, остальные — лотерея.',
      },
      {
        title: 'Кавычки для точного текста',
        description: 'Используйте: text "YOUR TEXT HERE" — модель точнее воспроизведёт надпись.',
      },
      {
        title: 'Простые слова работают лучше',
        description: 'Короткие слова и фразы генерируются лучше. Избегайте длинных предложений.',
      },
    ],
  },
  {
    category: 'Видеогенерация',
    tips: [
      {
        title: 'Начинайте с изображения',
        description: 'Image-to-Video даёт больше контроля. Сначала сгенерируйте идеальный кадр, затем оживите.',
      },
      {
        title: 'Описывайте движение',
        description: '"Walking", "running", "camera slowly panning" — модель должна понимать что должно двигаться.',
      },
      {
        title: 'Избегайте сложных сцен',
        description: 'Один персонаж, простое действие = лучший результат. Сложные сцены часто ломаются.',
      },
    ],
  },
  {
    category: 'Стили и эстетика',
    tips: [
      {
        title: 'Указывайте стиль явно',
        description: '"Photorealistic", "digital art", "oil painting", "anime style" — модель подстроится.',
      },
      {
        title: 'Добавляйте качество',
        description: '"8k", "highly detailed", "professional photography" улучшают детализацию.',
      },
      {
        title: 'Освещение важно',
        description: '"Golden hour", "studio lighting", "dramatic shadows" создают атмосферу.',
      },
    ],
  },
  {
    category: 'Редактирование',
    tips: [
      {
        title: 'FLUX Kontext для стиля',
        description: 'Если нужно изменить что-то сохраняя стиль оригинала — FLUX Kontext лучший выбор.',
      },
      {
        title: 'Точная маска для Inpaint',
        description: 'Рисуйте маску аккуратно. Слишком большая маска — непредсказуемый результат.',
      },
      {
        title: 'Outpaint по частям',
        description: 'Расширяйте в одном направлении за раз для лучшего контроля.',
      },
    ],
  },
];

const DOS_AND_DONTS = {
  do: [
    'Начинайте с простых промптов и усложняйте',
    'Используйте английский язык для лучших результатов',
    'Сохраняйте удачные промпты в заметки',
    'Экспериментируйте с разными моделями',
    'Используйте Analyze для изучения референсов',
  ],
  dont: [
    'Не ожидайте идеального результата с первого раза',
    'Не используйте слишком длинные промпты (>300 слов)',
    'Не смешивайте противоречивые стили',
    'Не игнорируйте negative prompts (где доступны)',
    'Не используйте модели не по назначению',
  ],
};

export default function TipsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Tips & Tricks' },
      ]} />
      
      <DocsTitle description="Практические советы для получения лучших результатов от AI-генерации. Проверенные методы от опытных пользователей.">
        Tips & Tricks
      </DocsTitle>

      <DocsInfoBox>
        Главный совет: экспериментируйте! Каждая модель уникальна, и лучший способ понять её — пробовать разные промпты и настройки.
      </DocsInfoBox>

      {/* Tips by Category */}
      {TIPS.map((category) => (
        <DocsSection key={category.category} title={category.category}>
          <div className="space-y-3">
            {category.tips.map((tip, index) => (
              <div 
                key={index}
                className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]"
              >
                <h4 className="text-sm font-medium text-white font-inter mb-1">{tip.title}</h4>
                <p className="text-sm text-[#959595] font-inter">{tip.description}</p>
              </div>
            ))}
          </div>
        </DocsSection>
      ))}

      {/* Do's and Don'ts */}
      <DocsSection title="Рекомендации">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-medium text-white font-inter mb-3">
              Делайте
            </h4>
            <ul className="space-y-2">
              {DOS_AND_DONTS.do.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#959595] font-inter">
                  <span className="text-white mt-0.5">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-medium text-white font-inter mb-3">
              Не делайте
            </h4>
            <ul className="space-y-2">
              {DOS_AND_DONTS.dont.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#959595] font-inter">
                  <span className="text-white mt-0.5">−</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
