'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const OTHER_MODELS = [
  { name: 'SD 3.5 Large', href: '/docs/models/other/sd-3-5', description: 'Stable Diffusion 3.5' },
  { name: 'MiniMax Image-01', href: '/docs/models/other/minimax-image', description: 'Генерация от MiniMax' },
  { name: 'Seedance 1 Pro', href: '/docs/models/other/seedance', description: 'Танцевальные видео' },
  { name: 'Wan 2.5 T2V', href: '/docs/models/other/wan-2-5', description: 'Text-to-Video' },
];

export default function OtherModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Другие' },
      ]} />
      
      <DocsTitle description="Дополнительные модели на платформе: Stable Diffusion, MiniMax и специализированные модели для различных задач.">
        Другие модели
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Разнообразие моделей
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Помимо основных семейств моделей, на платформе доступны дополнительные модели от различных 
          разработчиков. Каждая из них имеет свои сильные стороны и области применения.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Здесь вы найдёте Stable Diffusion — одну из самых популярных открытых моделей, а также 
          специализированные модели для конкретных задач.
        </p>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {OTHER_MODELS.map((model) => (
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
