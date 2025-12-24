'use client';

import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const QUICK_LINKS = [
  {
    title: 'Модели',
    description: 'Обзор всех AI-моделей: FLUX, Kling, Hailuo, SeeDream и другие',
    href: '/docs/models',
  },
  {
    title: 'Функции',
    description: 'Image, Video, Inpaint, Outpaint, Upscale и другие возможности',
    href: '/docs/features',
  },
  {
    title: 'Prompt Engineering',
    description: 'Как писать эффективные промпты для лучших результатов',
    href: '/docs/prompts',
  },
  {
    title: 'Tips & Tricks',
    description: 'Практические советы от опытных пользователей',
    href: '/docs/tips',
  },
];

const FEATURES_OVERVIEW = [
  { name: 'Image', description: 'Генерация изображений из текста' },
  { name: 'Video', description: 'Создание видео из текста/изображения' },
  { name: 'Edit', description: 'Редактирование по описанию' },
  { name: 'Upscale', description: 'Увеличение разрешения' },
];

const STATS = [
  { value: '40+', label: 'Моделей' },
  { value: '10', label: 'Функций' },
  { value: '7', label: 'Семейств моделей' },
];

export default function DocsPage() {
  return (
    <DocsShell showBanner bannerText="Документация постоянно обновляется" bannerLink="/docs/changelog">
      <DocsBreadcrumb items={[
        { label: 'Документация' },
      ]} />
      
      <DocsTitle description="Добро пожаловать в документацию BASE — платформы для AI-генерации изображений и видео. Здесь вы найдёте всё необходимое для эффективной работы.">
        Добро пожаловать
      </DocsTitle>

      {/* Hero */}
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f] text-center">
            <div className="text-3xl font-bold text-white font-inter mb-1">{stat.value}</div>
            <div className="text-sm text-[#959595] font-inter">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <DocsSection title="Быстрый старт">
        <div className="grid grid-cols-2 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link 
              key={link.title}
              href={link.href}
              className="group p-1 border border-[#252525] rounded-2xl hover:border-[#3a3a3a] transition-colors"
            >
              <div className="relative h-[100px] bg-transparent rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-white uppercase tracking-wide">
                    {link.title}
                  </span>
                  <p className="text-xs text-[#959595] mt-1">{link.description}</p>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </DocsSection>

      {/* What is BASE */}
      <DocsSection title="Что такое BASE">
        <p className="text-sm text-[#959595] font-inter leading-relaxed mb-4">
          BASE — это платформа для генерации AI-контента, объединяющая лучшие модели для создания 
          изображений и видео. Мы предоставляем доступ к более чем 40 моделям от ведущих разработчиков: 
          Black Forest Labs (FLUX), Kuaishou (Kling), MiniMax (Hailuo), ByteDance (SeeDream), 
          Google (Veo, Imagen) и других.
        </p>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Платформа поддерживает полный цикл работы с контентом: от генерации и редактирования 
          до апскейла и удаления фона. Интуитивный интерфейс, система воркспейсов и история 
          генераций помогают организовать рабочий процесс.
        </p>
      </DocsSection>

      {/* Features Overview */}
      <DocsSection title="Основные функции">
        <div className="grid grid-cols-2 gap-3">
          {FEATURES_OVERVIEW.map((feature) => (
            <div key={feature.name} className="p-4 bg-transparent rounded-xl border border-[#2f2f2f]">
              <div className="text-sm font-medium text-white font-inter mb-1">{feature.name}</div>
              <div className="text-xs text-[#959595] font-inter">{feature.description}</div>
            </div>
          ))}
        </div>
      </DocsSection>

      {/* Navigation */}
      <DocsSection title="Навигация по документации">
        <div className="space-y-2">
          <Link href="/docs/models" className="flex items-center justify-between p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group">
            <div>
              <span className="text-sm font-medium text-white font-inter">Модели</span>
              <span className="text-xs text-[#959595] font-inter ml-2">— FLUX, Kling, Hailuo, SeeDream, Recraft, Google, Ideogram</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/docs/features" className="flex items-center justify-between p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group">
            <div>
              <span className="text-sm font-medium text-white font-inter">Функции</span>
              <span className="text-xs text-[#959595] font-inter ml-2">— Image, Video, Keyframes, Inpaint, Outpaint, Upscale</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/docs/prompts" className="flex items-center justify-between p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group">
            <div>
              <span className="text-sm font-medium text-white font-inter">Prompt Engineering</span>
              <span className="text-xs text-[#959595] font-inter ml-2">— структура, ключевые слова, примеры</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/docs/changelog" className="flex items-center justify-between p-4 bg-transparent hover:bg-[#2a2a2a] rounded-xl border border-[#2f2f2f] transition-colors group">
            <div>
              <span className="text-sm font-medium text-white font-inter">Changelog</span>
              <span className="text-xs text-[#959595] font-inter ml-2">— история обновлений платформы</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </DocsSection>

      <DocsFooter />
    </DocsShell>
  );
}
