'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const GOOGLE_MODELS = [
  { name: 'Veo 3.1', href: '/docs/models/google/veo-3-1', description: 'Генерация видео от Google' },
  { name: 'Imagen 4', href: '/docs/models/google/imagen-4', description: 'Высококачественная генерация изображений' },
];

export default function GoogleModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Google' },
      ]} />
      
      <DocsTitle description="Модели от Google DeepMind — передовые разработки в области генерации изображений и видео от одного из лидеров AI-индустрии.">
        Google
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О моделях Google
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Google DeepMind — одна из ведущих исследовательских лабораторий в области искусственного 
          интеллекта. Модели Imagen и Veo представляют их последние достижения в генеративном AI.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Imagen фокусируется на высококачественной генерации изображений с глубоким пониманием 
          языка, а Veo специализируется на создании реалистичного видеоконтента.
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Передовые исследования от Google DeepMind</li>
          <li>Глубокое понимание естественного языка</li>
          <li>Высокое качество и фотореалистичность</li>
          <li>Строгие фильтры безопасности</li>
          <li>Постоянное улучшение на основе исследований</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {GOOGLE_MODELS.map((model) => (
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
