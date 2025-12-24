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
      
      <DocsTitle description="Сравнивайте результаты генерации одного промпта на разных моделях. Найдите идеальную модель для вашей задачи.">
        Brainstorm
      </DocsTitle>

      <DocsInfoBox type="info">
        Brainstorm — инструмент для параллельного сравнения моделей. Напишите один промпт, выберите несколько моделей и получите результаты от каждой на бесконечном холсте.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <ol className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">1</span>
              Напишите промпт для генерации изображения
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">2</span>
              Выберите несколько моделей из списка — можно выбрать все сразу
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">3</span>
              Нажмите генерировать — каждая модель создаст своё изображение по вашему промпту
            </li>
            <li className="flex items-start gap-3 text-sm text-[#959595] font-inter">
              <span className="w-6 h-6 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0 text-white text-xs">4</span>
              Сравните результаты на холсте — перетаскивайте карточки, зумьте, кликайте для просмотра
            </li>
          </ol>
        </div>
      </DocsSection>

      {/* Canvas features */}
      <DocsSection title="Возможности холста">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Масштабирование</h4>
            <p className="text-sm text-[#959595] font-inter">
              Используйте Ctrl + колесо мыши или пинч на трекпаде для приближения и отдаления холста.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Перемещение</h4>
            <p className="text-sm text-[#959595] font-inter">
              Зажмите и перетащите пустое пространство холста для навигации по большой коллекции.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Перетаскивание карточек</h4>
            <p className="text-sm text-[#959595] font-inter">
              Перетаскивайте карточки с изображениями для организации пространства по своему усмотрению.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Просмотр результата</h4>
            <p className="text-sm text-[#959595] font-inter">
              Кликните на готовое изображение для просмотра в полном размере с возможностью скачать.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Когда использовать">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Выбор модели:</span> не знаете какая модель лучше подойдёт для вашего стиля? Сравните все сразу.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Тестирование промпта:</span> посмотрите как разные модели интерпретируют один и тот же промпт.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Быстрое прототипирование:</span> получите много вариантов за один клик.
          </p>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            • Результаты сохраняются локально — вы можете закрыть вкладку и вернуться позже
          </p>
          <p className="text-sm text-[#959595] font-inter">
            • Используйте кнопку очистки (иконка обновления) чтобы начать с чистого холста
          </p>
          <p className="text-sm text-[#959595] font-inter">
            • Генерации идут параллельно — не нужно ждать завершения одной модели для старта другой
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
