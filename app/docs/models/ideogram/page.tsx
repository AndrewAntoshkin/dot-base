'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const IDEOGRAM_MODELS = [
  { name: 'Ideogram V3 Turbo', href: '/docs/models/ideogram/ideogram-v3', description: 'Быстрый рендеринг текста' },
];

export default function IdeogramModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Ideogram' },
      ]} />
      
      <DocsTitle description="Модели Ideogram — специализированные модели с отличным рендерингом текста и типографики на изображениях.">
        Ideogram
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О моделях Ideogram
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Ideogram — AI-платформа, специализирующаяся на генерации изображений с текстом. Компания 
          была основана бывшими исследователями Google Brain и быстро стала известна благодаря 
          качественному рендерингу текста.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Ideogram V3 Turbo — ускоренная версия их флагманской модели, сочетающая качество текстового 
          рендеринга с высокой скоростью генерации.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Качественный рендеринг текста на изображениях</li>
          <li>Быстрая генерация (Turbo режим)</li>
          <li>Поддержка различных стилей типографики</li>
          <li>Хорошее понимание композиции</li>
          <li>Множество художественных стилей</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {IDEOGRAM_MODELS.map((model) => (
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
