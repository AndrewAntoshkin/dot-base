'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const FLUX_MODELS = [
  { name: 'FLUX 2 Max', href: '/docs/models/flux/flux-2-max', description: 'Максимальное качество, до 8 референсов' },
  { name: 'FLUX 2 Pro', href: '/docs/models/flux/flux-2-pro', description: 'Генерация и редактирование изображений' },
  { name: 'FLUX 1.1 Pro', href: '/docs/models/flux/flux-1-1-pro', description: 'Быстрая генерация высокого качества' },
  { name: 'FLUX Kontext Max', href: '/docs/models/flux/flux-kontext-max', description: 'Редактирование с пониманием контекста' },
  { name: 'FLUX Kontext Fast', href: '/docs/models/flux/flux-kontext-fast', description: 'Быстрое контекстное редактирование' },
  { name: 'FLUX Fill Pro', href: '/docs/models/flux/flux-fill-pro', description: 'Inpainting и Outpainting' },
];

export default function FluxModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'FLUX' },
      ]} />
      
      <DocsTitle description="Семейство моделей FLUX от Black Forest Labs — лидер в генерации изображений по текстовому описанию. Отличается высоким качеством, точным следованием промптам и поддержкой референсных изображений.">
        FLUX
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О семействе FLUX
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          FLUX — это серия передовых моделей генерации изображений, разработанная компанией Black Forest Labs. 
          Модели FLUX построены на архитектуре Rectified Flow Transformers и отличаются высочайшим качеством 
          генерации, точным следованием текстовым описаниям и отличной работой с референсными изображениями.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Black Forest Labs была основана бывшими исследователями Stability AI, включая создателей 
          оригинального Stable Diffusion. FLUX быстро стал стандартом качества в индустрии AI-генерации.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Высокая детализация и фотореалистичность</li>
          <li>Точное следование текстовым промптам</li>
          <li>Поддержка до 8 референсных изображений</li>
          <li>Работа с различными соотношениями сторон</li>
          <li>Встроенные возможности редактирования (Kontext)</li>
          <li>Быстрая генерация в версиях Fast/Turbo</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FLUX_MODELS.map((model) => (
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
