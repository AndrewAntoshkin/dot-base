'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

export default function BrainstormFeaturePage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Brainstorm' },
      ]} />
      
      <DocsTitle description="Генерация идей и промптов с помощью ИИ. Преодолейте творческий блок и получите вдохновение.">
        Brainstorm
      </DocsTitle>

      <DocsInfoBox type="info">
        Brainstorm — ваш творческий помощник. Опишите задачу или концепцию, и ИИ предложит варианты промптов и идеи для реализации.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Опишите вашу задачу или концепцию: "нужен логотип для кофейни" или "хочу футуристический город"
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              ИИ сгенерирует несколько вариантов промптов с разными подходами
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Выберите понравившийся и используйте его в генераторе изображений
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* What you get */}
      <DocsSection title="Что вы получите">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Варианты концепций</h4>
            <p className="text-sm text-[#959595] font-inter">
              Несколько разных подходов к вашей задаче. Минималистичный, детальный, абстрактный.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Готовые промпты</h4>
            <p className="text-sm text-[#959595] font-inter">
              Детальные промпты готовые к использованию. Копируйте и вставляйте в генератор.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Рекомендации по стилю</h4>
            <p className="text-sm text-[#959595] font-inter">
              Какой стиль подойдёт для вашей задачи и какие ключевые слова использовать.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Выбор модели</h4>
            <p className="text-sm text-[#959595] font-inter">
              Рекомендация какая модель лучше подойдёт для конкретной задачи.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Когда использовать">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Творческий блок:</span> не знаете с чего начать? Brainstorm даст отправную точку.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Исследование вариантов:</span> хотите увидеть разные подходы к одной задаче.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Обучение промптингу:</span> изучайте как ИИ формулирует эффективные промпты.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/brainstorm" className="inline-block px-6 py-3 bg-white text-black rounded-full font-inter font-bold text-sm hover:bg-[#e0e0e0] transition-colors">
          Попробовать Brainstorm
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

