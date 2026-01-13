'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight, Image, Video, Wand2, CheckCircle } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Выберите функцию',
    description: 'На главной странице выберите что хотите создать: Image для изображений, Video для видео, Inpaint для редактирования части изображения и т.д.',
    tip: 'Начните с Image — это самая простая и быстрая функция для знакомства с платформой.',
  },
  {
    number: '02',
    title: 'Выберите модель',
    description: 'Каждая функция поддерживает несколько моделей. Модели отличаются стилем, скоростью и возможностями. Наведите на модель чтобы увидеть описание.',
    tip: 'Для первой генерации рекомендуем FLUX 2 Pro — быстрая и качественная модель.',
  },
  {
    number: '03',
    title: 'Напишите промпт',
    description: 'Опишите что хотите получить на английском языке. Чем детальнее описание — тем точнее результат. Укажите стиль, освещение, композицию.',
    tip: 'Используйте английский для лучших результатов. Русский тоже работает, но английский понимается моделями лучше.',
  },
  {
    number: '04',
    title: 'Настройте параметры',
    description: 'Выберите размер изображения, соотношение сторон и другие параметры модели. Каждая модель имеет свои уникальные настройки.',
    tip: 'Для тестов используйте стандартные настройки. Экспериментируйте после получения первых результатов.',
  },
  {
    number: '05',
    title: 'Запустите генерацию',
    description: 'Нажмите кнопку генерации. Процесс займёт от нескольких секунд до нескольких минут в зависимости от модели и параметров.',
    tip: 'Вы можете запустить несколько генераций одновременно — они будут выполняться параллельно.',
  },
  {
    number: '06',
    title: 'Сохраните результат',
    description: 'Готовое изображение или видео появится на странице. Нажмите на него чтобы открыть в полном размере. Используйте кнопку скачивания для сохранения.',
    tip: 'Все генерации сохраняются в истории. Вы всегда можете вернуться к ним позже.',
  },
];

const FIRST_PROMPTS = [
  {
    category: 'Простой портрет',
    prompt: 'Portrait of a young woman with blue eyes, natural lighting, soft bokeh background, photorealistic',
    model: 'FLUX 2 Pro',
  },
  {
    category: 'Пейзаж',
    prompt: 'Mountain landscape at sunset, misty valleys, golden hour lighting, cinematic, 8k',
    model: 'SeeDream 4.5',
  },
  {
    category: 'Продукт',
    prompt: 'White sneakers on marble surface, studio lighting, product photography, minimalist',
    model: 'FLUX 2 Max',
  },
];

const COMMON_MISTAKES = [
  {
    wrong: 'Красивая картинка',
    right: 'Portrait of a woman in a red dress, golden hour lighting, cinematic composition',
    reason: 'Слишком общее описание. Модель не понимает что именно вы хотите.',
  },
  {
    wrong: 'Сделай как у Apple',
    right: 'Minimalist product photo, white background, soft shadows, clean aesthetic',
    reason: 'Модель не знает бренды. Опишите визуальные характеристики напрямую.',
  },
  {
    wrong: 'Очень длинный промпт на 500 слов с кучей деталей и повторений...',
    right: 'Focused prompt with key details: subject, style, lighting, composition',
    reason: 'Слишком длинные промпты размывают фокус. 50-150 слов — оптимально.',
  },
];

const TABLE_OF_CONTENTS = [
  { id: 'steps', title: 'Шаг за шагом', level: 2 },
  { id: 'first-prompts', title: 'Первые промпты', level: 2 },
  { id: 'mistakes', title: 'Частые ошибки', level: 2 },
  { id: 'next', title: 'Что дальше?', level: 2 },
];

export default function QuickStartPage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Quick Start' },
      ]} />
      
      <DocsTitle description="Создайте первую генерацию за 5 минут. Пошаговое руководство для новых пользователей.">
        Quick Start
      </DocsTitle>

      <DocsInfoBox type="tip">
        Эта страница поможет вам быстро освоить основы платформы. После прочтения вы сможете создавать качественные изображения и видео.
      </DocsInfoBox>

      {/* Steps */}
      <DocsSection title="Шаг за шагом" id="steps">
        <div className="space-y-3">
          {STEPS.map((step, index) => (
            <div 
              key={step.number}
              className="p-4 rounded-xl border border-[#262626] hover:border-[#444] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl border border-[#333] flex items-center justify-center flex-shrink-0 text-[13px] font-medium text-[#888]">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-[14px] font-medium text-white mb-1">{step.title}</h3>
                  <p className="text-[13px] text-[#888] mb-3">{step.description}</p>
                  <div className="p-3 rounded-xl border border-[#262626] bg-[#0a0a0a]">
                    <span className="text-[12px] text-[#666] uppercase mr-2">Совет:</span>
                    <span className="text-[13px] text-[#888]">{step.tip}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* First Prompts */}
      <DocsSection title="Ваши первые промпты" id="first-prompts">
        <p className="text-[13px] text-[#888] mb-4">
          Скопируйте один из этих промптов для первой генерации:
        </p>
        <div className="space-y-3">
          {FIRST_PROMPTS.map((item) => (
            <div key={item.category} className="p-4 rounded-xl border border-[#262626]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-medium text-white">{item.category}</span>
                <span className="px-2 py-1 border border-[#333] rounded text-[12px] text-[#666]">{item.model}</span>
              </div>
              <code className="block p-3 bg-[#0a0a0a] border border-[#262626] rounded-xl text-[13px] text-[#888] font-mono">
                {item.prompt}
              </code>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Common Mistakes */}
      <DocsSection title="Частые ошибки новичков" id="mistakes">
        <div className="space-y-3">
          {COMMON_MISTAKES.map((mistake, i) => (
            <div key={i} className="p-4 rounded-xl border border-[#262626]">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-[12px] text-[#666] uppercase mb-1 block">Плохо</span>
                  <code className="block p-2 bg-[#0a0a0a] border border-[#262626] rounded text-[13px] text-[#666] font-mono line-through">
                    {mistake.wrong}
                  </code>
                </div>
                <div>
                  <span className="text-[12px] text-white uppercase mb-1 block">Хорошо</span>
                  <code className="block p-2 bg-[#0a0a0a] border border-[#262626] rounded text-[13px] text-[#888] font-mono">
                    {mistake.right}
                  </code>
                </div>
              </div>
              <p className="text-[13px] text-[#666]">{mistake.reason}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* What's Next */}
      <DocsSection title="Что дальше?" id="next">
        <div className="grid grid-cols-3 gap-3">
          <Link 
            href="/docs/models"
            className="p-4 rounded-xl border border-[#262626] hover:border-[#444] hover:bg-[#0a0a0a] transition-all group"
          >
            <Image className="w-5 h-5 text-[#666] group-hover:text-white mb-3 transition-colors" />
            <h4 className="text-[14px] font-medium text-white mb-1">Изучите модели</h4>
            <p className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">Узнайте особенности каждой модели</p>
          </Link>
          <Link 
            href="/docs/prompts"
            className="p-4 rounded-xl border border-[#262626] hover:border-[#444] hover:bg-[#0a0a0a] transition-all group"
          >
            <Wand2 className="w-5 h-5 text-[#666] group-hover:text-white mb-3 transition-colors" />
            <h4 className="text-[14px] font-medium text-white mb-1">Prompt Engineering</h4>
            <p className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">Научитесь писать эффективные промпты</p>
          </Link>
          <Link 
            href="/docs/tips"
            className="p-4 rounded-xl border border-[#262626] hover:border-[#444] hover:bg-[#0a0a0a] transition-all group"
          >
            <CheckCircle className="w-5 h-5 text-[#666] group-hover:text-white mb-3 transition-colors" />
            <h4 className="text-[14px] font-medium text-white mb-1">Tips & Tricks</h4>
            <p className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">Секреты опытных пользователей</p>
          </Link>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}



