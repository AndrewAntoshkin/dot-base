'use client';

import { 
  DocsShell, 
  DocsBreadcrumb, 
  DocsTitle, 
  DocsSection, 
  DocsSubSection,
  DocsInfoBox, 
  DocsFooter,
  DocsParagraph,
  DocsList,
  DocsFeatureGrid,
  DocsFeatureCard
} from '@/components/docs/docs-shell';
import Link from 'next/link';
import { MessageSquare, Image, Video, Wand2, HelpCircle, Lightbulb, ArrowRight, Layers, Eye, PenTool } from 'lucide-react';

const CAPABILITIES = [
  {
    icon: <Wand2 className="w-4 h-4" />,
    title: 'Создание промптов',
    description: 'Поможет написать или улучшить промпт для любой задачи',
    href: '/docs/prompts',
  },
  {
    icon: <HelpCircle className="w-4 h-4" />,
    title: 'Выбор модели',
    description: 'Порекомендует лучшую модель для вашей задачи',
    href: '/docs/models',
  },
  {
    icon: <Image className="w-4 h-4" />,
    title: 'Советы по изображениям',
    description: 'Рекомендации по композиции, стилям, настройкам',
    href: '/docs/features/image',
  },
  {
    icon: <Video className="w-4 h-4" />,
    title: 'Помощь с видео',
    description: 'Выбор модели, параметры анимации и движения',
    href: '/docs/features/video',
  },
  {
    icon: <Lightbulb className="w-4 h-4" />,
    title: 'Объяснение функций',
    description: 'Подробные объяснения Inpaint, Outpaint, Upscale',
    href: '/docs/features',
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Анализ медиа',
    description: 'Анализ изображений и видео (до 45 минут)',
    href: '/docs/features/analyze',
  },
];

const EXAMPLE_QUERIES = [
  {
    category: 'Создание промпта',
    query: 'Напиши промпт для рекламы духов в стиле luxury',
    prompt: 'Elegant perfume bottle on black marble surface, dramatic studio lighting with golden highlights, smoke wisps flowing around bottle, luxury advertising photography, high-end cosmetics campaign style, reflection on glossy surface, cinematic composition, 8k quality',
    response: 'Рекомендую модель: Flux 2 Max — лучший для фотореализма и рекламных изображений.',
  },
  {
    category: 'Выбор модели',
    query: 'Какую модель выбрать для логотипа?',
    prompt: null,
    response: `Для создания логотипов рекомендую:

• Recraft Crisp — специально создана для логотипов, иконок и минималистичного дизайна
• Recraft SVG — если нужна векторная графика для масштабирования`,
  },
  {
    category: 'Текст на изображении',
    query: 'Хочу добавить текст на картинку',
    prompt: null,
    response: `Для текста на изображениях есть только один правильный выбор — Ideogram v3.

Это единственная модель, которая корректно генерирует текст (русский и английский). Другие модели искажают буквы.`,
  },
];

const CONTEXT_INFO = [
  'Текущее действие (Image, Video, Inpaint и т.д.)',
  'Выбранная модель и её настройки',
  'Ваш текущий промпт',
  'Соотношение сторон и другие параметры',
];

const TABLE_OF_CONTENTS = [
  { id: 'what-is', title: 'Что такое BASECRAFT AI', level: 2 },
  { id: 'capabilities', title: 'Возможности', level: 2 },
  { id: 'examples', title: 'Примеры запросов', level: 2 },
  { id: 'context', title: 'Контекст пользователя', level: 2 },
  { id: 'how-to-use', title: 'Как использовать', level: 2 },
  { id: 'tips', title: 'Советы', level: 2 },
  { id: 'limitations', title: 'Ограничения', level: 2 },
];

export default function AssistantPage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Docs', href: '/docs' },
        { label: 'BASECRAFT AI' },
      ]} />
      
      <DocsTitle 
        description="Ваш персональный помощник по генерации изображений и видео. Поможет выбрать модель, написать промпт и настроить параметры."
        lastUpdated="13 января 2026"
      >
        BASECRAFT AI
      </DocsTitle>

      <DocsInfoBox type="tip" title="Быстрый доступ">
        Откройте ассистента нажав на иконку чата в правом нижнем углу экрана. Можете прикрепить изображения или видео для анализа.
      </DocsInfoBox>

      {/* What is Assistant */}
      <DocsSection title="Что такое BASECRAFT AI?" id="what-is">
        <DocsParagraph>
          BASECRAFT AI — это ассистент, который знает всё о платформе Basecraft: 
          все модели, их особенности, лучшие практики написания промптов и техники генерации.
        </DocsParagraph>
        <DocsParagraph>
          Ассистент видит ваш текущий контекст (выбранную модель, промпт, настройки) и даёт персонализированные рекомендации.
          Он может анализировать прикреплённые изображения и видео (до 45 минут) и помогать создавать похожие.
        </DocsParagraph>
      </DocsSection>

      {/* Capabilities */}
      <DocsSection title="Возможности" id="capabilities">
        <DocsFeatureGrid>
          {CAPABILITIES.map((cap) => (
            <DocsFeatureCard
              key={cap.title}
              href={cap.href}
              title={cap.title}
              description={cap.description}
              icon={cap.icon}
            />
          ))}
        </DocsFeatureGrid>
      </DocsSection>

      {/* Example Queries */}
      <DocsSection title="Примеры запросов" id="examples">
        <DocsParagraph>
          Вот примеры того, как ассистент отвечает на типичные вопросы:
        </DocsParagraph>
        
        <div className="flex flex-col gap-6">
          {EXAMPLE_QUERIES.map((example, index) => (
            <div key={index} className="flex flex-col gap-2">
              {/* Category Label */}
              <span className="text-[12px] text-[#7E7E7E] uppercase tracking-[-0.01em]">
                {example.category}
              </span>
              
              {/* Cards Container */}
              <div className="flex flex-col gap-1">
                {/* Query Card */}
                <div className="p-3 pl-4 rounded-xl border border-[#252525]">
                  <span className="text-[12px] text-[#7E7E7E] block mb-2">Запрос</span>
                  <p className="text-[14px] text-[#D9D9D9] leading-[1.4]">{example.query}</p>
                </div>
                
                {/* Response Card */}
                <div className="p-3 pl-4 rounded-xl border border-[#252525]">
                  <span className="text-[12px] text-[#7E7E7E] block mb-2">Ответ</span>
                  <div className="flex flex-col gap-2">
                    {/* Prompt Block (highlighted) */}
                    {example.prompt && (
                      <div className="p-3 rounded-xl bg-[#333333]/30 flex items-start justify-between gap-4">
                        <p className="text-[12px] text-[#D9D9D9] leading-[1.4] tracking-[-0.01em]">
                          {example.prompt}
                        </p>
                      </div>
                    )}
                    {/* Regular response text */}
                    <pre className="text-[14px] text-[#D9D9D9] leading-[1.4] tracking-[-0.01em] whitespace-pre-wrap font-sans">
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
      <DocsSection title="Контекст пользователя" id="context">
        <DocsParagraph>
          Ассистент автоматически получает информацию о вашем текущем состоянии на платформе:
        </DocsParagraph>
        <DocsList items={CONTEXT_INFO} />
      </DocsSection>

      {/* How to Use */}
      <DocsSection title="Как использовать" id="how-to-use">
        <DocsList 
          ordered
          items={[
            'Откройте ассистента — нажмите на иконку чата в правом нижнем углу',
            'Задайте вопрос — напишите что вам нужно: помощь с промптом, выбор модели, объяснение функции',
            'Прикрепите медиа (опционально) — изображения (до 10 шт, до 7MB) или видео (до 45 минут)',
            'Используйте рекомендации — скопируйте промпт, перейдите по ссылкам, примените советы',
          ]}
        />
      </DocsSection>

      {/* Tips */}
      <DocsSection title="Советы для лучших результатов" id="tips">
        <DocsSubSection title="✅ Делайте">
          <DocsList items={[
            'Описывайте задачу конкретно',
            'Уточняйте стиль и настроение',
            'Прикрепляйте референсы (фото/видео)',
            'Просите объяснить выбор модели',
            'Задавайте уточняющие вопросы',
          ]} />
        </DocsSubSection>

        <DocsSubSection title="❌ Избегайте">
          <DocsList items={[
            'Слишком общих запросов',
            'Просьб запустить генерацию',
            'Вопросов не по теме платформы',
            'Ожидания 100% точных результатов',
          ]} />
        </DocsSubSection>
      </DocsSection>

      {/* Limitations */}
      <DocsSection title="Ограничения" id="limitations">
        <DocsInfoBox type="warning" title="Важно">
          Ассистент — это помощник, а не исполнитель. Он даёт рекомендации, но финальное решение и запуск генерации — за вами.
        </DocsInfoBox>
        <DocsList items={[
          'Ассистент не может запускать генерации — только помогать с настройками',
          'Не имеет доступа к вашей истории генераций',
          'Не может редактировать ваши изображения напрямую',
          'Рекомендации основаны на общих принципах, результат может отличаться',
        ]} />
      </DocsSection>

      {/* Related */}
      <DocsSection title="Связанные разделы">
        <DocsFeatureGrid>
          <DocsFeatureCard
            href="/docs/prompts"
            title="Prompt Engineering"
            description="Детальное руководство по промптам"
            icon={<PenTool className="w-4 h-4" />}
          />
          <DocsFeatureCard
            href="/docs/models"
            title="Модели"
            description="Полный каталог всех моделей"
            icon={<Layers className="w-4 h-4" />}
          />
          <DocsFeatureCard
            href="/docs/tips"
            title="Tips & Tricks"
            description="Секреты опытных пользователей"
            icon={<Lightbulb className="w-4 h-4" />}
          />
          <DocsFeatureCard
            href="/docs/features"
            title="Функции"
            description="Обзор всех возможностей платформы"
            icon={<Wand2 className="w-4 h-4" />}
          />
        </DocsFeatureGrid>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
