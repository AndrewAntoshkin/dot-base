'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const KLING_MODELS = [
  { name: 'Kling 2.5 PRO', href: '/docs/models/kling/kling-2-5-pro', description: 'Последняя версия, лучшее качество видео' },
  { name: 'Kling 2.1 Master', href: '/docs/models/kling/kling-2-1-master', description: 'Максимальная длительность до 60 сек' },
  { name: 'Kling 2.0', href: '/docs/models/kling/kling-2-0', description: 'Стабильная версия, баланс скорости и качества' },
];

export default function KlingModelsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: 'Kling' },
      ]} />
      
      <DocsTitle description="Семейство видео-моделей Kling от Kuaishou — одни из лучших моделей для генерации видео из текста и изображений. Отличаются реалистичной физикой движения и высоким качеством.">
        Kling
      </DocsTitle>

      {/* About */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          О семействе Kling
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Kling — это серия моделей генерации видео, разработанная китайской компанией Kuaishou Technology. 
          Kuaishou — один из крупнейших сервисов коротких видео в Китае, и их модели Kling представляют 
          передовой край AI-генерации видео.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed mt-3">
          Модели Kling известны реалистичной физикой движения, высоким разрешением до 1080p и возможностью 
          создавать видео длительностью до 60 секунд. Поддерживают как генерацию из текста (Text-to-Video), 
          так и анимацию изображений (Image-to-Video).
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Ключевые особенности
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-2">
          <li>Реалистичная физика движения объектов и людей</li>
          <li>Генерация видео до 1080p разрешения</li>
          <li>Длительность до 60 секунд (Kling 2.1 Master)</li>
          <li>Text-to-Video и Image-to-Video режимы</li>
          <li>Контроль движения камеры</li>
          <li>Поддержка различных соотношений сторон</li>
        </ul>
      </div>

      {/* Models Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
          Модели
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {KLING_MODELS.map((model) => (
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
