'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const TABLE_OF_CONTENTS = [
  { id: 'how-it-works', title: 'Как это работает', level: 2 },
  { id: 'models', title: 'Модели', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function OutpaintFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Outpaint' },
      ]} />
      
      <DocsTitle description="Расширение границ изображения. Добавьте контент за пределами исходной картинки с сохранением стиля.">
        Outpaint
      </DocsTitle>

      <DocsInfoBox type="info">
        Outpaint продолжает изображение за его границы. ИИ анализирует содержимое и создаёт логичное продолжение в любом направлении.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает" id="how-it-works">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Загрузите изображение которое хотите расширить
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              Выберите направление расширения: вверх, вниз, влево, вправо или все стороны
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Опционально добавьте описание того, что должно появиться в новой области
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">4</span>
              Запустите генерацию и получите расширенное изображение
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели" id="models">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Bria Expand</h4>
            <p className="text-sm text-[#959595] font-inter">
              Специализированная модель для расширения. Отличное качество переходов.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Outpainter</h4>
            <p className="text-sm text-[#959595] font-inter">
              Альтернативная модель с поддержкой промптов для новой области.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение" id="use-cases">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Изменение соотношения сторон</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Добавление пространства для текста</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Расширение фона для баннеров</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Создание панорамных изображений</span>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы" id="tips">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Расширяйте по частям:</span> расширение в одном направлении за раз даёт лучший контроль.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Простые фоны лучше:</span> однородные фоны (небо, трава) расширяются качественнее сложных сцен.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Используйте промпт:</span> если хотите конкретное содержимое в новой области — опишите его.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <Link href="/expand" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-white border border-[#444] rounded-xl hover:border-white transition-colors">
        Попробовать →
      </Link>

      <DocsFooter />
    </DocsShell>
  );
}





