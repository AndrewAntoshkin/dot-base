'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import { BookOpen, Layers, Target, Sparkles, RefreshCw } from 'lucide-react';

const PHASES = [
  {
    number: '01',
    title: 'Планируй',
    subtitle: 'Перед промптом',
    icon: Target,
    content: [
      'Определите что именно хотите получить. "Красивая картинка" — это не план.',
      'Ответьте на вопросы: Что? Для чего? Какой стиль? Какое настроение?',
      'Найдите референсы. Используйте Analyze чтобы понять их структуру.',
      'Выберите подходящую модель ДО написания промпта.',
    ],
    tip: 'Чёткое понимание цели экономит время на итерации.',
  },
  {
    number: '02',
    title: 'Структурируй',
    subtitle: 'Формула промпта',
    icon: Layers,
    content: [
      'Используйте формулу: [Субъект] + [Действие] + [Окружение] + [Стиль] + [Качество]',
      'Начинайте с главного объекта, затем добавляйте детали.',
      'Указывайте стиль явно: "photorealistic", "anime", "oil painting".',
      'Добавляйте технические параметры: освещение, ракурс, качество.',
    ],
    tip: 'Структурированный промпт даёт предсказуемые результаты.',
  },
  {
    number: '03',
    title: 'Генерируй',
    subtitle: 'Первые попытки',
    icon: Sparkles,
    content: [
      'Начните с простого промпта. Не пытайтесь всё сразу.',
      'Используйте быстрые модели (Pro, Fast) для тестирования.',
      'Сгенерируйте несколько вариантов с одним промптом.',
      'Запомните seed удачных генераций для воспроизведения.',
    ],
    tip: 'Итерации на быстрых моделях — затем финал на качественных.',
  },
  {
    number: '04',
    title: 'Итерируй',
    subtitle: 'Улучшение результата',
    icon: RefreshCw,
    content: [
      'Анализируйте что не так: стиль? композиция? детали?',
      'Корректируйте промпт точечно, не переписывайте полностью.',
      'Добавляйте или убирайте ключевые слова по одному.',
      'Когда близко к цели — переключайтесь на качественную модель.',
    ],
    tip: 'Маленькие изменения = понимание что работает.',
  },
];

const PROMPT_STRUCTURE = [
  { part: 'Субъект', description: 'Главный объект', example: 'A young woman with red hair' },
  { part: 'Действие', description: 'Что происходит', example: 'standing in a field' },
  { part: 'Окружение', description: 'Где это', example: 'at golden hour sunset' },
  { part: 'Стиль', description: 'Визуальный стиль', example: 'photorealistic, cinematic' },
  { part: 'Качество', description: 'Техника', example: '8k, highly detailed' },
];

const STYLE_KEYWORDS = {
  'Фото': ['photorealistic', 'raw photo', 'DSLR', 'shot on Canon', '35mm film'],
  'Digital Art': ['digital art', 'concept art', 'artstation', 'digital painting'],
  'Иллюстрация': ['illustration', 'vector art', 'flat design', 'minimalist'],
  'Аниме': ['anime', 'manga', 'Studio Ghibli', 'cel shading'],
  '3D': ['3D render', 'octane render', 'blender', 'unreal engine'],
  'Живопись': ['oil painting', 'watercolor', 'impressionist', 'renaissance'],
};

const QUALITY_KEYWORDS = ['highly detailed', '8k resolution', 'sharp focus', 'professional', 'masterpiece'];

const LIGHTING_KEYWORDS = [
  { name: 'Golden hour', desc: 'Тёплый закатный' },
  { name: 'Blue hour', desc: 'Холодный рассветный' },
  { name: 'Studio lighting', desc: 'Студийный' },
  { name: 'Dramatic lighting', desc: 'Контрастный' },
  { name: 'Soft lighting', desc: 'Мягкий' },
  { name: 'Neon', desc: 'Неоновый' },
];

const CAMERA_KEYWORDS = [
  { name: 'Close-up', desc: 'Крупный план' },
  { name: 'Wide shot', desc: 'Общий план' },
  { name: 'Bird\'s eye', desc: 'Сверху' },
  { name: 'Low angle', desc: 'Снизу' },
  { name: 'Portrait', desc: 'Портрет' },
  { name: 'Macro', desc: 'Макро' },
];

const EXAMPLE_PROMPTS = [
  {
    category: 'Портрет',
    prompt: 'Portrait of a young woman with freckles and green eyes, natural lighting, soft bokeh background, photorealistic, shot on Canon 5D, 85mm lens, f/1.4',
  },
  {
    category: 'Пейзаж',
    prompt: 'Majestic mountain landscape at sunrise, misty valleys, snow-capped peaks, pine forest, golden hour, cinematic, 8k',
  },
  {
    category: 'Продукт',
    prompt: 'Wireless headphones on marble surface, studio lighting, product photography, minimalist, soft shadows, 4k',
  },
  {
    category: 'Фантазия',
    prompt: 'Ancient dragon on crystal mountain, bioluminescent scales, ethereal mist, fantasy art, concept art, epic composition',
  },
];

export default function PromptsPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Prompt Engineering' },
      ]} />
      
      <DocsTitle description="Методология написания эффективных промптов. От планирования до итераций — полное руководство.">
        Prompt Engineering
      </DocsTitle>

      <DocsInfoBox type="info">
        Хороший промпт — это чёткое описание желаемого результата. Модель буквально следует вашим инструкциям. Чем точнее описание — тем ближе результат.
      </DocsInfoBox>

      {/* Phases */}
      <DocsSection title="Методология: 4 фазы">
        <div className="space-y-4">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            return (
              <div key={phase.number} className="p-5 bg-transparent rounded-xl border border-[#2f2f2f]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#303030] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-white font-inter">{phase.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-bold text-white font-inter">{phase.title}</h3>
                      <span className="text-sm text-[#959595] font-inter">— {phase.subtitle}</span>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {phase.content.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#959595] font-inter">
                          <span className="text-[#959595] mt-0.5">*</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg">
                      <span className="text-xs text-[#707070] font-inter uppercase">Совет: </span>
                      <span className="text-sm text-[#b0b0b0] font-inter">{phase.tip}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DocsSection>

      {/* Structure */}
      <DocsSection title="Структура промпта">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white font-inter">Формула</span>
          </div>
          <code className="block p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#b0b0b0] font-mono">
            [Субъект] + [Действие] + [Окружение] + [Стиль] + [Качество]
          </code>
        </div>
        
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d5d5d5]">
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Часть</th>
              <th className="py-3 pr-4 text-left text-base font-semibold text-white font-inter">Описание</th>
              <th className="py-3 text-left text-base font-semibold text-white font-inter">Пример</th>
            </tr>
          </thead>
          <tbody>
            {PROMPT_STRUCTURE.map((item) => (
              <tr key={item.part} className="border-b border-[#4e4e4e]">
                <td className="py-3 pr-4 text-sm font-medium text-white font-inter">{item.part}</td>
                <td className="py-3 pr-4 text-sm text-[#959595] font-inter">{item.description}</td>
                <td className="py-3 text-sm text-[#959595] font-inter font-mono">{item.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocsSection>

      {/* Style Keywords */}
      <DocsSection title="Ключевые слова стилей">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(STYLE_KEYWORDS).map(([style, keywords]) => (
            <div key={style} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <span className="text-sm font-bold text-white font-inter block mb-2">{style}</span>
              <div className="flex flex-wrap gap-1">
                {keywords.map((kw) => (
                  <span key={kw} className="px-2 py-1 bg-[#303030] rounded text-xs text-[#b0b0b0] font-mono">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Quality Keywords */}
      <DocsSection title="Ключевые слова качества">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
          <div className="flex flex-wrap gap-2">
            {QUALITY_KEYWORDS.map((kw) => (
              <span key={kw} className="px-2 py-1 bg-[#303030] rounded text-xs text-[#b0b0b0] font-mono">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </DocsSection>

      {/* Lighting & Camera */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <h3 className="text-lg font-bold text-white font-inter mb-3">Освещение</h3>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="space-y-2">
              {LIGHTING_KEYWORDS.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="text-sm text-white font-inter font-mono">{item.name}</span>
                  <span className="text-xs text-[#959595] font-inter">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white font-inter mb-3">Ракурсы</h3>
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="space-y-2">
              {CAMERA_KEYWORDS.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="text-sm text-white font-inter font-mono">{item.name}</span>
                  <span className="text-xs text-[#959595] font-inter">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <DocsSection title="Примеры промптов">
        <div className="space-y-3">
          {EXAMPLE_PROMPTS.map((example) => (
            <div key={example.category} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="text-sm font-bold text-white font-inter mb-2">{example.category}</div>
              <code className="block p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#b0b0b0] font-inter leading-relaxed">
                {example.prompt}
              </code>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Key Principles */}
      <DocsSection title="Главные принципы">
        <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] space-y-3">
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Английский язык:</span> модели обучены на английских данных. Русский работает, но английский лучше.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Конкретность:</span> "красивая девушка" → "young woman with auburn hair, green eyes, soft smile"
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Баланс длины:</span> 50-150 слов оптимально. Слишком коротко = неопределённо. Слишком длинно = размывает фокус.
          </p>
          <p className="text-sm text-[#959595] font-inter">
            <span className="text-white font-medium">Текст в кавычках:</span> для надписей используйте text "YOUR TEXT" — модели понимают этот формат.
          </p>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
