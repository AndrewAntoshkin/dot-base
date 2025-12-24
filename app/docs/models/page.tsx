'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Все модели платформы
const ALL_MODELS = [
  // FLUX
  { name: 'FLUX 2 Max', href: '/docs/models/flux/flux-2-max' },
  { name: 'FLUX 2 Pro', href: '/docs/models/flux/flux-2-pro' },
  { name: 'FLUX 1.1 Pro', href: '/docs/models/flux/flux-1-1-pro' },
  { name: 'FLUX Kontext Max', href: '/docs/models/flux/flux-kontext-max' },
  { name: 'FLUX Kontext Fast', href: '/docs/models/flux/flux-kontext-fast' },
  { name: 'FLUX Fill Pro', href: '/docs/models/flux/flux-fill-pro' },
  // Kling
  { name: 'Kling 2.5 PRO', href: '/docs/models/kling/kling-2-5-pro' },
  { name: 'Kling 2.1 Master', href: '/docs/models/kling/kling-2-1-master' },
  { name: 'Kling 2.0', href: '/docs/models/kling/kling-2-0' },
  // Hailuo
  { name: 'Hailuo 2.3', href: '/docs/models/hailuo/hailuo-2-3' },
  { name: 'Hailuo 02', href: '/docs/models/hailuo/hailuo-02' },
  // SeeDream
  { name: 'SeeDream 4.5', href: '/docs/models/seedream/seedream-4-5' },
  { name: 'SeeDream 4', href: '/docs/models/seedream/seedream-4' },
  // Recraft
  { name: 'Recraft V3', href: '/docs/models/recraft/recraft-v3' },
  { name: 'Recraft V3 SVG', href: '/docs/models/recraft/recraft-v3-svg' },
  { name: 'Recraft Crisp', href: '/docs/models/recraft/recraft-crisp' },
  // Google
  { name: 'Veo 3.1 Fast', href: '/docs/models/google/veo-3-1' },
  { name: 'Imagen 4 Ultra', href: '/docs/models/google/imagen-4' },
  // Ideogram
  { name: 'Ideogram V3 Turbo', href: '/docs/models/ideogram/ideogram-v3' },
  // Other
  { name: 'SD 3.5 Large', href: '/docs/models/other/sd-3-5' },
  { name: 'MiniMax Image-01', href: '/docs/models/other/minimax-image' },
  { name: 'Seedance 1 Pro', href: '/docs/models/other/seedance' },
  { name: 'Wan 2.5 T2V', href: '/docs/models/other/wan-2-5' },
];

export default function ModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели' },
      ]} />
      
      <DocsTitle description="Обзор всех моделей AI-генерации, доступных на платформе BASE. Выберите модель для подробной информации.">
        Модели
      </DocsTitle>

      {/* Models Grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {ALL_MODELS.map((model) => (
          <Link
            key={model.href}
            href={model.href}
            className="group p-1 border border-[#252525] rounded-2xl hover:border-[#3a3a3a] transition-colors"
          >
            <div className="relative h-[120px] bg-transparent rounded-xl p-4">
              <span className="text-xs font-medium text-white uppercase tracking-wide">
                {model.name}
              </span>
              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>

      <DocsFooter />
    </DocsShell>
  );
}
