'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const SUPPORTED_MODELS = [
  { name: 'Clarity Upscaler', scale: '2x', desc: 'Универсальный апскейлер с хорошим балансом скорости и качества.' },
  { name: 'Real-ESRGAN', scale: '4x', desc: 'Классический апскейлер. Отлично работает с аниме и иллюстрациями.' },
  { name: 'Recraft Crisp', scale: '4x', desc: 'Специализируется на увеличении с сохранением резкости и текста.' },
  { name: 'Crystal', scale: '2x', desc: 'Быстрый апскейлер для простых задач.' },
];

const TABLE_OF_CONTENTS = [
  { id: 'how-it-works', title: 'Как это работает', level: 2 },
  { id: 'models', title: 'Модели', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function UpscaleFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Upscale' },
      ]} />
      
      <DocsTitle description="Увеличение разрешения изображений с улучшением деталей. Восстановление качества сжатых картинок.">
        Upscale
      </DocsTitle>

      <DocsInfoBox type="info">
        Upscale увеличивает разрешение изображения в 2-4 раза, добавляя детали которых не было в оригинале. Идеально для печати и высококачественных презентаций.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает" id="how-it-works">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Загрузите изображение которое хотите увеличить
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              Выберите модель и масштаб увеличения (2x или 4x)
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Запустите генерацию и получите увеличенное изображение с улучшенными деталями
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели" id="models">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Модель</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Масштаб</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Описание</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_MODELS.map((model) => (
              <tr key={model.name} className="border-b border-[#4e4e4e]">
                <td className="py-3 pr-4 text-sm font-medium text-white font-inter">{model.name}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{model.scale}</td>
                <td className="py-3 text-sm text-[#959595] font-inter">{model.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение" id="use-cases">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Подготовка к печати</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Восстановление сжатых изображений</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Увеличение AI-генераций</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Улучшение старых фотографий</span>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы" id="tips">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Real-ESRGAN для аниме:</span> лучше всего работает с иллюстрациями и аниме-артом.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Recraft Crisp для текста:</span> сохраняет читаемость текста при увеличении.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Не переусердствуйте:</span> 4x увеличение сильно сжатого JPEG может дать плохой результат.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <Link href="/?action=upscale" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-white border border-[#444] rounded-xl hover:border-white transition-colors">
        Попробовать →
      </Link>

      <DocsFooter />
    </DocsShell>
  );
}

