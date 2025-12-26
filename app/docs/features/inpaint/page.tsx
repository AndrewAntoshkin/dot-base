'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const SUPPORTED_MODELS = [
  { name: 'FLUX Fill Pro', desc: 'Лучший выбор для сложных замен. Высокое качество интеграции.' },
  { name: 'Bria GenFill', desc: 'Быстрый и качественный. Хорош для простых задач.' },
  { name: 'Bria Eraser', desc: 'Специализируется на удалении объектов без замены.' },
];

export default function InpaintFeaturePage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Inpaint' },
      ]} />
      
      <DocsTitle description="Редактирование части изображения. Выделите область маской и замените её на что-то новое по описанию.">
        Inpaint
      </DocsTitle>

      <DocsInfoBox type="info">
        Inpaint позволяет изменить только выделенную часть изображения, сохраняя остальное нетронутым. Идеально для удаления или замены объектов.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает">
        <div className="space-y-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Загрузите изображение</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Выберите изображение которое хотите отредактировать.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Нарисуйте маску</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Закрасьте область которую хотите изменить. Рисуйте аккуратно — точность маски влияет на результат.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Опишите замену</h4>
            </div>
            <p className="text-sm text-[#959595] font-inter pl-11">
              Напишите что должно появиться вместо закрашенной области. Или оставьте пустым для удаления.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели">
        <div className="space-y-3">
          {SUPPORTED_MODELS.map((model) => (
            <div key={model.name} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <h4 className="text-sm font-bold text-white font-inter mb-1">{model.name}</h4>
              <p className="text-sm text-[#959595] font-inter">{model.desc}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Удаление лишних объектов</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Замена фона или элементов</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Исправление артефактов генерации</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-[#959595] font-inter">Добавление новых элементов</span>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Точная маска:</span> рисуйте маску аккуратно, захватывая только нужную область. Слишком большая маска = непредсказуемый результат.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Контекст важен:</span> модель учитывает окружение. Замена будет соответствовать стилю остального изображения.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Для удаления:</span> используйте Bria Eraser или оставьте промпт пустым — модель заполнит область фоном.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/inpaint" className="inline-block px-6 py-3 bg-white text-black rounded-full font-inter font-bold text-sm hover:bg-[#e0e0e0] transition-colors">
          Попробовать Inpaint
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}


