'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { 
  Search, 
  ChevronRight, 
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
  Map,
  FileText,
  ArrowRight,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  PanelLeftClose,
  PanelLeft
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

// Типы для Table of Contents
interface TocItem {
  id: string;
  title: string;
  level: number;
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

// Секционная навигация
const SIDEBAR_SECTIONS: DocNavSection[] = [
  {
    id: 'getting-started',
    title: 'Начало работы',
    items: [
      { id: 'welcome', title: 'Добро пожаловать', href: '/docs', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'quickstart', title: 'Quick Start', href: '/docs/quickstart', icon: <Zap className="w-4 h-4" /> },
      { id: 'assistant', title: 'BASECRAFT AI', href: '/docs/assistant', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'glossary', title: 'Глоссарий', href: '/docs/glossary', icon: <MessageSquare className="w-4 h-4" /> },
    ]
  },
  {
    id: 'models',
    title: 'Модели',
    items: [
      { id: 'models-overview', title: 'Обзор моделей', href: '/docs/models', icon: <Layers className="w-4 h-4" /> },
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
    id: 'features',
    title: 'Функции',
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
      { id: 'func-flow', title: 'Flow', href: '/docs/features/flow', icon: <Layers className="w-4 h-4" />, badge: 'NEW' },
    ]
  },
  {
    id: 'prompts',
    title: 'Prompts',
    items: [
      { id: 'prompt-engineering', title: 'Prompt Engineering', href: '/docs/prompts', icon: <PenTool className="w-4 h-4" /> },
      { id: 'tips', title: 'Tips & Tricks', href: '/docs/tips', icon: <Lightbulb className="w-4 h-4" /> },
    ]
  },
  {
    id: 'help',
    title: 'Помощь',
    items: [
      { id: 'troubleshooting', title: 'Troubleshooting', href: '/docs/troubleshooting', icon: <HelpCircle className="w-4 h-4" /> },
    ]
  },
  {
    id: 'updates',
    title: 'Обновления',
    items: [
      { id: 'changelog', title: 'Changelog', href: '/docs/changelog', icon: <History className="w-4 h-4" /> },
      { id: 'roadmap', title: 'Roadmap', href: '/docs/roadmap', icon: <Map className="w-4 h-4" /> },
    ]
  },
];

interface DocsShellProps {
  children: React.ReactNode;
  title?: string;
  lastUpdated?: string;
  tableOfContents?: TocItem[];
}

export function DocsShell({ 
  children, 
  title,
  lastUpdated,
  tableOfContents = []
}: DocsShellProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  
  // Refs for scroll preservation
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Сохраняем позицию сайдбара при скролле
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      if (!isRestoringScroll.current) {
        sessionStorage.setItem('docs-sidebar-scroll', String(sidebar.scrollTop));
      }
    };

    sidebar.addEventListener('scroll', handleScroll, { passive: true });
    return () => sidebar.removeEventListener('scroll', handleScroll);
  }, []);

  // Восстанавливаем позицию сайдбара при монтировании
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const savedScroll = sessionStorage.getItem('docs-sidebar-scroll');
    if (savedScroll) {
      isRestoringScroll.current = true;
      sidebar.scrollTop = parseInt(savedScroll, 10);
      // Сбрасываем флаг после небольшой задержки
      requestAnimationFrame(() => {
        isRestoringScroll.current = false;
      });
    }
  }, [pathname]);

  // Автоматически раскрываем секцию при переходе на страницу
  useEffect(() => {
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

  // Track active section based on scroll position
  useEffect(() => {
    if (tableOfContents.length === 0 || !mainContentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        root: mainContentRef.current,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    // Observe all headings
    tableOfContents.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tableOfContents]);

  // Handle ToC link click - smooth scroll without losing sidebar position
  const handleTocClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element && mainContentRef.current) {
      const offset = element.offsetTop;
      mainContentRef.current.scrollTo({
        top: offset - 100,
        behavior: 'smooth'
      });
      setActiveSection(id);
      // Update URL without causing page jump
      window.history.pushState(null, '', `#${id}`);
    }
  }, []);

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
    if (exactMatch || href === '/docs/models' || href === '/docs/features') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleCopyPage = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderNavItem = (item: DocNavItem, isNested: boolean = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.href);
    
    return (
      <div key={item.id}>
        <div 
          className={`flex items-center gap-2.5 py-1.5 text-[13px] transition-colors cursor-pointer group ${
            isItemActive && !hasChildren
              ? 'text-white font-medium'
              : 'text-[#888] hover:text-white'
          }`}
          onClick={() => hasChildren ? toggleExpand(item.id) : null}
        >
          {/* Expand arrow for items with children */}
          {hasChildren && (
            <ChevronRight 
              className={`w-3.5 h-3.5 transition-transform flex-shrink-0 text-[#666] ${isExpanded ? 'rotate-90' : ''}`} 
            />
          )}
          
          {/* Title */}
          {hasChildren ? (
            <span className={`flex-1 ${isItemActive ? 'text-white' : ''}`}>{item.title}</span>
          ) : (
            <Link href={item.href} className="flex-1 flex items-center gap-2">
              {item.title}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-white text-black rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col ml-3.5 pl-3 border-l border-[#262626]">
            {item.children!.map(child => (
              <Link
                key={child.id}
                href={child.href}
                className={`py-1.5 text-[13px] transition-colors ${
                  isActive(child.href)
                    ? 'text-white font-medium'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-[#101010] flex flex-col overflow-hidden">
      <Header />

      {/* Main Content Area — отступы как в хедере */}
      <div className="flex flex-1 min-h-0 px-4 lg:px-20">
        {/* Sidebar - collapsible */}
        <div 
          ref={sidebarRef}
          className={`flex-shrink-0 border-r border-[#262626] overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[260px] opacity-100'
          }`}
        >
          <div className="py-4 pr-4 w-[260px]">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 bg-transparent border border-[#262626] rounded-lg mb-5 focus-within:border-[#444] transition-colors">
              <Search className="w-4 h-4 text-[#666]" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#666] outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#666] border border-[#262626] rounded">
                ⌘K
              </kbd>
            </div>

            {/* Navigation or Search Results */}
            <nav className="flex flex-col gap-6">
              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <div className="py-1.5 text-xs text-[#666] font-medium">
                      Найдено: {searchResults.length}
                    </div>
                    {searchResults.map((item) => (
                      <Link
                        key={item.id + item.href}
                        href={item.href}
                        onClick={() => setSearchQuery('')}
                        className={`py-2 text-[13px] transition-colors ${
                          isActive(item.href)
                            ? 'text-white font-medium'
                            : 'text-[#888] hover:text-white'
                        }`}
                      >
                        <div className="text-white">{item.title}</div>
                        {item.path.length > 1 && (
                          <div className="text-xs text-[#666] mt-0.5">
                            {item.path.slice(0, -1).join(' → ')}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-sm text-[#666] text-center">
                    Ничего не найдено
                  </div>
                )
              ) : (
                SIDEBAR_SECTIONS.map((section) => (
                  <div key={section.id}>
                    <div className="py-1.5 text-xs font-medium text-[#666] uppercase tracking-wider">
                      {section.title}
                    </div>
                    <div className="flex flex-col">
                      {section.items.map((item) => renderNavItem(item))}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto scrollbar-hide min-h-0"
        >
          <div className="py-8 px-20 transition-all duration-300">
            {/* Sidebar toggle button - будет в одной строке с breadcrumbs */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-[#666] hover:text-white hover:bg-[#1a1a1a] rounded transition-colors flex-shrink-0"
                title={sidebarCollapsed ? 'Показать меню' : 'Скрыть меню'}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
              {/* Breadcrumbs будут рендериться здесь через DocsBreadcrumb с inline=true */}
              <div id="docs-breadcrumb-slot" />
            </div>
            
            {children}
          </div>
        </div>

        {/* Right Sidebar - Table of Contents */}
        <div className="w-[220px] flex-shrink-0 border-l border-[#262626] overflow-y-auto scrollbar-hide hidden xl:block">
          <div className="py-8 pl-6 sticky top-0">
            {/* On this page */}
            {tableOfContents.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-medium text-white mb-3">На этой странице</div>
                <div className="flex flex-col gap-0.5">
                  {tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleTocClick(e, item.id)}
                      className={`text-[13px] py-1 transition-colors ${
                        item.level === 2 ? '' : 'pl-3'
                      } ${
                        activeSection === item.id 
                          ? 'text-white' 
                          : 'text-[#666] hover:text-white'
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t border-[#262626]">
              <button 
                onClick={handleCopyPage}
                className="flex items-center gap-2 text-[13px] text-[#666] hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Скопировано!' : 'Копировать ссылку'}
              </button>
              <button 
                onClick={() => setFeedbackModalOpen(true)}
                className="flex items-center gap-2 text-[13px] text-[#666] hover:text-white transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Обратная связь
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={feedbackModalOpen} 
        onClose={() => setFeedbackModalOpen(false)} 
      />
    </div>
  );
}

// ============================================
// Компоненты для контента в стиле Vercel
// ============================================

export function DocsBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const content = (
    <div className="flex items-center gap-1.5 text-[13px]">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <span className="text-[#666]">/</span>
          )}
          {item.href ? (
            <Link href={item.href} className="text-[#888] hover:text-white transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[#888]">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );

  // Рендерим в слот рядом с кнопкой сворачивания
  if (mounted) {
    const slot = document.getElementById('docs-breadcrumb-slot');
    if (slot) {
      return createPortal(content, slot);
    }
  }
  
  // Fallback если слот не найден
  return <div className="mb-4">{content}</div>;
}

export function DocsTitle({ 
  children, 
  description,
  lastUpdated 
}: { 
  children: React.ReactNode; 
  description?: string;
  lastUpdated?: string;
}) {
  return (
    <div className="mb-8 pb-6 border-b border-[#262626]">
      <h1 className="text-[40px] font-medium text-white leading-tight tracking-[-0.02em] mb-2">
        {children}
      </h1>
      {lastUpdated && (
        <div className="text-[13px] text-[#666] mb-4">
          Обновлено: {lastUpdated}
        </div>
      )}
      {description && (
        <p className="text-base text-[#888] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export function DocsSection({ 
  title, 
  id,
  children 
}: { 
  title: string; 
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10" id={id}>
      <h2 className="text-[24px] font-medium text-white leading-tight tracking-[-0.01em] mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function DocsSubSection({ 
  title, 
  id,
  children 
}: { 
  title: string; 
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6" id={id}>
      <h3 className="text-[18px] font-medium text-white leading-tight mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DocsParagraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] text-[#888] leading-relaxed mb-4">
      {children}
    </p>
  );
}

export function DocsLink({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  if (external) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white underline underline-offset-4 hover:text-[#888] transition-colors inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    );
  }
  return (
    <Link href={href} className="text-white underline underline-offset-4 hover:text-[#888] transition-colors">
      {children}
    </Link>
  );
}

// Quick Reference карточки в стиле Vercel (только border, без фона)
export function DocsQuickLink({ 
  href, 
  title, 
  icon 
}: { 
  href: string; 
  title: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 py-3 px-4 border border-[#262626] rounded-xl hover:border-[#444] transition-colors group"
    >
      <div className="flex-shrink-0 text-[#666] group-hover:text-white transition-colors">
        {icon || <FileText className="w-4 h-4" />}
      </div>
      <span className="flex-1 text-[14px] text-[#888] group-hover:text-white transition-colors">
        {title}
      </span>
      <ArrowRight className="w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
    </Link>
  );
}

export function DocsQuickLinks({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 mb-8">
      {children}
    </div>
  );
}

// Карточки функций (только border)
export function DocsFeatureCard({ 
  href, 
  title, 
  description,
  icon 
}: { 
  href: string; 
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link 
      href={href}
      className="flex flex-col p-4 border border-[#262626] rounded-xl hover:border-[#444] transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div className="text-[#666] group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
        <span className="text-[14px] font-medium text-white">
          {title}
        </span>
      </div>
      <span className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">
        {description}
      </span>
    </Link>
  );
}

export function DocsFeatureGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {children}
    </div>
  );
}

// Статистика
export function DocsStats({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="py-4 px-5 border border-[#262626] rounded-xl text-center">
          <div className="text-[28px] font-semibold text-white mb-1">{stat.value}</div>
          <div className="text-[13px] text-[#666]">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Таблица (без фона, только border)
export function DocsTable({ 
  columns, 
  data 
}: { 
  columns: { key: string; title: string }[];
  data: Record<string, string>[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#262626] mb-6">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#262626]">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className="px-4 py-3 text-left text-[13px] font-medium text-white"
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-[#262626] last:border-b-0">
              {columns.map((col) => (
                <td 
                  key={col.key} 
                  className="px-4 py-3 text-[13px] text-[#888]"
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

// Info Box — в стиле Vercel (только border)
export function DocsInfoBox({ 
  children, 
  type = 'info',
  title
}: { 
  children: React.ReactNode; 
  type?: 'info' | 'warning' | 'tip';
  title?: string;
}) {
  const icons = {
    info: <FileText className="w-4 h-4" />,
    warning: <FileText className="w-4 h-4" />,
    tip: <Lightbulb className="w-4 h-4" />,
  };
  
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-[#262626] mb-6">
      <div className="flex-shrink-0 text-[#666]">
        {icons[type]}
      </div>
      <div className="flex-1">
        {title && (
          <div className="text-[13px] font-medium text-white mb-1">{title}</div>
        )}
        <div className="text-[13px] text-[#888] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// Code Block (только border)
export function DocsCode({ children, language }: { children: string; language?: string }) {
  return (
    <div className="relative rounded-xl border border-[#262626] mb-6 overflow-hidden">
      {language && (
        <div className="px-4 py-2 border-b border-[#262626] text-[12px] text-[#666]">
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-[13px] text-[#888] font-mono">
          {children}
        </code>
      </pre>
    </div>
  );
}

// Inline Code
export function DocsInlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[13px] text-white bg-[#262626] rounded font-mono">
      {children}
    </code>
  );
}

// List
export function DocsList({ items, ordered = false }: { items: React.ReactNode[]; ordered?: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <ListTag className={`mb-6 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {items.map((item, i) => (
        <li key={i} className="text-[15px] text-[#888] leading-relaxed mb-2 marker:text-[#666]">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

// Модалка обратной связи
function FeedbackModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/support/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state after close animation
        setTimeout(() => {
          setSubject('');
          setMessage('');
          setSuccess(false);
        }, 200);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setTimeout(() => {
        setSubject('');
        setMessage('');
        setError('');
        setSuccess(false);
      }, 200);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
          <h2 className="text-lg font-medium text-white">Обратная связь</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-[#666] hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          {success ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white font-medium">Сообщение отправлено!</p>
              <p className="text-[#666] text-sm mt-1">Мы ответим вам в ближайшее время</p>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div className="mb-4">
                <label className="block text-[13px] text-[#888] mb-2">
                  Тема обращения
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#555] transition-colors disabled:opacity-50"
                >
                  <option value="">Выберите тему...</option>
                  <option value="Вопрос по работе сервиса">Вопрос по работе сервиса</option>
                  <option value="Проблема с генерацией">Проблема с генерацией</option>
                  <option value="Предложение по улучшению">Предложение по улучшению</option>
                  <option value="Ошибка / Баг">Ошибка / Баг</option>
                  <option value="Другое">Другое</option>
                </select>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-[13px] text-[#888] mb-2">
                  Сообщение
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Опишите ваш вопрос или проблему..."
                  rows={5}
                  maxLength={4000}
                  className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#555] transition-colors resize-none disabled:opacity-50"
                />
                <div className="text-[11px] text-[#555] mt-1 text-right">
                  {message.length}/4000
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !subject || !message}
                className="w-full py-2.5 bg-white text-black font-medium rounded-lg hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Отправка...
                  </>
                ) : (
                  'Отправить'
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// Footer с feedback
export function DocsFooter() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="mt-12 pt-6 border-t border-[#262626]">
      {/* Feedback */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-[13px] text-[#666]">Была ли эта страница полезна?</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFeedback('up')}
            className={`p-1.5 rounded transition-colors ${
              feedback === 'up' 
                ? 'bg-[#166534] text-white' 
                : 'text-[#666] hover:text-white hover:bg-[#262626]'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setFeedback('down')}
            className={`p-1.5 rounded transition-colors ${
              feedback === 'down' 
                ? 'bg-[#7f1d1d] text-white' 
                : 'text-[#666] hover:text-white hover:bg-[#262626]'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        {feedback && (
          <span className="text-[13px] text-[#666]">Спасибо за отзыв!</span>
        )}
      </div>
      
      {/* Meta */}
      <div className="flex items-center gap-2 text-[12px] text-[#666]">
        <span>© {new Date().getFullYear()} BASECRAFT</span>
      </div>
    </div>
  );
}

// Navigation List для секции навигации по документации (только border)
export function DocsNavList({ items }: { items: { href: string; title: string; description?: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center justify-between py-3 px-4 border border-[#262626] rounded-xl hover:border-[#444] transition-colors group"
        >
          <div>
            <span className="text-[14px] text-white">{item.title}</span>
            {item.description && (
              <span className="text-[13px] text-[#666] ml-2">— {item.description}</span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-[#666] group-hover:text-white transition-colors" />
        </Link>
      ))}
    </div>
  );
}
