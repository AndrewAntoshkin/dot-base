'use client';

import { 
  DocsShell, 
  DocsBreadcrumb, 
  DocsTitle, 
  DocsSection, 
  DocsFooter,
  DocsQuickLinks,
  DocsQuickLink,
  DocsFeatureGrid,
  DocsFeatureCard,
  DocsStats,
  DocsNavList,
  DocsParagraph
} from '@/components/docs/docs-shell';
import { 
  Sparkles, 
  Layers, 
  Wand2, 
  PenTool,
  Image,
  Video,
  Eraser,
  ArrowUpRight
} from 'lucide-react';

const QUICK_LINKS = [
  {
    title: 'Быстрый старт',
    href: '/docs/quickstart',
  },
  {
    title: 'Работа с моделями',
    href: '/docs/models',
  },
  {
    title: 'AI Ассистент BASECRAFT',
    href: '/docs/assistant',
  },
  {
    title: 'Prompt Engineering',
    href: '/docs/prompts',
  },
  {
    title: 'Советы и хитрости',
    href: '/docs/tips',
  },
];

const FEATURES = [
  { name: 'Image', description: 'Генерация изображений из текста', icon: <Image className="w-4 h-4" />, href: '/docs/features/image' },
  { name: 'Video', description: 'Создание видео из текста/изображения', icon: <Video className="w-4 h-4" />, href: '/docs/features/video' },
  { name: 'Inpaint', description: 'Редактирование областей изображения', icon: <Eraser className="w-4 h-4" />, href: '/docs/features/inpaint' },
  { name: 'Upscale', description: 'Увеличение разрешения', icon: <ArrowUpRight className="w-4 h-4" />, href: '/docs/features/upscale' },
];

const STATS = [
  { value: '50+', label: 'Моделей' },
  { value: '10', label: 'Функций' },
  { value: '11', label: 'Провайдеров' },
];

const NAV_ITEMS = [
  { href: '/docs/assistant', title: 'AI Ассистент', description: 'персональный помощник, промпты, выбор модели' },
  { href: '/docs/models', title: 'Модели', description: 'FLUX, Kling, Hailuo, SeeDream, Recraft, Google, Runway, Luma' },
  { href: '/docs/features', title: 'Функции', description: 'Image, Video, Keyframes, Inpaint, Outpaint, Upscale' },
  { href: '/docs/prompts', title: 'Prompt Engineering', description: 'структура, ключевые слова, примеры' },
  { href: '/docs/changelog', title: 'Changelog', description: 'история обновлений платформы' },
];

const TABLE_OF_CONTENTS = [
  { id: 'quick-references', title: 'Быстрый старт', level: 2 },
  { id: 'about', title: 'Что такое BASE', level: 2 },
  { id: 'features', title: 'Основные функции', level: 2 },
  { id: 'navigation', title: 'Навигация', level: 2 },
];

export default function DocsPage() {
  return (
    <DocsShell tableOfContents={TABLE_OF_CONTENTS}>
      <DocsBreadcrumb items={[
        { label: 'Docs', href: '/docs' },
      ]} />
      
      <DocsTitle 
        description="BASE — платформа для AI-генерации изображений и видео. Здесь вы найдёте всё необходимое для эффективной работы."
        lastUpdated="13 января 2026"
      >
        Документация BASE
      </DocsTitle>

      <DocsParagraph>
        Создавайте изображения и видео с помощью более чем 50 моделей от ведущих разработчиков: 
        Black Forest Labs (FLUX), Kuaishou (Kling), MiniMax (Hailuo), ByteDance (SeeDream), 
        Google (Veo, Imagen), Runway ML, Luma и других.
      </DocsParagraph>

      {/* Stats */}
      <DocsStats stats={STATS} />

      {/* Quick References */}
      <DocsSection title="Быстрый старт" id="quick-references">
        <DocsQuickLinks>
          {QUICK_LINKS.map((link) => (
            <DocsQuickLink
              key={link.href}
              href={link.href}
              title={link.title}
            />
          ))}
        </DocsQuickLinks>
      </DocsSection>

      {/* Features */}
      <DocsSection title="Основные функции" id="features">
        <DocsFeatureGrid>
          {FEATURES.map((feature) => (
            <DocsFeatureCard
              key={feature.name}
              href={feature.href}
              title={feature.name}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </DocsFeatureGrid>
      </DocsSection>

      {/* What is BASE */}
      <DocsSection title="Что такое BASE" id="about">
        <DocsParagraph>
        BASE — это платформа для генерации AI-контента, объединяющая лучшие модели для создания 
        изображений и видео. Мы предоставляем доступ к более чем 50 моделям от ведущих разработчиков.
        </DocsParagraph>
        <DocsParagraph>
          Платформа поддерживает полный цикл работы с контентом: от генерации и редактирования 
          до апскейла и удаления фона. Интуитивный интерфейс, система воркспейсов и история 
          генераций помогают организовать рабочий процесс.
        </DocsParagraph>
      </DocsSection>

      {/* Navigation */}
      <DocsSection title="Навигация по документации" id="navigation">
        <DocsNavList items={NAV_ITEMS} />
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
