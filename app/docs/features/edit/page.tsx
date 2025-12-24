'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

export default function EditFeaturePage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Edit' },
      ]} />
      
      <DocsTitle description="Редактирование изображений по текстовому описанию. Измените что угодно без маски — просто опишите желаемые изменения.">
        Edit
      </DocsTitle>

      <DocsInfoBox type="info">
        Edit позволяет изменять изображения текстом без создания маски. Опишите что хотите изменить — модель сама определит что и как редактировать.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Загрузите изображение которое хотите отредактировать
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              Опишите желаемые изменения текстом: "сделай волосы рыжими", "добавь очки", "измени фон на пляж"
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Получите отредактированное изображение с сохранением общей композиции
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* Difference from Inpaint */}
      <DocsSection title="Отличие от Inpaint">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Edit</h4>
            <p className="text-sm text-[#959595] font-inter">
              Не требует маски. Модель сама определяет что изменить на основе текста. Лучше для общих изменений стиля.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Inpaint</h4>
            <p className="text-sm text-[#959595] font-inter">
              Требует маску. Вы точно указываете область изменения. Лучше для локальных правок.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели">
        <div className="space-y-3">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-1">FLUX Kontext Max</h4>
            <p className="text-sm text-[#959595] font-inter">
              Флагманская модель для редактирования. Отлично понимает контекст и сохраняет стиль оригинала.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-1">FLUX Kontext Fast</h4>
            <p className="text-sm text-[#959595] font-inter">
              Быстрая версия для итераций. Меньше времени, немного ниже качество.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-1">SeeDream 4.5</h4>
            <p className="text-sm text-[#959595] font-inter">
              Альтернатива с поддержкой редактирования. Хорош для стилизации.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Examples */}
      <DocsSection title="Примеры команд">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-2">
          <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#b0b0b0] font-inter">
            "Change the background to a beach sunset"
          </code>
          <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#b0b0b0] font-inter">
            "Make her hair red and add glasses"
          </code>
          <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#b0b0b0] font-inter">
            "Turn this into a watercolor painting style"
          </code>
          <code className="block p-2 bg-[#1a1a1a] rounded text-sm text-[#b0b0b0] font-inter">
            "Add snow falling in the scene"
          </code>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">FLUX Kontext лучший:</span> для редактирования с сохранением стиля используйте FLUX Kontext Max.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Конкретные инструкции:</span> "сделай лучше" не работает. Описывайте конкретные изменения.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Для точных изменений:</span> если нужно изменить конкретную область — используйте Inpaint с маской.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/edit" className="inline-block px-6 py-3 bg-white text-black rounded-full font-inter font-bold text-sm hover:bg-[#e0e0e0] transition-colors">
          Попробовать Edit
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

