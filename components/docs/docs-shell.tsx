'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { 
  Search, 
  ChevronRight, 
  Info, 
  X,
  Sparkles,
  Layers,
  Wand2,
  PenTool,
  HelpCircle,
  History,
  BookOpen,
  Zap,
  Image,
  Video,
  Scissors,
  Maximize,
  ArrowUpRight,
  Eraser,
  Edit3,
  Eye,
  Lightbulb,
  MessageSquare,
  Map
} from 'lucide-react';

// Типы для навигации документации
interface DocNavItem {
  id: string;
  title: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
  children?: DocNavItem[];
}

interface DocNavSection {
  id: string;
  title: string;
  items: DocNavItem[];
}

// Функция для получения всех элементов навигации (плоский список)
function flattenNavItems(sections: DocNavSection[], parentPath: string[] = []): Array<DocNavItem & { path: string[] }> {
  const result: Array<DocNavItem & { path: string[] }> = [];
  
  for (const section of sections) {
    for (const item of section.items) {
      const currentPath = [section.title, item.title];
      result.push({ ...item, path: currentPath });
      
      if (item.children) {
        for (const child of item.children) {
          result.push({ ...child, path: [...currentPath, child.title] });
          
          if (child.children) {
            for (const grandchild of child.children) {
              result.push({ ...grandchild, path: [...currentPath, child.title, grandchild.title] });
            }
          }
        }
      }
    }
  }
  
  return result;
}

// Функция поиска
function searchNavItems(sections: DocNavSection[], query: string): Array<DocNavItem & { path: string[] }> {
  if (!query.trim()) return [];
  
  const flatItems = flattenNavItems(sections);
  const lowerQuery = query.toLowerCase();
  
  return flatItems.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    item.href.toLowerCase().includes(lowerQuery)
  );
}

// Секционная навигация (как у Flora)
const SIDEBAR_SECTIONS: DocNavSection[] = [
  {
    id: 'getting-started',
    title: 'НАЧАЛО РАБОТЫ',
    items: [
      { id: 'welcome', title: 'Добро пожаловать', href: '/docs', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'quickstart', title: 'Quick Start', href: '/docs/quickstart', icon: <Zap className="w-4 h-4" /> },
      { id: 'glossary', title: 'Глоссарий', href: '/docs/glossary', icon: <MessageSquare className="w-4 h-4" /> },
    ]
  },
  {
    id: 'models',
    title: 'МОДЕЛИ',
    items: [
      { id: 'models-overview', title: 'Обзор моделей', href: '/docs/models', icon: <Layers className="w-4 h-4" /> },
      { 
        id: 'flux', 
        title: 'FLUX', 
        href: '/docs/models/flux',
        icon: <Sparkles className="w-4 h-4" />,
        children: [
          { id: 'flux-2-max', title: 'FLUX 2 Max', href: '/docs/models/flux/flux-2-max' },
          { id: 'flux-2-pro', title: 'FLUX 2 Pro', href: '/docs/models/flux/flux-2-pro' },
          { id: 'flux-1-1-pro', title: 'FLUX 1.1 Pro', href: '/docs/models/flux/flux-1-1-pro' },
          { id: 'flux-kontext-max', title: 'FLUX Kontext Max', href: '/docs/models/flux/flux-kontext-max' },
          { id: 'flux-kontext-fast', title: 'FLUX Kontext Fast', href: '/docs/models/flux/flux-kontext-fast' },
          { id: 'flux-fill-pro', title: 'FLUX Fill Pro', href: '/docs/models/flux/flux-fill-pro' },
        ]
      },
      { 
        id: 'kling', 
        title: 'Kling', 
        href: '/docs/models/kling',
        icon: <Video className="w-4 h-4" />,
        children: [
          { id: 'kling-2-5-pro', title: 'Kling 2.5 PRO', href: '/docs/models/kling/kling-2-5-pro' },
          { id: 'kling-2-1-master', title: 'Kling 2.1 Master', href: '/docs/models/kling/kling-2-1-master' },
          { id: 'kling-2-0', title: 'Kling 2.0', href: '/docs/models/kling/kling-2-0' },
        ]
      },
      { 
        id: 'hailuo', 
        title: 'Hailuo (MiniMax)', 
        href: '/docs/models/hailuo',
        icon: <Video className="w-4 h-4" />,
        children: [
          { id: 'hailuo-2-3', title: 'Hailuo 2.3', href: '/docs/models/hailuo/hailuo-2-3' },
          { id: 'hailuo-02', title: 'Hailuo 02', href: '/docs/models/hailuo/hailuo-02' },
        ]
      },
      { 
        id: 'seedream', 
        title: 'SeeDream', 
        href: '/docs/models/seedream',
        icon: <Image className="w-4 h-4" />,
        children: [
          { id: 'seedream-4-5', title: 'SeeDream 4.5', href: '/docs/models/seedream/seedream-4-5' },
          { id: 'seedream-4', title: 'SeeDream 4', href: '/docs/models/seedream/seedream-4' },
        ]
      },
      { 
        id: 'recraft', 
        title: 'Recraft', 
        href: '/docs/models/recraft',
        icon: <PenTool className="w-4 h-4" />,
        children: [
          { id: 'recraft-v3', title: 'Recraft V3', href: '/docs/models/recraft/recraft-v3' },
          { id: 'recraft-v3-svg', title: 'Recraft V3 SVG', href: '/docs/models/recraft/recraft-v3-svg' },
          { id: 'recraft-crisp', title: 'Recraft Crisp', href: '/docs/models/recraft/recraft-crisp' },
        ]
      },
      { 
        id: 'google', 
        title: 'Google', 
        href: '/docs/models/google',
        icon: <Sparkles className="w-4 h-4" />,
        children: [
          { id: 'veo-3-1', title: 'Veo 3.1 Fast', href: '/docs/models/google/veo-3-1' },
          { id: 'imagen-4', title: 'Imagen 4 Ultra', href: '/docs/models/google/imagen-4' },
        ]
      },
      { 
        id: 'ideogram', 
        title: 'Ideogram', 
        href: '/docs/models/ideogram',
        icon: <PenTool className="w-4 h-4" />,
        children: [
          { id: 'ideogram-v3', title: 'Ideogram V3 Turbo', href: '/docs/models/ideogram/ideogram-v3' },
        ]
      },
      { 
        id: 'other', 
        title: 'Другие модели', 
        href: '/docs/models/other',
        icon: <Layers className="w-4 h-4" />,
        children: [
          { id: 'sd-3-5', title: 'SD 3.5 Large', href: '/docs/models/other/sd-3-5' },
          { id: 'minimax-image', title: 'MiniMax Image-01', href: '/docs/models/other/minimax-image' },
          { id: 'seedance', title: 'Seedance 1 Pro', href: '/docs/models/other/seedance' },
          { id: 'wan-2-5', title: 'Wan 2.5 T2V', href: '/docs/models/other/wan-2-5' },
        ]
      },
    ]
  },
  {
    id: 'features',
    title: 'ФУНКЦИИ',
    items: [
      { id: 'features-overview', title: 'Обзор функций', href: '/docs/features', icon: <Wand2 className="w-4 h-4" /> },
      { id: 'func-image', title: 'Image', href: '/docs/features/image', icon: <Image className="w-4 h-4" /> },
      { id: 'func-video', title: 'Video', href: '/docs/features/video', icon: <Video className="w-4 h-4" /> },
      { id: 'func-keyframes', title: 'Keyframes', href: '/docs/features/keyframes', icon: <Layers className="w-4 h-4" /> },
      { id: 'func-analyze', title: 'Analyze', href: '/docs/features/analyze', icon: <Eye className="w-4 h-4" /> },
      { id: 'func-brainstorm', title: 'Brainstorm', href: '/docs/features/brainstorm', icon: <Lightbulb className="w-4 h-4" /> },
      { id: 'func-inpaint', title: 'Inpaint', href: '/docs/features/inpaint', icon: <Eraser className="w-4 h-4" /> },
      { id: 'func-outpaint', title: 'Outpaint', href: '/docs/features/outpaint', icon: <Maximize className="w-4 h-4" /> },
      { id: 'func-upscale', title: 'Upscale', href: '/docs/features/upscale', icon: <ArrowUpRight className="w-4 h-4" /> },
      { id: 'func-remove-bg', title: 'Remove BG', href: '/docs/features/remove-bg', icon: <Scissors className="w-4 h-4" /> },
      { id: 'func-edit', title: 'Edit', href: '/docs/features/edit', icon: <Edit3 className="w-4 h-4" /> },
    ]
  },
  {
    id: 'prompts',
    title: 'PROMPTS',
    items: [
      { id: 'prompt-engineering', title: 'Prompt Engineering', href: '/docs/prompts', icon: <PenTool className="w-4 h-4" /> },
      { id: 'tips', title: 'Tips & Tricks', href: '/docs/tips', icon: <Lightbulb className="w-4 h-4" /> },
    ]
  },
  {
    id: 'help',
    title: 'ПОМОЩЬ',
    items: [
      { id: 'troubleshooting', title: 'Troubleshooting', href: '/docs/troubleshooting', icon: <HelpCircle className="w-4 h-4" /> },
    ]
  },
  {
    id: 'updates',
    title: 'ОБНОВЛЕНИЯ',
    items: [
      { id: 'changelog', title: 'Changelog', href: '/docs/changelog', icon: <History className="w-4 h-4" /> },
      { id: 'roadmap', title: 'Roadmap', href: '/docs/roadmap', icon: <Map className="w-4 h-4" /> },
    ]
  },
];

interface DocsShellProps {
  children: React.ReactNode;
  showBanner?: boolean;
  bannerText?: string;
  bannerLink?: string;
}

export function DocsShell({ 
  children, 
  showBanner = false, 
  bannerText = 'Узнайте о новых функциях платформы',
  bannerLink = '/docs/changelog'
}: DocsShellProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isBannerVisible, setIsBannerVisible] = useState(showBanner);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Автоматически раскрываем секцию при переходе на страницу
  useEffect(() => {
    // Определяем какой элемент нужно раскрыть на основе pathname
    for (const section of SIDEBAR_SECTIONS) {
      for (const item of section.items) {
        if (item.children) {
          const isChildActive = item.children.some(child => 
            pathname === child.href || pathname.startsWith(child.href + '/')
          );
          if (isChildActive && !expandedItems.includes(item.id)) {
            setExpandedItems(prev => [...prev, item.id]);
          }
        }
      }
    }
  }, [pathname]);

  // Результаты поиска
  const searchResults = useMemo(() => {
    return searchNavItems(SIDEBAR_SECTIONS, searchQuery);
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const isActive = (href: string, exactMatch: boolean = false) => {
    if (href === '/docs') {
      return pathname === '/docs';
    }
    // Для элементов с exactMatch=true или обзорных страниц типа /docs/models, /docs/features
    // проверяем только точное совпадение
    if (exactMatch || href === '/docs/models' || href === '/docs/features') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderNavItem = (item: DocNavItem, isNested: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.href);
    
    return (
      <div key={item.id}>
        <div 
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-inter text-sm transition-all cursor-pointer group ${
            isItemActive && !hasChildren
              ? 'bg-[#1f1f1f] text-white font-medium'
              : 'text-[#959595] hover:text-white hover:bg-[#1a1a1a]'
          }`}
          style={{ paddingLeft: isNested ? '36px' : '12px' }}
          onClick={() => hasChildren ? toggleExpand(item.id) : null}
        >
          {/* Icon */}
          {item.icon && !isNested && (
            <span className={`flex-shrink-0 ${isItemActive ? 'text-white' : 'text-[#656565] group-hover:text-[#959595]'}`}>
              {item.icon}
            </span>
          )}
          
          {/* Title */}
          {hasChildren ? (
            <span className={`flex-1 ${isItemActive ? 'text-white font-medium' : ''}`}>{item.title}</span>
          ) : (
            <Link href={item.href} className="flex-1 flex items-center gap-2">
              {item.title}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-black rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          )}
          
          {/* Expand arrow */}
          {hasChildren && (
            <ChevronRight 
              className={`w-4 h-4 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} 
            />
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col mt-0.5">
            {item.children!.map(child => (
              <Link
                key={child.id}
                href={child.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-inter text-sm transition-all ${
                  isActive(child.href)
                    ? 'bg-[#1f1f1f] text-white font-medium'
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                }`}
                style={{ paddingLeft: '44px' }}
              >
                {child.title}
                {child.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-black rounded">
                    {child.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      <Header />

      {/* Main Content Area - fixed height, no scroll on container */}
      <div className="flex flex-1 px-20 min-h-0">
        {/* Sidebar - independent scroll */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#1f1f1f] overflow-y-auto">
          <div className="py-6 pr-6">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg mb-4 focus-within:border-[#3a3a3a] transition-colors">
              <Search className="w-4 h-4 text-[#656565]" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#656565] outline-none font-inter"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-[#656565] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Navigation or Search Results */}
            <nav className="flex flex-col gap-6">
              {searchQuery.trim() ? (
                // Search results
                searchResults.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <div className="px-3 py-2 text-xs text-[#656565] font-inter uppercase tracking-wider">
                      Найдено: {searchResults.length}
                    </div>
                    {searchResults.map((item) => (
                      <Link
                        key={item.id + item.href}
                        href={item.href}
                        onClick={() => setSearchQuery('')}
                        className={`px-3 py-2.5 rounded-lg font-inter text-sm transition-colors ${
                          isActive(item.href)
                            ? 'bg-[#1f1f1f] text-white font-medium'
                            : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <div className="text-white">{item.title}</div>
                        {item.path.length > 1 && (
                          <div className="text-xs text-[#656565] mt-0.5">
                            {item.path.slice(0, -1).join(' → ')}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-[#656565] font-inter text-center">
                    Ничего не найдено
                  </div>
                )
              ) : (
                // Sections navigation
                SIDEBAR_SECTIONS.map((section) => (
                  <div key={section.id}>
                    {/* Section title */}
                    <div className="px-3 py-2 text-xs font-semibold text-[#656565] uppercase tracking-wider">
                      {section.title}
                    </div>
                    {/* Section items */}
                    <div className="flex flex-col gap-0.5">
                      {section.items.map((item) => renderNavItem(item))}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </div>
        </div>

        {/* Main Content - independent scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-[880px] mx-auto py-8 px-12">
            {/* Info Banner */}
            {isBannerVisible && (
              <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl mb-6">
                <div className="flex items-center gap-3 flex-1">
                  <Info className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="text-sm text-white font-inter font-medium">
                    {bannerText}
                  </span>
                </div>
                <Link 
                  href={bannerLink}
                  className="px-4 py-2 bg-white hover:bg-white/90 rounded-lg text-sm text-black font-inter font-bold transition-colors"
                >
                  Подробнее
                </Link>
                <button 
                  onClick={() => setIsBannerVisible(false)}
                  className="p-1 text-[#656565] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Компоненты для контента
export function DocsBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-[#656565]" />
          )}
          {item.href ? (
            <Link href={item.href} className="text-sm text-[#656565] hover:text-white font-inter font-medium transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-sm text-white font-inter font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function DocsTitle({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[32px] font-bold text-white font-inter leading-tight tracking-[-0.02em] mb-4">
        {children}
      </h1>
      {description && (
        <p className="text-base text-[#a0a0a0] font-inter leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export function DocsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white font-inter leading-tight tracking-[-0.01em] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function DocsTable({ 
  columns, 
  data 
}: { 
  columns: { key: string; title: string }[];
  data: Record<string, string>[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0f0f0f]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className="px-6 py-3.5 text-left text-sm font-semibold text-white font-inter"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#1f1f1f] last:border-b-0 hover:bg-[#1a1a1a] transition-colors">
              {columns.map((col) => (
                <td 
                  key={col.key} 
                  className="px-6 py-3 text-sm text-[#a0a0a0] font-inter"
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsInfoBox({ 
  children, 
  type = 'info' 
}: { 
  children: React.ReactNode; 
  type?: 'info' | 'warning' | 'tip';
}) {
  const styles = {
    info: 'border-[#2a2a2a] bg-[#1a1a1a]',
    warning: 'border-[#854d0e] bg-[#422006]',
    tip: 'border-[#2a2a2a] bg-[#1a1a1a]',
  };
  
  const iconColors = {
    info: 'text-white',
    warning: 'text-[#fbbf24]',
    tip: 'text-white',
  };
  
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${styles[type]} mb-6`}>
      <Info className={`w-5 h-5 flex-shrink-0 ${iconColors[type]}`} />
      <div className="text-sm text-[#a0a0a0] font-inter leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function DocsFooter() {
  return (
    <div className="flex items-center gap-2 pt-6 border-t border-[#1f1f1f] text-sm text-[#656565] font-inter mt-8">
      <span>Обновлено: {new Date().toLocaleDateString('ru-RU')}</span>
      <span className="w-1 h-1 rounded-full bg-[#656565]" />
      <span>BASECRAFT! Team</span>
    </div>
  );
}
