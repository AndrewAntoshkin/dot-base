'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    id: 'image',
    name: 'Image',
    description: 'Генерация изображений из текстового описания',
    fullDescription: 'Создавайте уникальные изображения любого стиля: от фотореализма до иллюстраций. Выберите модель, напишите промпт — и получите результат за секунды.',
    models: ['FLUX 2 Max', 'SeeDream 4.5', 'Ideogram V3', 'Recraft V3'],
    href: '/',
  },
  {
    id: 'video',
    name: 'Video',
    description: 'Создание видео из текста или изображения',
    fullDescription: 'Превращайте статичные изображения в динамичные видео или генерируйте видео из текста. Реалистичная физика, плавные движения.',
    models: ['Kling 2.5 PRO', 'Hailuo 2.3', 'Veo 3.1 Fast'],
    href: '/video',
  },
  {
    id: 'keyframes',
    name: 'Keyframes',
    description: 'Создание видео по частям с последующей склейкой',
    fullDescription: 'Добавляйте сегменты с начальным и конечным кадром — ИИ сгенерирует переходы и объединит их в одно видео. Полный контроль над каждым этапом.',
    models: ['Kling 2.5 PRO', 'Hailuo 2.3'],
    href: '/keyframes',
  },
  {
    id: 'analyze',
    name: 'Analyze',
    description: 'Анализ изображений с помощью ИИ',
    fullDescription: 'Получите описание содержимого изображения, теги, определение стиля. Полезно для создания промптов на основе референсов.',
    models: ['GPT-4 Vision', 'Claude 3'],
    href: '/analyze',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Генерация идей и промптов',
    fullDescription: 'ИИ поможет придумать креативные концепции для ваших проектов. Опишите задачу — получите варианты промптов и идей.',
    models: ['GPT-4', 'Claude 3'],
    href: '/brainstorm',
  },
  {
    id: 'inpaint',
    name: 'Inpaint',
    description: 'Редактирование части изображения',
    fullDescription: 'Выделите область маской и замените её на что-то новое по описанию. Идеально для удаления или замены объектов.',
    models: ['FLUX Fill Pro', 'Bria GenFill', 'Bria Eraser'],
    href: '/inpaint',
  },
  {
    id: 'outpaint',
    name: 'Outpaint',
    description: 'Расширение границ изображения',
    fullDescription: 'Добавьте контент за пределами исходной картинки. ИИ продолжит изображение в любом направлении с сохранением стиля.',
    models: ['Bria Expand', 'Outpainter'],
    href: '/expand',
  },
  {
    id: 'upscale',
    name: 'Upscale',
    description: 'Увеличение разрешения изображений',
    fullDescription: 'Увеличьте разрешение в 2-4 раза с улучшением деталей. Восстановление качества сжатых изображений.',
    models: ['Clarity Upscaler', 'Real-ESRGAN', 'Recraft Crisp'],
    href: '/',
  },
];

export default function FeaturesPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Функции' },
      ]} />
      
      <DocsTitle description="Полный обзор всех функций платформы BASE: от генерации изображений и видео до редактирования и апскейла.">
        Функции
      </DocsTitle>

      {/* Features Grid */}
      <DocsSection title="Все функции">
        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <Link 
              key={feature.id}
              href={feature.href}
              className="group block p-1 border border-[#252525] rounded-2xl hover:border-[#3a3a3a] transition-colors"
            >
              <div className="p-4 bg-transparent rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white font-inter mb-2 uppercase tracking-wide">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-[#959595] font-inter mb-3">
                      {feature.fullDescription}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {feature.models.map((model) => (
                        <span 
                          key={model} 
                          className="px-2 py-1 bg-[#303030] rounded-lg text-xs text-[#959595] font-inter"
                        >
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </DocsSection>

      {/* Quick Comparison */}
      <DocsSection title="Быстрое сравнение">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Функция</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Вход</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Выход</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#4e4e4e]">
              <td className="py-3 pr-4 text-sm font-medium text-white font-inter">Image</td>
              <td className="py-3 pr-4 text-sm text-[#959595] font-inter">Текст</td>
              <td className="py-3 text-sm text-[#959595] font-inter">Изображение</td>
            </tr>
            <tr className="border-b border-[#4e4e4e]">
              <td className="py-3 pr-4 text-sm font-medium text-white font-inter">Video</td>
              <td className="py-3 pr-4 text-sm text-[#959595] font-inter">Текст / Изображение</td>
              <td className="py-3 text-sm text-[#959595] font-inter">Видео</td>
            </tr>
            <tr className="border-b border-[#4e4e4e]">
              <td className="py-3 pr-4 text-sm font-medium text-white font-inter">Inpaint</td>
              <td className="py-3 pr-4 text-sm text-[#959595] font-inter">Изображение + Маска + Текст</td>
              <td className="py-3 text-sm text-[#959595] font-inter">Изображение</td>
            </tr>
            <tr className="border-b border-[#4e4e4e]">
              <td className="py-3 pr-4 text-sm font-medium text-white font-inter">Outpaint</td>
              <td className="py-3 pr-4 text-sm text-[#959595] font-inter">Изображение</td>
              <td className="py-3 text-sm text-[#959595] font-inter">Расширенное изображение</td>
            </tr>
            <tr className="border-b border-[#4e4e4e]">
              <td className="py-3 pr-4 text-sm font-medium text-white font-inter">Upscale</td>
              <td className="py-3 pr-4 text-sm text-[#959595] font-inter">Изображение</td>
              <td className="py-3 text-sm text-[#959595] font-inter">Увеличенное изображение</td>
            </tr>
          </tbody>
        </table>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
