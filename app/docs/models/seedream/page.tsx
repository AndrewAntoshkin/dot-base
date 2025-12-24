'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const SEEDREAM_MODELS = [
  { name: 'SeeDream 4.5', href: '/docs/models/seedream/seedream-4-5', description: 'Улучшенное понимание пространства' },
  { name: 'SeeDream 4', href: '/docs/models/seedream/seedream-4', description: 'Генерация до 4K разрешения' },
];

export default function SeedreamModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'SeeDream' },
      ]} />
      
      <DocsTitle description="Семейство моделей SeeDream от ByteDance — мощные модели генерации изображений с поддержкой высокого разрешения до 4K и до 14 референсов.">
        SeeDream
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О семействе SeeDream
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          SeeDream — серия моделей генерации изображений от ByteDance (создатели TikTok). Модели 
          отличаются поддержкой высокого разрешения до 4K и возможностью использования множества 
          референсных изображений.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          ByteDance вложила значительные ресурсы в разработку SeeDream, и модели демонстрируют 
          отличное понимание пространственных отношений и композиции изображений.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Генерация в разрешении до 4K (4096×4096)</li>
          <li>Поддержка до 14 референсных изображений</li>
          <li>Улучшенное понимание пространственных отношений</li>
          <li>Групповая генерация связанных изображений</li>
          <li>Автоматическое улучшение промптов</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SEEDREAM_MODELS.map((model) => (
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
