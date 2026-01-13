'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const SUPPORTED_MODELS = [
  { name: 'FLUX 2 Max', type: 'Flagship', speed: '~15 сек', quality: 'Максимальное' },
  { name: 'FLUX 2 Pro', type: 'Fast', speed: '~8 сек', quality: 'Высокое' },
  { name: 'FLUX 1.1 Pro', type: 'Balanced', speed: '~10 сек', quality: 'Высокое' },
  { name: 'SeeDream 4.5', type: 'Creative', speed: '~12 сек', quality: 'Высокое' },
  { name: 'SeeDream 4', type: 'Fast', speed: '~8 сек', quality: 'Хорошее' },
  { name: 'Ideogram V3 Turbo', type: 'Text-focused', speed: '~10 сек', quality: 'Высокое' },
  { name: 'Recraft V3', type: 'Illustration', speed: '~12 сек', quality: 'Высокое' },
  { name: 'Imagen 4 Ultra', type: 'Google', speed: '~20 сек', quality: 'Максимальное' },
  { name: 'SD 3.5 Large', type: 'Open-source', speed: '~15 сек', quality: 'Хорошее' },
];

const WORKFLOW_STEPS = [
  { step: '1', title: 'Выберите модель', desc: 'Каждая модель имеет свои сильные стороны' },
  { step: '2', title: 'Напишите промпт', desc: 'Опишите желаемое изображение на английском' },
  { step: '3', title: 'Настройте параметры', desc: 'Размер, соотношение сторон, seed' },
  { step: '4', title: 'Запустите генерацию', desc: 'Нажмите Generate и дождитесь результата' },
];

const USE_CASES = [
  'Концепт-арт и иллюстрации',
  'Рекламные креативы и баннеры',
  'Продуктовые изображения',
  'Портреты и персонажи',
  'Пейзажи и фоны',
  'Мокапы и визуализации',
  'Контент для социальных сетей',
  'NFT и генеративное искусство',
];

const TABLE_OF_CONTENTS = [
  { id: 'how-it-works', title: 'Как это работает', level: 2 },
  { id: 'models', title: 'Модели', level: 2 },
  { id: 'params', title: 'Параметры', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function ImageFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Image' },
      ]} />
      
      <DocsTitle description="Генерация изображений из текстового описания. Самая популярная функция платформы с поддержкой более 10 моделей.">
        Image
      </DocsTitle>

      <DocsInfoBox type="info">
        Image — это основная функция платформы. Опишите что хотите увидеть, выберите модель — и получите уникальное изображение за секунды.
      </DocsInfoBox>

      {/* How it works */}
      <DocsSection title="Как это работает" id="how-it-works">
        <div className="grid grid-cols-4 gap-4">
          {WORKFLOW_STEPS.map((item) => (
            <div key={item.step} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] text-center">
              <div className="w-10 h-10 rounded-full border border-[#333] flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-white font-inter">{item.step}</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter mb-1">{item.title}</h4>
              <p className="text-xs text-[#959595] font-inter">{item.desc}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели" id="models">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Модель</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Тип</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Скорость</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Качество</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_MODELS.map((model) => (
              <tr key={model.name} className="border-b border-[#4e4e4e]">
                <td className="py-3 pr-4 text-sm font-medium text-white font-inter">{model.name}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{model.type}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{model.speed}</td>
                <td className="py-3 text-sm text-[#959595] font-inter">{model.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocsSection>

      {/* Parameters */}
      <DocsSection title="Основные параметры" id="params">
        <div className="space-y-3">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Prompt</h4>
            <p className="text-sm text-[#959595] font-inter">
              Текстовое описание желаемого изображения. Рекомендуется использовать английский язык.
              Оптимальная длина: 50-150 слов. Включайте стиль, освещение, композицию.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Aspect Ratio</h4>
            <p className="text-sm text-[#959595] font-inter">
              Соотношение сторон: 1:1 (квадрат), 16:9 (широкий), 9:16 (вертикальный), 4:3, 3:2 и другие.
              Выбирайте в зависимости от назначения изображения.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Seed</h4>
            <p className="text-sm text-[#959595] font-inter">
              Число для воспроизводимости результата. Одинаковый seed + промпт = одинаковое изображение.
              Оставьте пустым для случайного результата.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение" id="use-cases">
        <div className="grid grid-cols-2 gap-2">
          {USE_CASES.map((useCase) => (
            <div key={useCase} className="flex items-center gap-2 p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
              <span className="text-white">*</span>
              <span className="text-sm text-[#959595] font-inter">{useCase}</span>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы" id="tips">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Для фотореализма:</span> используйте FLUX 2 Max или Imagen 4 Ultra, добавляйте "photorealistic, raw photo, DSLR"
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Для иллюстраций:</span> выбирайте Recraft V3 или SeeDream, указывайте "illustration, digital art"
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Для текста на изображении:</span> только Ideogram V3 или Recraft V3 гарантируют читаемый текст
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/" className="inline-block px-6 py-3 text-white border border-[#444] rounded-xl hover:border-white text-sm transition-colors transition-colors">
          Попробовать Image
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

