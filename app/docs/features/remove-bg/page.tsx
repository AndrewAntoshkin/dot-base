'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

export default function RemoveBgFeaturePage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Remove BG' },
      ]} />
      
      <DocsTitle description="Мгновенное удаление фона изображения с сохранением мелких деталей: волосы, мех, прозрачные объекты.">
        Remove BG
      </DocsTitle>

      <DocsInfoBox type="info">
        Remove BG автоматически отделяет объект от фона за секунды. Результат — PNG с прозрачным фоном, готовый к использованию.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Загрузите изображение с объектом на фоне
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              ИИ автоматически определит границы объекта
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Скачайте PNG с прозрачным фоном
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Bria Remove BG</h4>
            <p className="text-sm text-[#959595] font-inter">
              Быстрый и точный. Отлично справляется с волосами и сложными краями.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">BiRefNet</h4>
            <p className="text-sm text-[#959595] font-inter">
              Специализированная модель для сложных случаев: мех, прозрачности, тонкие детали.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* What it handles */}
      <DocsSection title="Что обрабатывается хорошо">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-white font-inter">Волосы и причёски</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-white font-inter">Мех животных</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-white font-inter">Полупрозрачные объекты</span>
          </div>
          <div className="p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
            <span className="text-sm text-white font-inter">Сложные контуры</span>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">E-commerce:</span> продуктовые фото на белом или прозрачном фоне
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Дизайн:</span> создание коллажей и композиций
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Маркетинг:</span> баннеры и рекламные материалы
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/remove-bg" className="inline-block px-6 py-3 bg-white text-black rounded-full font-inter font-bold text-sm hover:bg-[#e0e0e0] transition-colors">
          Попробовать Remove BG
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}




