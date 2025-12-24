'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const HAILUO_MODELS = [
  { name: 'Hailuo 2.3', href: '/docs/models/hailuo/hailuo-2-3', description: 'Последняя версия с улучшенной физикой' },
  { name: 'Hailuo 02', href: '/docs/models/hailuo/hailuo-02', description: 'Стабильная версия для продакшена' },
];

export default function HailuoModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Hailuo' },
      ]} />
      
      <DocsTitle description="Семейство видео-моделей Hailuo от MiniMax — китайские модели генерации видео с отличной физикой и консистентностью.">
        Hailuo
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О семействе Hailuo
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Hailuo (海螺, "морская раковина") — серия моделей генерации видео от китайской компании MiniMax. 
          Модели известны высоким качеством физики движения и отличной консистентностью между кадрами.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          MiniMax — китайский стартап, специализирующийся на мультимодальных AI-моделях. Hailuo быстро 
          завоевал популярность благодаря реалистичной анимации людей и объектов.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Реалистичная анимация людей и лиц</li>
          <li>Высокая консистентность между кадрами</li>
          <li>Качественная физика движения объектов</li>
          <li>Поддержка Text-to-Video и Image-to-Video</li>
          <li>Разрешение до 1080p</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {HAILUO_MODELS.map((model) => (
            <Link
              key={model.href}
              href={model.href}
              className="group p-1 border border-[#252525] rounded-2xl hover:border-[#3a3a3a] transition-colors"
            >
              <div className="relative h-[100px] bg-transparent rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-white uppercase tracking-wide">
                    {model.name}
                  </span>
                  <p className="text-xs text-[#959595] mt-1">{model.description}</p>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}
