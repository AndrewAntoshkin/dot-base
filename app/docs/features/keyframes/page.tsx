'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const TABLE_OF_CONTENTS = [
  { id: 'how-it-works', title: 'Как это работает', level: 2 },
  { id: 'benefits', title: 'Преимущества', level: 2 },
  { id: 'models', title: 'Модели', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function KeyframesFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Keyframes' },
      ]} />
      
      <DocsTitle description="Создание видео по частям с последующей склейкой. Полный контроль над каждым сегментом.">
        Keyframes
      </DocsTitle>

      <DocsInfoBox type="info">
        Keyframes позволяет создавать длинные видео по частям. Добавляйте сегменты с начальным и конечным кадром — ИИ сгенерирует переходы и объединит их.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает" id="how-it-works">
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-xl border border-[#333] flex items-center justify-center text-[13px] text-[#888]">
                1
              </div>
              <h4 className="text-[14px] font-medium text-white">Создайте первый сегмент</h4>
            </div>
            <p className="text-[13px] text-[#888] pl-10">
              Загрузите начальный кадр и опишите что должно происходить. ИИ сгенерирует видео-сегмент.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-xl border border-[#333] flex items-center justify-center text-[13px] text-[#888]">
                2
              </div>
              <h4 className="text-[14px] font-medium text-white">Добавьте следующие сегменты</h4>
            </div>
            <p className="text-[13px] text-[#888] pl-10">
              Последний кадр предыдущего сегмента становится началом следующего. Продолжайте добавлять части.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-xl border border-[#333] flex items-center justify-center text-[13px] text-[#888]">
                3
              </div>
              <h4 className="text-[14px] font-medium text-white">Склейте в финальное видео</h4>
            </div>
            <p className="text-[13px] text-[#888] pl-10">
              Когда все сегменты готовы, объедините их в одно длинное видео с плавными переходами.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Advantages */}
      <DocsSection title="Преимущества" id="benefits">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-[#262626]">
            <h4 className="text-[14px] font-medium text-white mb-2">Полный контроль</h4>
            <p className="text-[13px] text-[#888]">
              Вы определяете начало и конец каждого сегмента. Не нравится часть? Перегенерируйте только её.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#262626]">
            <h4 className="text-[14px] font-medium text-white mb-2">Длинные видео</h4>
            <p className="text-[13px] text-[#888]">
              Создавайте видео любой длины, собирая их из 5-10 секундных сегментов.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#262626]">
            <h4 className="text-[14px] font-medium text-white mb-2">Сложные сцены</h4>
            <p className="text-[13px] text-[#888]">
              Разбейте сложную сцену на простые части. Каждый сегмент — одно действие.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-[#262626]">
            <h4 className="text-[14px] font-medium text-white mb-2">Экономия времени</h4>
            <p className="text-[13px] text-[#888]">
              Не нужно перегенерировать всё видео если один момент не устраивает.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели" id="models">
        <div className="p-4 rounded-xl border border-[#262626]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[14px] font-medium text-white mb-2">Kling 2.5 PRO</h4>
              <p className="text-[13px] text-[#888]">Лучший выбор для keyframes. Стабильные переходы, реалистичная физика.</p>
            </div>
            <div>
              <h4 className="text-[14px] font-medium text-white mb-2">Hailuo 2.3</h4>
              <p className="text-[13px] text-[#888]">Альтернатива с более креативными движениями и стилизацией.</p>
            </div>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы" id="tips">
        <div className="p-4 rounded-xl border border-[#262626] space-y-3">
          <p className="text-[13px] text-[#888]">
            <span className="text-white font-medium">Планируйте заранее:</span> продумайте всю последовательность сегментов до начала генерации.
          </p>
          <p className="text-[13px] text-[#888]">
            <span className="text-white font-medium">Короткие сегменты:</span> 5 секунд на сегмент дают лучший контроль чем 10.
          </p>
          <p className="text-[13px] text-[#888]">
            <span className="text-white font-medium">Последовательные действия:</span> один сегмент = одно действие. Не пытайтесь уместить много.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <Link href="/keyframes" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-white border border-[#444] rounded-xl hover:border-white transition-colors">
        Попробовать →
      </Link>

      <DocsFooter />
    </DocsShell>
  );
}





