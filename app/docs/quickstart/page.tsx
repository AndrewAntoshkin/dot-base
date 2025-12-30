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

export default function QuickStartPage() {
  return (
    <DocsShell>
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
      <DocsSection title="Шаг за шагом">
        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <div 
              key={step.number}
              className="p-5 bg-transparent rounded-xl border border-[#2f2f2f]"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#303030] flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-white font-inter">{step.number}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white font-inter mb-2">{step.title}</h3>
                  <p className="text-sm text-[#959595] font-inter mb-3">{step.description}</p>
                  <div className="p-3 bg-[#1a1a1a] rounded-lg">
                    <span className="text-xs text-[#707070] font-inter uppercase">Совет: </span>
                    <span className="text-sm text-[#b0b0b0] font-inter">{step.tip}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* First Prompts */}
      <DocsSection title="Ваши первые промпты">
        <p className="text-sm text-[#959595] font-inter mb-4">
          Скопируйте один из этих промптов для первой генерации:
        </p>
        <div className="space-y-3">
          {FIRST_PROMPTS.map((item) => (
            <div key={item.category} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white font-inter">{item.category}</span>
                <span className="px-2 py-1 bg-[#303030] rounded text-xs text-[#b0b0b0] font-inter">{item.model}</span>
              </div>
              <code className="block p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#b0b0b0] font-inter">
                {item.prompt}
              </code>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Common Mistakes */}
      <DocsSection title="Частые ошибки новичков">
        <div className="space-y-4">
          {COMMON_MISTAKES.map((mistake, i) => (
            <div key={i} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="text-xs text-red-400 font-inter uppercase mb-1 block">Плохо</span>
                  <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#959595] font-inter line-through">
                    {mistake.wrong}
                  </code>
                </div>
                <div>
                  <span className="text-xs text-white font-inter uppercase mb-1 block">Хорошо</span>
                  <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#b0b0b0] font-inter">
                    {mistake.right}
                  </code>
                </div>
              </div>
              <p className="text-sm text-[#707070] font-inter">{mistake.reason}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* What's Next */}
      <DocsSection title="Что дальше?">
        <div className="grid grid-cols-3 gap-4">
          <Link 
            href="/docs/models"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <Image className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Изучите модели</h4>
            <p className="text-xs text-[#959595] font-inter">Узнайте особенности каждой модели</p>
          </Link>
          <Link 
            href="/docs/prompts"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <Wand2 className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Prompt Engineering</h4>
            <p className="text-xs text-[#959595] font-inter">Научитесь писать эффективные промпты</p>
          </Link>
          <Link 
            href="/docs/tips"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <CheckCircle className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Tips & Tricks</h4>
            <p className="text-xs text-[#959595] font-inter">Секреты опытных пользователей</p>
          </Link>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}



