'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

export default function KeyframesFeaturePage() {
  return (
    <DocsShell>
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
      <DocsSection title="Как это работает">
        <div className="space-y-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Создайте первый сегмент</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Загрузите начальный кадр и опишите что должно происходить. ИИ сгенерирует видео-сегмент.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Добавьте следующие сегменты</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Последний кадр предыдущего сегмента становится началом следующего. Продолжайте добавлять части.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Склейте в финальное видео</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Когда все сегменты готовы, объедините их в одно длинное видео с плавными переходами.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Advantages */}
      <DocsSection title="Преимущества">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Полный контроль</h4>
            <p className="text-sm text-[#959595] font-inter">
              Вы определяете начало и конец каждого сегмента. Не нравится часть? Перегенерируйте только её.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Длинные видео</h4>
            <p className="text-sm text-[#959595] font-inter">
              Создавайте видео любой длины, собирая их из 5-10 секундных сегментов.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Сложные сцены</h4>
            <p className="text-sm text-[#959595] font-inter">
              Разбейте сложную сцену на простые части. Каждый сегмент — одно действие.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Экономия времени</h4>
            <p className="text-sm text-[#959595] font-inter">
              Не нужно перегенерировать всё видео если один момент не устраивает.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-bold text-white font-inter mb-2">Kling 2.5 PRO</h4>
              <p className="text-sm text-[#959595] font-inter">Лучший выбор для keyframes. Стабильные переходы, реалистичная физика.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-inter mb-2">Hailuo 2.3</h4>
              <p className="text-sm text-[#959595] font-inter">Альтернатива с более креативными движениями и стилизацией.</p>
            </div>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Планируйте заранее:</span> продумайте всю последовательность сегментов до начала генерации.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Короткие сегменты:</span> 5 секунд на сегмент дают лучший контроль чем 10.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Последовательные действия:</span> один сегмент = одно действие. Не пытайтесь уместить много.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/keyframes" className="inline-block px-6 py-3 bg-white text-black rounded-full font-inter font-bold text-sm hover:bg-[#e0e0e0] transition-colors">
          Попробовать Keyframes
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

