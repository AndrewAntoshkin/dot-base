'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const SUPPORTED_MODELS = [
  { name: 'Kling 2.5 PRO', type: 'Flagship', duration: 'До 10 сек', resolution: '1080p', speed: '2-5 мин' },
  { name: 'Kling 2.1 Master', type: 'Balanced', duration: 'До 5 сек', resolution: '1080p', speed: '1-3 мин' },
  { name: 'Kling 2.0', type: 'Fast', duration: 'До 5 сек', resolution: '720p', speed: '1-2 мин' },
  { name: 'Hailuo 2.3', type: 'Creative', duration: 'До 6 сек', resolution: '1080p', speed: '2-4 мин' },
  { name: 'Hailuo 02', type: 'Fast', duration: 'До 4 сек', resolution: '720p', speed: '1-2 мин' },
  { name: 'Veo 3.1 Fast', type: 'Google', duration: 'До 8 сек', resolution: '1080p', speed: '1-3 мин' },
];

const MODES = [
  {
    name: 'Text-to-Video',
    desc: 'Генерация видео из текстового описания. Полностью с нуля.',
    tip: 'Описывайте движение: "walking", "running", "camera panning slowly"',
  },
  {
    name: 'Image-to-Video',
    desc: 'Оживление статичного изображения. Загрузите картинку и опишите движение.',
    tip: 'Даёт больше контроля. Сначала создайте идеальный кадр, затем оживите.',
  },
];

const USE_CASES = [
  'Промо-ролики и тизеры',
  'Контент для социальных сетей',
  'Превиз для видеопроизводства',
  'Раскадровки и аниматики',
  'B-roll footage',
  'Эффекты и переходы',
];

const TABLE_OF_CONTENTS = [
  { id: 'modes', title: 'Режимы работы', level: 2 },
  { id: 'models', title: 'Модели', level: 2 },
  { id: 'params', title: 'Параметры', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function VideoFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Video' },
      ]} />
      
      <DocsTitle description="Создание видео из текста или изображения. Превращайте статичные картинки в динамичные ролики с реалистичной физикой.">
        Video
      </DocsTitle>

      <DocsInfoBox type="info">
        Видеогенерация занимает больше времени чем изображения — от 1 до 5 минут в зависимости от модели и параметров. Результат стоит ожидания.
      </DocsInfoBox>

      {/* Modes */}
      <DocsSection title="Режимы работы" id="modes">
        <div className="grid grid-cols-2 gap-4">
          {MODES.map((mode) => (
            <div key={mode.name} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <h4 className="text-base font-bold text-white font-inter mb-2">{mode.name}</h4>
              <p className="text-sm text-[#959595] font-inter mb-3">{mode.desc}</p>
              <div className="p-3 bg-[#1a1a1a] rounded-xl">
                <span className="text-xs text-[#707070] font-inter">Совет: </span>
                <span className="text-sm text-[#b0b0b0] font-inter">{mode.tip}</span>
              </div>
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
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Длительность</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Разрешение</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Время</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_MODELS.map((model) => (
              <tr key={model.name} className="border-b border-[#4e4e4e]">
                <td className="py-3 pr-4 text-sm font-medium text-white font-inter">{model.name}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{model.duration}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{model.resolution}</td>
                <td className="py-3 text-sm text-[#959595] font-inter">{model.speed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocsSection>

      {/* Parameters */}
      <DocsSection title="Основные параметры" id="params">
        <div className="space-y-3">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Duration</h4>
            <p className="text-sm text-[#959595] font-inter">
              Длительность видео в секундах. Чем длиннее — тем дольше генерация и выше вероятность артефактов.
              Рекомендуется начинать с 5 секунд.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Aspect Ratio</h4>
            <p className="text-sm text-[#959595] font-inter">
              Соотношение сторон: 16:9 для горизонтального видео, 9:16 для вертикального (TikTok, Reels), 1:1 для квадратного.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">Motion Description</h4>
            <p className="text-sm text-[#959595] font-inter">
              Описание движения в промпте. Указывайте что должно двигаться: персонаж, камера, объекты.
              Примеры: "slowly walking", "camera orbiting", "wind blowing through hair".
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
            <span className="text-white font-medium">Image-to-Video лучше:</span> даёт больше контроля. Сначала сгенерируйте идеальный кадр, затем оживите.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Избегайте сложных сцен:</span> один персонаж + простое действие = лучший результат.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Короткие видео для тестов:</span> используйте 5 секунд вместо 10 при тестировании промптов.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <div className="p-6 bg-transparent rounded-2xl border border-[#2f2f2f] text-center">
        <Link href="/video" className="inline-block px-6 py-3 text-white border border-[#444] rounded-xl hover:border-white text-sm transition-colors transition-colors">
          Попробовать Video
        </Link>
      </div>

      <DocsFooter />
    </DocsShell>
  );
}

