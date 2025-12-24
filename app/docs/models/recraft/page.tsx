'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const RECRAFT_MODELS = [
  { name: 'Recraft V3', href: '/docs/models/recraft/recraft-v3', description: 'Лучший рендеринг текста' },
  { name: 'Recraft V3 SVG', href: '/docs/models/recraft/recraft-v3-svg', description: 'Генерация векторной графики' },
];

export default function RecraftModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Recraft' },
      ]} />
      
      <DocsTitle description="Семейство моделей Recraft — специализированные модели для дизайнеров с лучшим в индустрии рендерингом текста и поддержкой векторной графики.">
        Recraft
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О семействе Recraft
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Recraft — модели, созданные специально для дизайнеров и маркетологов. Главное преимущество 
          Recraft — это лучший в индустрии рендеринг текста на изображениях. Буквы получаются чёткими, 
          читаемыми и без артефактов.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Recraft V3 SVG — уникальная модель, способная генерировать векторную графику в формате SVG. 
          Это делает её незаменимой для создания логотипов и иконок.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Лучший рендеринг текста на изображениях</li>
          <li>Генерация векторной графики (SVG)</li>
          <li>Поддержка множества стилей и эстетик</li>
          <li>Высокое качество для маркетинговых материалов</li>
          <li>Идеально для постеров, баннеров и логотипов</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {RECRAFT_MODELS.map((model) => (
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
