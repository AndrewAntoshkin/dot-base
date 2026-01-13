'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const TABLE_OF_CONTENTS = [
  { id: 'how-it-works', title: 'Как это работает', level: 2 },
  { id: 'output', title: 'Что вы получите', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
];

export default function AnalyzeFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Analyze' },
      ]} />
      
      <DocsTitle description="Анализ изображений с помощью ИИ. Получите описание, теги и информацию о содержимом картинки.">
        Analyze
      </DocsTitle>

      <DocsInfoBox type="info">
        Analyze помогает понять содержимое изображения и создать промпт на его основе. Идеально для работы с референсами.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает" id="how-it-works">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Загрузите изображение которое хотите проанализировать
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              ИИ проанализирует содержимое, стиль, композицию и освещение
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full border border-[#333] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Получите детальное описание и готовый промпт для воспроизведения
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* What you get */}
      <DocsSection title="Что вы получите" id="output">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Описание содержимого</h4>
            <p className="text-sm text-[#959595] font-inter">
              Что изображено на картинке: объекты, персонажи, действия, окружение.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Анализ стиля</h4>
            <p className="text-sm text-[#959595] font-inter">
              Визуальный стиль: фотореализм, иллюстрация, аниме, 3D и т.д.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Освещение и цвета</h4>
            <p className="text-sm text-[#959595] font-inter">
              Тип освещения, цветовая палитра, контрастность, настроение.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Готовый промпт</h4>
            <p className="text-sm text-[#959595] font-inter">
              Промпт для воспроизведения похожего изображения в генераторе.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение" id="use-cases">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Работа с референсами:</span> загрузите понравившееся изображение и получите промпт для создания похожего.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Изучение стилей:</span> поймите из чего состоит стиль изображения и какие ключевые слова использовать.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Улучшение промптов:</span> сравните ваш промпт с анализом результата чтобы понять что добавить.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/analyze" className="inline-block px-6 py-3 text-white border border-[#444] rounded-xl hover:border-white text-sm transition-colors transition-colors">
          Попробовать Analyze
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}





