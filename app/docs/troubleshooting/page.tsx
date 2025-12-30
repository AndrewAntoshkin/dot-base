'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import { AlertCircle, CheckCircle, HelpCircle, Zap } from 'lucide-react';

const FAQ = [
  {
    question: 'Почему генерация занимает так долго?',
    answer: 'Время генерации зависит от модели и параметров. Видео-модели (Kling, Hailuo) работают дольше изображений — до нескольких минут. Высокое разрешение и длинные видео требуют больше времени. Если генерация висит более 10 минут — попробуйте перезапустить.',
  },
  {
    question: 'Модель не понимает мой промпт',
    answer: 'Используйте английский язык — модели обучены преимущественно на английских данных. Избегайте абстрактных понятий ("сделай красиво"). Описывайте конкретные визуальные характеристики: цвета, освещение, композицию, стиль.',
  },
  {
    question: 'Результат не похож на то, что я хотел',
    answer: 'Попробуйте: 1) Добавить больше деталей в промпт. 2) Использовать другую модель. 3) Изменить стиль (photorealistic, digital art, illustration). 4) Добавить negative prompt если модель его поддерживает.',
  },
  {
    question: 'Где найти мои предыдущие генерации?',
    answer: 'Все генерации сохраняются в истории. Перейдите в профиль и откройте раздел History. Там вы найдёте все ваши работы с возможностью скачать или использовать повторно.',
  },
  {
    question: 'Можно ли отменить генерацию?',
    answer: 'Да, вы можете отменить генерацию пока она в очереди. После начала обработки отмена невозможна, но вы можете просто не использовать результат.',
  },
  {
    question: 'Почему текст на изображении нечитаемый?',
    answer: 'Большинство моделей плохо генерируют текст. Для читаемого текста используйте Ideogram V3 или Recraft V3 — они специально оптимизированы для типографики. Указывайте текст в кавычках: text "YOUR TEXT".',
  },
  {
    question: 'Как сгенерировать несколько вариантов?',
    answer: 'Запустите генерацию несколько раз с одинаковым промптом — каждый раз результат будет отличаться. Некоторые модели поддерживают параметр num_outputs для генерации нескольких изображений за раз.',
  },
  {
    question: 'Что такое seed и зачем он нужен?',
    answer: 'Seed — это число, определяющее начальный "шум" генерации. Одинаковый seed + промпт = одинаковый результат. Полезно для воспроизведения удачных генераций или создания вариаций с небольшими изменениями.',
  },
];

const COMMON_ISSUES = [
  {
    issue: 'Артефакты и искажения на лицах',
    solutions: [
      'Используйте модели, оптимизированные для портретов (FLUX 2 Max, SeeDream)',
      'Добавьте "detailed face, clear features" в промпт',
      'Избегайте слишком маленького разрешения',
      'Не запрашивайте много людей в одном кадре',
    ],
  },
  {
    issue: 'Неправильное количество пальцев/конечностей',
    solutions: [
      'Это известная проблема AI-генерации, полностью избежать сложно',
      'Используйте Inpaint для исправления проблемных областей',
      'Избегайте крупных планов рук',
      'FLUX и SeeDream справляются лучше других',
    ],
  },
  {
    issue: 'Видео дёргается или имеет артефакты',
    solutions: [
      'Используйте качественное исходное изображение для Image-to-Video',
      'Избегайте сложных движений камеры',
      'Уменьшите длительность видео',
      'Попробуйте другую модель (Kling 2.5 PRO стабильнее)',
    ],
  },
  {
    issue: 'Генерация зависла или не завершается',
    solutions: [
      'Подождите — некоторые генерации занимают до 5-10 минут',
      'Обновите страницу и проверьте статус в очереди',
      'Попробуйте уменьшить параметры (разрешение, длительность)',
      'Если проблема повторяется — попробуйте позже',
    ],
  },
  {
    issue: 'Стиль не соответствует ожиданиям',
    solutions: [
      'Явно указывайте стиль: "photorealistic", "anime", "oil painting"',
      'Добавляйте референсы стиля: "in the style of studio ghibli"',
      'Используйте модель, подходящую для стиля (Recraft для иллюстраций)',
      'Экспериментируйте с ключевыми словами качества',
    ],
  },
];

const QUICK_FIXES = [
  {
    problem: 'Результат слишком тёмный',
    fix: 'Добавьте "bright lighting", "well-lit", "daylight"',
  },
  {
    problem: 'Результат слишком размытый',
    fix: 'Добавьте "sharp focus", "highly detailed", "8k resolution"',
  },
  {
    problem: 'Цвета слишком насыщенные',
    fix: 'Добавьте "muted colors", "soft tones", "natural palette"',
  },
  {
    problem: 'Изображение обрезано',
    fix: 'Добавьте "full body", "wide shot", "complete scene"',
  },
  {
    problem: 'Нет глубины/объёма',
    fix: 'Добавьте "depth of field", "3D", "volumetric lighting"',
  },
  {
    problem: 'Слишком "AI-шный" вид',
    fix: 'Добавьте "raw photo", "film grain", "imperfections"',
  },
];

export default function TroubleshootingPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Troubleshooting' },
      ]} />
      
      <DocsTitle description="Решения частых проблем и ответы на популярные вопросы. Если что-то пошло не так — ответ скорее всего здесь.">
        Troubleshooting
      </DocsTitle>

      {/* FAQ */}
      <DocsSection title="Частые вопросы">
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <div key={i} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="flex items-start gap-3 mb-2">
                <HelpCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-white font-inter">{item.question}</span>
              </div>
              <p className="pl-8 text-sm text-[#959595] font-inter leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Common Issues */}
      <DocsSection title="Решение проблем">
        <div className="space-y-4">
          {COMMON_ISSUES.map((item) => (
            <div key={item.issue} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-white" />
                <h4 className="text-sm font-bold text-white font-inter">{item.issue}</h4>
              </div>
              <ul className="space-y-2 pl-7">
                {item.solutions.map((solution, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#959595] font-inter">
                    <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Quick Fixes */}
      <DocsSection title="Быстрые исправления">
        <DocsInfoBox type="tip">
          Добавьте эти ключевые слова в промпт для быстрого решения типичных проблем.
        </DocsInfoBox>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_FIXES.map((item) => (
            <div key={item.problem} className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="text-sm text-white font-inter mb-1">{item.problem}</div>
              <code className="text-xs text-[#b0b0b0] font-inter">{item.fix}</code>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Still Need Help */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Zap className="w-8 h-8 text-white mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white font-inter mb-2">Не нашли ответ?</h3>
        <p className="text-sm text-[#959595] font-inter mb-4">
          Изучите документацию по моделям — там описаны особенности и ограничения каждой.
        </p>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

