'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Search, ChevronRight, Info, X } from 'lucide-react';

// Типы для навигации документации
interface DocNavItem {
  id: string;
  title: string;
  href: string;
  children?: DocNavItem[];
}

// Функция для получения всех элементов навигации (плоский список)
function flattenNavItems(items: DocNavItem[], parentPath: string[] = []): Array<DocNavItem & { path: string[] }> {
  const result: Array<DocNavItem & { path: string[] }> = [];
  
  for (const item of items) {
    const currentPath = [...parentPath, item.title];
    result.push({ ...item, path: currentPath });
    
    if (item.children) {
      result.push(...flattenNavItems(item.children, currentPath));
    }
  }
  
  return result;
}

// Функция поиска
function searchNavItems(items: DocNavItem[], query: string): Array<DocNavItem & { path: string[] }> {
  if (!query.trim()) return [];
  
  const flatItems = flattenNavItems(items);
  const lowerQuery = query.toLowerCase();
  
  return flatItems.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    item.href.toLowerCase().includes(lowerQuery)
  );
}

interface DocTab {
  id: string;
  title: string;
  href: string;
}

// Табы верхней навигации
const DOC_TABS: DocTab[] = [
  { id: 'about', title: 'О платформе', href: '/docs' },
  { id: 'quickstart', title: 'Quick Start', href: '/docs/quickstart' },
  { id: 'features', title: 'Функции', href: '/docs/features' },
  { id: 'prompts', title: 'Prompt engineering', href: '/docs/prompts' },
  { id: 'tips', title: 'Tips & Tricks', href: '/docs/tips' },
  { id: 'troubleshooting', title: 'Troubleshooting', href: '/docs/troubleshooting' },
  { id: 'glossary', title: 'Глоссарий', href: '/docs/glossary' },
  { id: 'changelog', title: 'Changelog', href: '/docs/changelog' },
];

// Боковая навигация с семействами моделей
const SIDEBAR_NAV: DocNavItem[] = [
  { id: 'overview', title: 'Обзор платформы', href: '/docs' },
  { id: 'quickstart', title: 'Quick Start', href: '/docs/quickstart' },
  { 
    id: 'models', 
    title: 'Модели', 
    href: '/docs/models',
    children: [
      { 
        id: 'flux', 
        title: 'FLUX', 
        href: '/docs/models/flux',
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
        children: [
          { id: 'hailuo-2-3', title: 'Hailuo 2.3', href: '/docs/models/hailuo/hailuo-2-3' },
          { id: 'hailuo-02', title: 'Hailuo 02', href: '/docs/models/hailuo/hailuo-02' },
        ]
      },
      { 
        id: 'seedream', 
        title: 'SeeDream', 
        href: '/docs/models/seedream',
        children: [
          { id: 'seedream-4-5', title: 'SeeDream 4.5', href: '/docs/models/seedream/seedream-4-5' },
          { id: 'seedream-4', title: 'SeeDream 4', href: '/docs/models/seedream/seedream-4' },
        ]
      },
      { 
        id: 'recraft', 
        title: 'Recraft', 
        href: '/docs/models/recraft',
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
        children: [
          { id: 'veo-3-1', title: 'Veo 3.1 Fast', href: '/docs/models/google/veo-3-1' },
          { id: 'imagen-4', title: 'Imagen 4 Ultra', href: '/docs/models/google/imagen-4' },
        ]
      },
      { 
        id: 'ideogram', 
        title: 'Ideogram', 
        href: '/docs/models/ideogram',
        children: [
          { id: 'ideogram-v3', title: 'Ideogram V3 Turbo', href: '/docs/models/ideogram/ideogram-v3' },
        ]
      },
      { 
        id: 'other', 
        title: 'Другие модели', 
        href: '/docs/models/other',
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
    id: 'functions', 
    title: 'Функции', 
    href: '/docs/features',
    children: [
      { id: 'func-image', title: 'Image', href: '/docs/features/image' },
      { id: 'func-video', title: 'Video', href: '/docs/features/video' },
      { id: 'func-keyframes', title: 'Keyframes', href: '/docs/features/keyframes' },
      { id: 'func-analyze', title: 'Analyze', href: '/docs/features/analyze' },
      { id: 'func-brainstorm', title: 'Brainstorm', href: '/docs/features/brainstorm' },
      { id: 'func-inpaint', title: 'Inpaint', href: '/docs/features/inpaint' },
      { id: 'func-outpaint', title: 'Outpaint', href: '/docs/features/outpaint' },
      { id: 'func-upscale', title: 'Upscale', href: '/docs/features/upscale' },
      { id: 'func-remove-bg', title: 'Remove BG', href: '/docs/features/remove-bg' },
      { id: 'func-edit', title: 'Edit', href: '/docs/features/edit' },
    ]
  },
  { id: 'troubleshooting', title: 'Troubleshooting', href: '/docs/troubleshooting' },
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
  const [expandedItems, setExpandedItems] = useState<string[]>(['models']);

  // Результаты поиска
  const searchResults = useMemo(() => {
    return searchNavItems(SIDEBAR_NAV, searchQuery);
  }, [searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const isActive = (href: string) => {
    // Для /docs — только точное совпадение
    if (href === '/docs') {
      return pathname === '/docs';
    }
    // Для остальных — точное или дочерние страницы
    return pathname === href || pathname.startsWith(href + '/');
  };
  
  const getActiveTab = () => {
    for (const tab of DOC_TABS) {
      if (pathname === tab.href || (tab.href !== '/docs' && pathname.startsWith(tab.href))) {
        return tab.id;
      }
    }
    // Default to 'about' for /docs and model pages
    if (pathname === '/docs' || pathname.startsWith('/docs/models')) {
      return 'about';
    }
    return 'about';
  };

  const renderNavItem = (item: DocNavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.href);
    
    return (
      <div key={item.id}>
        <div 
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-inter text-sm transition-colors cursor-pointer ${
            isItemActive && !hasChildren
              ? 'bg-[#212121] text-white font-medium'
              : 'text-[#959595] hover:text-white'
          }`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={() => hasChildren ? toggleExpand(item.id) : null}
        >
          {hasChildren ? (
            <span className={isItemActive ? 'text-white font-medium' : ''}>{item.title}</span>
          ) : (
            <Link href={item.href} className="flex-1">
              {item.title}
            </Link>
          )}
          {hasChildren && (
            <ChevronRight 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            />
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#101010]">
      <Header />
      
      {/* Tabs Navigation */}
      <div className="flex items-end gap-2 px-20 py-4 pb-6 border-b border-[#2f2f2f]">
        {DOC_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-3 py-2 rounded-xl font-inter text-xs uppercase transition-colors ${
              getActiveTab() === tab.id
                ? 'bg-[#212121] text-white font-semibold'
                : 'text-[#959595] hover:text-white font-normal'
            }`}
          >
            {tab.title}
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex gap-8 px-20">
        {/* Sidebar */}
        <div className="w-[280px] flex-shrink-0 py-6 border-r border-[#2f2f2f] pr-6">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#2b2b2b] rounded-xl mb-3 focus-within:border-[#4a4a4a] transition-colors">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#959595] outline-none font-inter"
            />
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-[#959595] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="w-5 h-5 text-[#656565]" />
            )}
          </div>

          {/* Navigation or Search Results */}
          <nav className="flex flex-col">
            {searchQuery.trim() ? (
              // Показываем результаты поиска
              searchResults.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-2 text-xs text-[#656565] font-inter uppercase tracking-wide">
                    Найдено: {searchResults.length}
                  </div>
                  {searchResults.map((item) => (
                    <Link
                      key={item.id + item.href}
                      href={item.href}
                      onClick={() => setSearchQuery('')}
                      className={`px-3 py-2.5 rounded-xl font-inter text-sm transition-colors ${
                        isActive(item.href)
                          ? 'bg-[#212121] text-white font-medium'
                          : 'text-[#959595] hover:text-white hover:bg-[#1a1a1a]'
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
              // Показываем обычную навигацию
              SIDEBAR_NAV.map((item) => renderNavItem(item))
            )}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 py-8 px-8 max-w-[880px]">
          {/* Info Banner */}
          {isBannerVisible && (
            <div className="flex items-center gap-3 p-3 bg-[#212121] rounded-2xl mb-6">
              <div className="flex items-center gap-3 flex-1">
                <Info className="w-5 h-5 text-white flex-shrink-0" />
                <span className="text-sm text-white font-inter font-medium">
                  {bannerText}
                </span>
              </div>
              <Link 
                href={bannerLink}
                className="px-4 py-2.5 bg-[#303030] hover:bg-[#404040] rounded-full text-sm text-white font-inter font-bold transition-colors"
              >
                Подробнее
              </Link>
              <button 
                onClick={() => setIsBannerVisible(false)}
                className="p-1 text-white hover:text-[#959595] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {children}
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
            <ChevronRight className="w-4 h-4 text-[#959595]" />
          )}
          {item.href ? (
            <Link href={item.href} className="text-sm text-[#959595] hover:text-white font-inter font-medium transition-colors">
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
      <h1 className="text-[30px] font-bold text-white font-inter leading-tight tracking-[-0.013em] mb-4">
        {children}
      </h1>
      {description && (
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

// DocsHero removed - no longer used

export function DocsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white font-inter leading-tight tracking-[-0.012em] mb-4">
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
    <div className="overflow-hidden rounded-xl border border-[#2f2f2f]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#d5d5d5]">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className="px-6 py-3.5 text-left text-base font-bold text-white font-inter"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#4e4e4e] last:border-b-0">
              {columns.map((col) => (
                <td 
                  key={col.key} 
                  className="px-6 py-3 text-sm text-[#959595] font-inter"
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
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-[#2f2f2f] mb-6">
      <Info className="w-5 h-5 text-white flex-shrink-0" />
      <div className="text-sm text-[#959595] font-inter leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function DocsFooter() {
  return (
    <div className="flex items-center gap-2 pt-6 border-t border-[#2f2f2f] text-sm text-[#959595] font-inter mt-8">
      <span>Обновлено: {new Date().toLocaleDateString('ru-RU')}</span>
      <span className="w-1 h-1 rounded-full bg-[#959595]" />
      <span>BASE Team</span>
    </div>
  );
}
