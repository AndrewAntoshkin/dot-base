'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsInfoBox, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { MessageSquare, Sparkles, Image, Video, Wand2, HelpCircle, Lightbulb, ArrowRight } from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Wand2,
    title: 'Создание промптов',
    description: 'Ассистент поможет написать или улучшить промпт на английском языке для любой задачи. Опишите что хотите получить — ассистент сформулирует оптимальный промпт.',
  },
  {
    icon: HelpCircle,
    title: 'Выбор модели',
    description: 'Не знаете какую модель выбрать? Опишите задачу — ассистент порекомендует лучшую модель и объяснит почему именно она подходит.',
  },
  {
    icon: Image,
    title: 'Советы по изображениям',
    description: 'Рекомендации по композиции, освещению, стилям. Ассистент знает особенности каждой модели и поможет добиться нужного результата.',
  },
  {
    icon: Video,
    title: 'Помощь с видео',
    description: 'Выбор модели для видео, настройка параметров, советы по промптам для анимации и динамичных сцен.',
  },
  {
    icon: Lightbulb,
    title: 'Объяснение функций',
    description: 'Подробные объяснения как работают Inpaint, Outpaint, Upscale и другие функции платформы с примерами использования.',
  },
  {
    icon: Sparkles,
    title: 'Анализ медиа',
    description: 'Прикрепите изображение или видео (до 45 минут) — ассистент проанализирует контент и поможет создать похожее или предложит варианты улучшения.',
  },
];

const EXAMPLE_QUERIES = [
  {
    category: 'Создание промпта',
    query: 'Напиши промпт для рекламы духов в стиле luxury',
    response: `Вот промпт для luxury рекламы духов:

\`\`\`
Elegant perfume bottle on black marble surface, dramatic studio lighting with golden highlights, smoke wisps flowing around bottle, luxury advertising photography, high-end cosmetics campaign style, reflection on glossy surface, cinematic composition, 8k quality
\`\`\`

**Рекомендую модель:** Flux 2 Max — лучший для фотореализма и рекламных изображений.`,
  },
  {
    category: 'Выбор модели',
    query: 'Какую модель выбрать для логотипа?',
    response: `Для создания логотипов рекомендую:

- **Recraft Crisp** — специально создана для логотипов, иконок и минималистичного дизайна. Чёткие линии, простые формы.
- **Recraft SVG** — если нужна векторная графика для масштабирования без потери качества.

[Документация Recraft Crisp](/docs/models/recraft/recraft-crisp)`,
  },
  {
    category: 'Текст на изображении',
    query: 'Хочу добавить текст на картинку',
    response: `Для текста на изображениях есть **только один правильный выбор** — **Ideogram v3**.

Это единственная модель, которая корректно генерирует текст (русский и английский). Другие модели искажают буквы.

Пример промпта:
\`\`\`
Modern poster design with text "SALE 50%" in bold white letters, minimalist background, professional typography
\`\`\`

[Документация Ideogram v3](/docs/models/ideogram/ideogram-v3)`,
  },
  {
    category: 'Улучшение промпта',
    query: 'Улучши мой промпт: красивый закат',
    response: `Ваш промпт слишком общий. Вот улучшенная версия:

\`\`\`
Breathtaking sunset over ocean horizon, dramatic orange and purple clouds, silhouette of palm trees, golden hour lighting, waves reflecting colors, cinematic wide angle, vibrant colors, 8k ultra detailed
\`\`\`

**Что добавлено:**
- Конкретное место (океан, пальмы)
- Детали неба (драматичные облака)
- Цветовая палитра (оранжевый, фиолетовый)
- Техническое качество (8k, детализация)`,
  },
  {
    category: 'Сравнение моделей',
    query: 'Чем отличается Flux от Recraft?',
    response: `| Характеристика | Flux | Recraft |
|----------------|------|---------|
| **Стиль** | Фотореализм | Иллюстрации, арт |
| **Лучше для** | Портреты, продукты, фото | Дизайн, логотипы, стилизация |
| **Текст** | Плохо | Средне (лучше Ideogram) |
| **Скорость** | Средняя | Быстрая |

**Вывод:** Flux для реалистичных изображений, Recraft для художественных и дизайнерских работ.`,
  },
  {
    category: 'Видео генерация',
    query: 'Как создать видео из моей картинки?',
    response: `Для создания видео из изображения:

1. Перейдите в раздел **Video**
2. Выберите модель с поддержкой Image-to-Video:
   - **Kling v2.5 Turbo Pro** — лучшее качество 1080p
   - **Hailuo 02** — отличная физика движений
   - **Wan 2.5 I2V** — хороший баланс скорости и качества

3. Загрузите исходное изображение
4. Напишите промпт с описанием движения:
\`\`\`
Camera slowly zooms out, gentle wind moving hair, soft ambient lighting
\`\`\`

[Документация по видео](/docs/features/video)`,
  },
  {
    category: 'Анализ видео',
    query: '[Прикреплено видео рекламного ролика] Проанализируй это видео и предложи как сделать похожее',
    response: `Проанализировал ваше видео. Вот что я вижу:

**Характеристики:**
- Длительность: ~15 секунд
- Стиль: кинематографичный, slow-motion
- Объект: продукт крупным планом с динамичным освещением
- Переходы: плавные, с эффектом размытия

**Как воссоздать:**

1. **Модель:** Kling v2.5 Turbo Pro — лучшее качество для рекламных видео

2. **Промпт для аналогичного стиля:**
\`\`\`
Product shot in slow motion, dramatic cinematic lighting, smooth camera movement around object, dark background with light rays, professional advertising style, 1080p quality
\`\`\`

3. **Настройки:**
   - Длительность: 5-10 секунд
   - Разрешение: 1080p

[Документация Kling](/docs/models/kling/kling-2-5-pro)`,
  },
];

const CONTEXT_INFO = [
  {
    context: 'Текущее действие',
    description: 'Ассистент видит какую функцию вы используете (Image, Video, Inpaint и т.д.)',
  },
  {
    context: 'Выбранная модель',
    description: 'Ассистент знает какую модель вы выбрали и даст советы именно для неё',
  },
  {
    context: 'Ваш промпт',
    description: 'Ассистент видит что вы написали и может помочь улучшить',
  },
  {
    context: 'Соотношение сторон',
    description: 'Ассистент учитывает выбранный формат при рекомендациях',
  },
];

const LIMITATIONS = [
  'Ассистент не может запускать генерации — только помогать с настройками',
  'Не имеет доступа к вашей истории генераций',
  'Не может редактировать ваши изображения напрямую',
  'Рекомендации основаны на общих принципах, результат может отличаться',
];

export default function AssistantPage() {
  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'BASECRAFT AI' },
      ]} />
      
      <DocsTitle description="Ваш персональный помощник по генерации изображений и видео. Поможет выбрать модель, написать промпт и настроить параметры.">
        BASECRAFT AI
      </DocsTitle>

      <DocsInfoBox type="tip">
        Откройте ассистента нажав на иконку чата в правом нижнем углу экрана. Можете прикрепить изображения или видео для анализа.
      </DocsInfoBox>

      {/* What is Assistant */}
      <DocsSection title="Что такое BASECRAFT AI?">
        <div className="p-5 bg-transparent rounded-xl border border-[#2f2f2f]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#303030] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-[#b0b0b0] font-inter leading-relaxed">
                BASECRAFT AI — это ассистент, который знает всё о платформе Basecraft: 
                все модели, их особенности, лучшие практики написания промптов и техники генерации.
              </p>
              <p className="text-sm text-[#b0b0b0] font-inter leading-relaxed mt-3">
                Ассистент видит ваш текущий контекст (выбранную модель, промпт, настройки) и даёт персонализированные рекомендации.
                Он может анализировать прикреплённые изображения и видео (до 45 минут) и помогать создавать похожие.
              </p>
            </div>
          </div>
        </div>
      </DocsSection>

      {/* Capabilities */}
      <DocsSection title="Возможности">
        <div className="grid grid-cols-2 gap-4">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="flex items-center gap-3 mb-2">
                <cap.icon className="w-5 h-5 text-white" />
                <h4 className="text-sm font-bold text-white font-inter">{cap.title}</h4>
              </div>
              <p className="text-xs text-[#959595] font-inter">{cap.description}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Example Queries */}
      <DocsSection title="Примеры запросов и ответов">
        <p className="text-sm text-[#959595] font-inter mb-4">
          Вот примеры того, как ассистент отвечает на типичные вопросы:
        </p>
        <div className="space-y-4">
          {EXAMPLE_QUERIES.map((example, index) => (
            <div key={index} className="rounded-xl border border-[#2f2f2f] overflow-hidden">
              {/* Query */}
              <div className="p-4 bg-[#1a1a1a] border-b border-[#2f2f2f]">
                <span className="text-xs text-[#707070] font-inter uppercase mb-1 block">{example.category}</span>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#303030] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white">Вы</span>
                  </div>
                  <p className="text-sm text-white font-inter pt-1">{example.query}</p>
                </div>
              </div>
              {/* Response */}
              <div className="p-4 bg-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm text-[#b0b0b0] font-inter pt-1 flex-1 prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-[#b0b0b0] font-inter text-sm bg-transparent p-0 m-0">
                      {example.response}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Context */}
      <DocsSection title="Контекст пользователя">
        <DocsInfoBox type="info">
          Ассистент автоматически получает информацию о вашем текущем состоянии на платформе, что позволяет давать более точные рекомендации.
        </DocsInfoBox>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {CONTEXT_INFO.map((item) => (
            <div key={item.context} className="p-3 bg-[#1a1a1a] rounded-lg">
              <span className="text-xs text-white font-inter font-bold block mb-1">{item.context}</span>
              <span className="text-xs text-[#959595] font-inter">{item.description}</span>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* How to Use */}
      <DocsSection title="Как использовать">
        <div className="space-y-3">
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Откройте ассистента</h4>
            </div>
            <p className="text-xs text-[#959595] font-inter ml-11">
              Нажмите на иконку чата в правом нижнем углу или используйте горячую клавишу.
            </p>
          </div>
          
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Задайте вопрос</h4>
            </div>
            <p className="text-xs text-[#959595] font-inter ml-11">
              Напишите что вам нужно: помощь с промптом, выбор модели, объяснение функции.
            </p>
          </div>
          
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Прикрепите медиа (опционально)</h4>
            </div>
            <p className="text-xs text-[#959595] font-inter ml-11">
              Нажмите на скрепку чтобы прикрепить изображения (до 10 шт, до 7MB) или видео (до 10 шт, до 45 минут) для анализа.
            </p>
          </div>
          
          <div className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#303030] flex items-center justify-center">
                <span className="text-sm font-bold text-white">4</span>
              </div>
              <h4 className="text-sm font-bold text-white font-inter">Используйте рекомендации</h4>
            </div>
            <p className="text-xs text-[#959595] font-inter ml-11">
              Скопируйте промпт, перейдите по ссылкам на документацию, примените советы.
            </p>
          </div>
        </div>
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы для лучших результатов">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#1a1a1a] rounded-xl">
            <h4 className="text-sm font-bold text-white font-inter mb-2">✅ Делайте</h4>
            <ul className="space-y-2 text-xs text-[#959595] font-inter">
              <li>• Описывайте задачу конкретно</li>
              <li>• Уточняйте стиль и настроение</li>
              <li>• Прикрепляйте референсы (фото/видео)</li>
              <li>• Просите объяснить выбор модели</li>
              <li>• Задавайте уточняющие вопросы</li>
            </ul>
          </div>
          <div className="p-4 bg-[#1a1a1a] rounded-xl">
            <h4 className="text-sm font-bold text-white font-inter mb-2">❌ Избегайте</h4>
            <ul className="space-y-2 text-xs text-[#959595] font-inter">
              <li>• Слишком общих запросов</li>
              <li>• Просьб запустить генерацию</li>
              <li>• Вопросов не по теме платформы</li>
              <li>• Ожидания 100% точных результатов</li>
              <li>• Запросов личной информации</li>
            </ul>
          </div>
        </div>
      </DocsSection>

      {/* Limitations */}
      <DocsSection title="Ограничения">
        <DocsInfoBox type="warning">
          Ассистент — это помощник, а не исполнитель. Он даёт рекомендации, но финальное решение и запуск генерации — за вами.
        </DocsInfoBox>
        <ul className="mt-4 space-y-2">
          {LIMITATIONS.map((limit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#959595] font-inter">
              <span className="text-[#707070]">•</span>
              {limit}
            </li>
          ))}
        </ul>
      </DocsSection>

      {/* Related */}
      <DocsSection title="Связанные разделы">
        <div className="grid grid-cols-3 gap-4">
          <Link 
            href="/docs/prompts"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <Wand2 className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Prompt Engineering</h4>
            <p className="text-xs text-[#959595] font-inter">Детальное руководство по промптам</p>
          </Link>
          <Link 
            href="/docs/models"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <Image className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Модели</h4>
            <p className="text-xs text-[#959595] font-inter">Полный каталог всех моделей</p>
          </Link>
          <Link 
            href="/docs/tips"
            className="p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group"
          >
            <Lightbulb className="w-6 h-6 text-white mb-3" />
            <h4 className="text-sm font-bold text-white font-inter mb-1">Tips & Tricks</h4>
            <p className="text-xs text-[#959595] font-inter">Секреты опытных пользователей</p>
          </Link>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}

