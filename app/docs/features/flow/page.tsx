'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';

const BLOCK_TYPES = [
  {
    name: 'Текст',
    desc: 'Генерация текста через AI. Используйте для создания промптов, идей, описаний.',
    output: 'Текст → передаётся в подключённые блоки как промпт',
  },
  {
    name: 'Изображение',
    desc: 'Генерация изображений из текста. Поддерживает все модели из раздела Image.',
    output: 'Картинка → передаётся в видео-блоки для анимации',
  },
  {
    name: 'Видео',
    desc: 'Генерация видео. Text-to-Video или Image-to-Video в зависимости от подключений.',
    output: 'Видео → финальный результат пайплайна',
  },
];

const CONNECTION_TYPES = [
  {
    from: 'Текст',
    to: 'Изображение',
    result: 'Текст используется как промпт для генерации картинки',
    example: '"кот в космосе" → генерирует изображение кота в космосе',
  },
  {
    from: 'Текст',
    to: 'Видео',
    result: 'Text-to-Video режим. Текст как промпт для видео.',
    example: '"собака бежит по пляжу" → генерирует видео',
  },
  {
    from: 'Текст',
    to: 'Текст',
    result: 'Текст передаётся как контекст для обработки AI.',
    example: 'Описание картинки → AI создаёт промпт для генерации',
  },
  {
    from: 'Изображение',
    to: 'Видео',
    result: 'Image-to-Video режим. Картинка анимируется. Формат видео = формат картинки.',
    example: 'Статичное фото 9:16 → вертикальное видео 9:16',
  },
  {
    from: 'Текст + Изображение',
    to: 'Видео',
    result: 'I2V с промптом. Картинка + описание движения.',
    example: 'Фото + "медленно поворачивает голову" → видео с действием',
  },
  {
    from: '2 Изображения',
    to: 'Видео',
    result: 'Keyframe режим. Видео-переход между первым и последним кадром.',
    example: 'Фото1 (начало) + Фото2 (конец) → плавный морфинг',
  },
];

const SUPPORTED_IMAGE_MODELS = [
  { name: 'Nano Banana Pro', speed: 'Очень быстрая', quality: 'Хорошее' },
  { name: 'FLUX 2 Max', speed: 'Средняя', quality: 'Отличное' },
  { name: 'FLUX 2 Pro', speed: 'Средняя', quality: 'Отличное' },
  { name: 'Imagen 4', speed: 'Средняя', quality: 'Отличное' },
  { name: 'Ideogram V3', speed: 'Средняя', quality: 'Отличное (текст)' },
  { name: 'Recraft V3', speed: 'Средняя', quality: 'Отличное (арт)' },
];

const SUPPORTED_VIDEO_MODELS = [
  { name: 'Kling 2.5 Pro', type: 'T2V / I2V / Keyframe', duration: 'До 10 сек', aspectRatio: 'T2V: выбор формата' },
  { name: 'Kling 2.1 Master', type: 'T2V / I2V / Keyframe', duration: 'До 5 сек', aspectRatio: 'T2V: выбор формата' },
  { name: 'Veo 3.1 Fast', type: 'T2V', duration: 'До 8 сек', aspectRatio: 'Выбор формата' },
  { name: 'Seedance 1.5 Pro', type: 'T2V / I2V', duration: 'До 12 сек', aspectRatio: 'Нет выбора' },
  { name: 'Hailuo 2.3', type: 'T2V', duration: 'До 8 сек', aspectRatio: 'Нет выбора' },
  { name: 'Hailuo 02', type: 'T2V / I2V', duration: 'До 6 сек', aspectRatio: 'Нет выбора' },
  { name: 'Wan 2.5', type: 'T2V / I2V', duration: 'До 5 сек', aspectRatio: 'Нет выбора' },
  { name: 'Runway Gen4', type: 'I2V', duration: 'До 10 сек', aspectRatio: 'От картинки' },
];

const USE_CASES = [
  'Автоматизация контент-пайплайнов',
  'Идея → Картинка → Видео за один клик',
  'Эксперименты с цепочками моделей',
  'Сравнение результатов разных моделей',
  'Прототипирование креативных процессов',
  'Batch-генерация контента',
];

const TABLE_OF_CONTENTS = [
  { id: 'overview', title: 'Обзор', level: 2 },
  { id: 'blocks', title: 'Типы блоков', level: 2 },
  { id: 'connections', title: 'Связи между блоками', level: 2 },
  { id: 'models', title: 'Поддерживаемые модели', level: 2 },
  { id: 'workflow', title: 'Как работать', level: 2 },
  { id: 'use-cases', title: 'Применение', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
];

export default function FlowFeaturePage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Функции', href: '/docs/features' },
        { label: 'Flow' },
      ]} />
      
      <DocsTitle description="Визуальный конструктор AI-пайплайнов. Создавайте цепочки генераций: Текст → Изображение → Видео. Соединяйте блоки и запускайте автоматические пайплайны.">
        Flow
      </DocsTitle>

      <DocsInfoBox type="info">
        Flow — экспериментальная функция для создания сложных AI-пайплайнов. Соединяйте блоки и автоматизируйте процесс генерации контента.
      </DocsInfoBox>

      {/* Overview */}
      <DocsSection title="Обзор" id="overview">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Flow</span> — это визуальный редактор для создания цепочек AI-генераций. 
            Вместо того чтобы вручную копировать результаты между разделами, вы создаёте связи между блоками, 
            и данные автоматически передаются от одного к другому.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Пример:</span> Текстовый блок генерирует идею → передаёт её в блок изображения → 
            результат идёт в блок видео → готовый ролик на выходе.
          </p>
        </div>
      </DocsSection>

      {/* Block Types */}
      <DocsSection title="Типы блоков" id="blocks">
        <div className="space-y-3">
          {BLOCK_TYPES.map((block) => (
            <div key={block.name} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <h4 className="text-base font-bold text-white font-inter mb-2">{block.name}</h4>
              <p className="text-sm text-[#959595] font-inter mb-2">{block.desc}</p>
              <div className="p-2 bg-[#1a1a1a] rounded-lg">
                <span className="text-xs text-[#707070] font-inter">Выход: </span>
                <span className="text-sm text-[#b0b0b0] font-inter">{block.output}</span>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Connections */}
      <DocsSection title="Связи между блоками" id="connections">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Из → В</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Результат</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Пример</th>
            </tr>
          </thead>
          <tbody>
            {CONNECTION_TYPES.map((conn, idx) => (
              <tr key={idx} className="border-b border-[#4e4e4e]">
                <td className="py-3 pr-4 text-sm font-medium text-white font-inter whitespace-nowrap">{conn.from} → {conn.to}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{conn.result}</td>
                <td className="py-3 text-sm text-[#707070] font-inter italic">{conn.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocsSection>

      {/* Supported Models */}
      <DocsSection title="Поддерживаемые модели" id="models">
        <h4 className="text-sm font-bold text-white font-inter mb-3">Модели для изображений</h4>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-2 pr-4 text-left text-sm font-semibold text-white font-inter">Модель</th>
              <th className="py-2 pr-4 text-left text-sm font-semibold text-white font-inter">Скорость</th>
              <th className="py-2 text-left text-sm font-semibold text-white font-inter">Качество</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_IMAGE_MODELS.map((model) => (
              <tr key={model.name} className="border-b border-[#4e4e4e]">
                <td className="py-2 pr-4 text-sm font-medium text-white font-inter">{model.name}</td>
                <td className="py-2 pr-4 text-sm text-[#959595] font-inter">{model.speed}</td>
                <td className="py-2 text-sm text-[#959595] font-inter">{model.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className="text-sm font-bold text-white font-inter mb-3">Модели для видео</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-2 pr-4 text-left text-sm font-semibold text-white font-inter">Модель</th>
              <th className="py-2 pr-4 text-left text-sm font-semibold text-white font-inter">Тип</th>
              <th className="py-2 pr-4 text-left text-sm font-semibold text-white font-inter">Длительность</th>
              <th className="py-2 text-left text-sm font-semibold text-white font-inter">Формат</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_VIDEO_MODELS.map((model) => (
              <tr key={model.name} className="border-b border-[#4e4e4e]">
                <td className="py-2 pr-4 text-sm font-medium text-white font-inter">{model.name}</td>
                <td className="py-2 pr-4 text-sm text-[#959595] font-inter">{model.type}</td>
                <td className="py-2 pr-4 text-sm text-[#959595] font-inter">{model.duration}</td>
                <td className="py-2 text-sm text-[#959595] font-inter">{model.aspectRatio}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <DocsInfoBox type="warning">
          <strong>Формат видео (Aspect Ratio):</strong> В режиме I2V (Image-to-Video) формат видео определяется входной картинкой, а не настройками. 
          Выбор формата доступен только для T2V моделей: Kling и Veo.
        </DocsInfoBox>
      </DocsSection>

      {/* Workflow */}
      <DocsSection title="Как работать" id="workflow">
        <div className="space-y-3">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">1. Создайте блок</h4>
            <p className="text-sm text-[#959595] font-inter">
              Дважды кликните на пустом месте канваса или нажмите кнопку "+" внизу экрана. 
              Выберите тип блока: Текст, Изображение или Видео.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">2. Настройте блок</h4>
            <p className="text-sm text-[#959595] font-inter">
              Введите промпт в текстовое поле. Выберите модель и настройки (соотношение сторон, качество, длительность) 
              в панели внизу блока.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">3. Соедините блоки</h4>
            <p className="text-sm text-[#959595] font-inter">
              Наведите на блок — появятся точки соединения слева и справа. 
              Перетащите от выхода одного блока ко входу другого, чтобы создать связь.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">4. Запустите генерацию</h4>
            <p className="text-sm text-[#959595] font-inter">
              Нажмите кнопку ▶ в блоке. Генерация запустится, результат появится в блоке. 
              Если блок связан с другими — результат автоматически передастся дальше.
            </p>
          </div>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <h4 className="text-sm font-bold text-white font-inter mb-2">5. Сохраните флоу</h4>
            <p className="text-sm text-[#959595] font-inter">
              Нажмите "Сохранить" в правом верхнем углу. Ваш пайплайн сохранится и будет доступен 
              в списке флоу (выпадающее меню внизу).
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Use Cases */}
      <DocsSection title="Применение" id="use-cases">
        <div className="grid grid-cols-2 gap-2">
          {USE_CASES.map((useCase) => (
            <div key={useCase} className="flex items-center gap-2 p-3 bg-transparent rounded-xl border border-[#2f2f2f]">
              <span className="text-white">•</span>
              <span className="text-sm text-[#959595] font-inter">{useCase}</span>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы" id="tips">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Начинайте с текста:</span> Текстовый блок с AI может сгенерировать 
            хороший промпт для изображения, который вы бы сами не придумали.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">I2V даёт больше контроля:</span> Если нужно точное видео — 
            сначала создайте идеальное изображение, затем анимируйте его. Формат видео = формат картинки.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Keyframe для морфинга:</span> Подключите 2 картинки к видео-блоку — 
            модель создаст плавный переход от первой ко второй. Поддерживают: Kling 2.5, Kling 2.1, Kling 1.0.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Вертикальные видео (9:16):</span> Для TikTok/Reels используйте T2V режим с Kling или Veo 
            и выберите формат 9:16. В I2V формат определяется картинкой.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Анализ медиа:</span> В текстовом блоке можно загрузить картинку или видео — 
            AI проанализирует и опишет их или создаст промпт.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Референсы:</span> Некоторые модели изображений (FLUX, Ideogram, Nano Banana) 
            поддерживают референсные изображения — используйте кнопку "Референсы" в настройках.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Hover для превью:</span> Наведите на видео в блоке — 
            оно автоматически начнёт воспроизводиться.
          </p>
        </div>
      </DocsSection>

      {/* CTA */}
      <Link href="/flow" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] text-white border border-[#444] rounded-xl hover:border-white transition-colors">
        Попробовать Flow →
      </Link>

      <DocsFooter />
    </DocsShell>
  );
}
