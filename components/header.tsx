'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, ChevronDown, Search, Trash2 } from 'lucide-react';
import { GenerationsQueue } from './generations-queue';
import { AssistantPanel } from './assistant-panel';
import { FlowCreateModal } from './flow/flow-create-modal';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { AnnouncementBanner } from './announcement-banner';
import { useRouter } from 'next/navigation';

// Navigation items with descriptions
const NAV_ITEMS = [
  { href: '/', label: 'Image', description: 'Генерация изображений из текстового описания. Выберите модель, напишите промпт и получите уникальные картинки.' },
  { href: '/video', label: 'Video', description: 'Создание видео из текста или изображения. Превращайте статичные картинки в динамичные ролики.' },
  { href: '/keyframes', label: 'Keyframes', description: 'Создание видео по частям с последующей склейкой. Добавляйте сегменты с начальным и конечным кадром — ИИ сгенерирует и объединит их в одно видео.' },
  { href: '/analyze', label: 'Analyze', description: 'Анализ изображений с помощью ИИ. Получите описание, теги и информацию о содержимом картинки.' },
  { href: '/brainstorm', label: 'Brainstorm', description: 'Сравнение моделей на одном промпте. Сгенерируйте изображение сразу на нескольких моделях и сравните результаты на холсте.' },
  { href: '/inpaint', label: 'Inpaint', description: 'Редактирование части изображения. Выделите область и замените её на что-то новое по описанию.' },
  { href: '/expand', label: 'Outpaint', description: 'Расширение границ изображения. Добавьте контент за пределами исходной картинки.' },
  { href: '/flow', label: 'Flow', description: 'Визуальный конструктор AI-пайплайнов. Создавайте цепочки из блоков: Текст → Изображение → Видео.' },
  { href: '/lora', label: 'LoRA', description: 'Обучение и использование кастомных LoRA моделей. Создайте свой уникальный стиль на основе ваших изображений.' },
];

// NavLink component with tooltip
function NavLinkWithTooltip({ href, label, description, isActive }: { 
  href: string; 
  label: string; 
  description: string;
  isActive: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={href}
        className={`h-9 px-3 py-2 rounded-xl flex items-center justify-center font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-all duration-150 ${
          isActive ? 'bg-[#1f1f1f] text-white' : 'bg-transparent text-white hover:text-white/80 hover:bg-[#1f1f1f]/50'
        }`}
      >
        {label}
      </Link>
      
      {/* Tooltip */}
      <div 
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] p-4 bg-[#1A1A1A] rounded-xl z-50 transition-all duration-200 ${
          isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        style={{ boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.8)' }}
      >
        {/* Arrow */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1A1A1A] rotate-45" />
        
        <div className="relative flex flex-col gap-2">
          <span className="font-inter font-medium text-xs uppercase tracking-[-0.12px] text-white">
            {label}
          </span>
          <p className="font-inter font-normal text-sm leading-5 text-[#959595]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple tooltip wrapper for right header elements
function HeaderTooltip({ 
  children, 
  label, 
  description,
  align = 'center',
  disabled = false
}: { 
  children: React.ReactNode; 
  label: string; 
  description: string;
  align?: 'left' | 'center' | 'right';
  disabled?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const wasDisabledRef = useRef(disabled);

  // При закрытии dropdown (disabled: true → false) сбрасываем hover
  // чтобы тултип не появлялся сразу
  useEffect(() => {
    if (wasDisabledRef.current && !disabled) {
      setIsHovered(false);
    }
    wasDisabledRef.current = disabled;
  }, [disabled]);

  const alignmentClasses = {
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0'
  };

  const arrowAlignmentClasses = {
    left: 'left-4',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-4'
  };

  const showTooltip = isHovered && !disabled;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Tooltip - only visible on desktop */}
      <div 
        className={`hidden lg:block absolute top-full ${alignmentClasses[align]} mt-2 w-[220px] p-3 bg-[#1A1A1A] rounded-xl z-50 transition-all duration-200 ${
          showTooltip ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        }`}
        style={{ boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.8)' }}
      >
        {/* Arrow */}
        <div className={`absolute -top-1.5 ${arrowAlignmentClasses[align]} w-3 h-3 bg-[#1A1A1A] rotate-45`} />
        
        <div className="relative flex flex-col gap-1">
          <span className="font-inter font-medium text-xs text-white">
            {label}
          </span>
          <p className="font-inter font-normal text-xs leading-4 text-[#959595]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// Flow navigation with dropdown
interface UserFlow {
  id: string;
  name: string;
  updated_at: string;
}

function FlowNavDropdown({ isActive }: { isActive: boolean }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userFlows, setUserFlows] = useState<UserFlow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user flows when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchFlows();
    }
  }, [isOpen]);

  const fetchFlows = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/flow');
      if (response.ok) {
        const data = await response.json();
        setUserFlows(data.flows || []);
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter flows by search
  const filteredFlows = userFlows.filter(flow =>
    flow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create flow
  const handleCreateFlow = async (data: {
    name: string;
    description: string;
    members: { email: string; role: 'editor' | 'viewer' }[];
  }) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          members: data.members,
          nodes: [],
          edges: [],
          viewport_x: 0,
          viewport_y: 0,
          viewport_zoom: 1,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsCreateModalOpen(false);
        setIsOpen(false);
        router.push(`/flow?id=${result.flow.id}`);
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle flow click
  const handleFlowClick = (flowId: string) => {
    setIsOpen(false);
    router.push(`/flow?id=${flowId}`);
  };

  // Handle delete flow
  const handleDeleteFlow = async (e: React.MouseEvent, flowId: string, flowName: string) => {
    e.stopPropagation();
    if (!confirm(`Удалить Flow "${flowName}"? Это действие нельзя отменить.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/flow/${flowId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Обновляем список
        setUserFlows(prev => prev.filter(f => f.id !== flowId));
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-9 px-3 py-2 rounded-xl flex items-center gap-1 font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-all duration-150 border ${
            isActive || isOpen
              ? 'bg-[#1f1f1f] text-white border-white'
              : 'bg-transparent text-white hover:text-white/80 hover:bg-[#1f1f1f]/50 border-transparent'
          }`}
        >
          FLOW
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div 
              className="absolute top-full left-0 mt-2 w-[280px] p-3 bg-[#171717] rounded-2xl z-50"
              style={{ boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.9)' }}
            >
              {/* Create button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full h-10 px-4 mb-2 flex items-center justify-center gap-2 rounded-xl border border-[#2F2F2F] text-white text-sm font-medium hover:bg-[#212121] transition-colors"
              >
                Создать флоу
              </button>

              {/* Title */}
              <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                Ваши Flow ({userFlows.length})
              </p>

              {/* Search */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 px-3 pr-10 bg-transparent border border-[#2B2B2B] rounded-xl text-sm text-white placeholder:text-[#959595] outline-none focus:border-white/50 transition-colors"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white" />
              </div>

              {/* Flows list */}
              <div className="max-h-[240px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                ) : filteredFlows.length === 0 ? (
                  <p className="text-sm text-[#656565] px-3 py-2">
                    {searchQuery ? 'Ничего не найдено' : 'Нет сохранённых Flow'}
                  </p>
                ) : (
                  filteredFlows.map((flow) => (
                    <div
                      key={flow.id}
                      className="group flex items-center gap-2 px-3 py-3 rounded-[10px] transition-colors cursor-pointer hover:bg-[#232323]"
                      onClick={() => handleFlowClick(flow.id)}
                    >
                      <span className="flex-1 text-sm font-medium text-white truncate">
                        {flow.name || 'Без названия'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteFlow(e, flow.id, flow.name || 'Без названия')}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-[#2F2F2F] transition-all flex-shrink-0"
                        title="Удалить Flow"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#959595] hover:text-white" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Flow Modal */}
      <FlowCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateFlow}
        isLoading={isCreating}
      />
    </>
  );
}

export function Header() {
  const pathname = usePathname();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations } = useGenerations();
  const menuRef = useRef<HTMLDivElement>(null);
  const { email: userEmail, isAdmin, workspaces, selectedWorkspaceId, setSelectedWorkspaceId, avatarUrl } = useUser();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Get current mode based on pathname
  const currentMode = pathname === '/video' ? 'video' : pathname === '/keyframes' ? 'keyframes' : pathname === '/analyze' ? 'analyze' : pathname === '/brainstorm' ? 'brainstorm' : pathname === '/inpaint' ? 'inpaint' : pathname === '/expand' ? 'expand' : pathname === '/flow' ? 'flow' : pathname === '/lora' ? 'lora' : 'image';
  
  // isAdmin теперь приходит из UserContext (роль загружается из БД)
  
  return (
    <>
      <header className="sticky top-0 z-50 bg-[#101010]">
        {/* Announcement Banner - над хедером */}
        <AnnouncementBanner />
        
        <div className="px-4 lg:px-20 py-3 flex items-center border-b border-[#2f2f2f]">
          {/* Left section - Logo + Navigation */}
          <div className="flex items-center gap-6">
            {/* Hamburger Menu - Mobile Only */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-6 h-6 flex flex-col justify-center items-center gap-[5px]"
              aria-label="Open menu"
            >
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
            </button>

            {/* Logo - links to landing page */}
            <Link href="/welcome" className="flex items-center">
              <Image 
                src="/baseCRLogo.svg" 
                alt="BASE" 
                width={65} 
                height={18}
                priority
                className="h-[18px] w-auto"
              />
            </Link>

            {/* Navigation Links (Desktop Only) - Next to logo */}
            <nav className="hidden lg:flex items-center gap-2">
              {NAV_ITEMS
                .filter(item => item.href !== '/lora' || isAdmin)
                .map((item) => (
                  item.href === '/flow' ? (
                    <FlowNavDropdown 
                      key={item.href}
                      isActive={pathname === '/flow' || pathname.startsWith('/flow')}
                    />
                  ) : (
                    <NavLinkWithTooltip
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      description={item.description}
                      isActive={pathname === item.href}
                    />
                  )
              ))}
            </nav>
          </div>

          {/* Right section - Workspace, Dashboard, Count, Avatar */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Workspace Switcher - Desktop Only, only if more than 1 workspace */}
            {workspaces.length > 1 && (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                  className="flex items-center gap-2 h-9 px-3 py-2 rounded-xl border border-[#303030] font-inter font-medium text-xs text-white transition-colors hover:border-white/50"
                >
                  <span className="max-w-[120px] truncate">
                    {workspaces.find(w => w.id === selectedWorkspaceId)?.name || 'Пространство'}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${isWorkspaceSwitcherOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isWorkspaceSwitcherOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsWorkspaceSwitcherOpen(false)}
                    />
                    <div 
                      className="absolute right-0 top-full mt-2 min-w-[200px] p-2 bg-[#1A1A1A] rounded-xl z-20"
                      style={{ boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.8)' }}
                    >
                      {workspaces.map((workspace) => (
                        <button
                          key={workspace.id}
                          onClick={() => {
                            setSelectedWorkspaceId(workspace.id);
                            setIsWorkspaceSwitcherOpen(false);
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between rounded-lg transition-colors ${
                            selectedWorkspaceId === workspace.id 
                              ? 'bg-[#2c2c2c] text-white' 
                              : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                          }`}
                        >
                          <span className="font-inter font-normal text-sm truncate">
                            {workspace.name}
                          </span>
                          {selectedWorkspaceId === workspace.id && (
                            <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Dashboard link - Desktop Only, only for admins */}
            {isAdmin && (
              <HeaderTooltip 
                label="Dashboard" 
                description="Панель администратора для управления платформой и просмотра статистики"
                align="right"
              >
                <Link
                  href="/admin"
                  className={`hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-colors border border-[#303030] ${
                    pathname === '/admin' || pathname.startsWith('/admin/') 
                      ? 'bg-[#1f1f1f]' 
                      : 'hover:border-white/50'
                  }`}
                >
                  <Image src="/icon-dashboard.svg" alt="Dashboard" width={16} height={16} />
                </Link>
              </HeaderTooltip>
            )}

            {/* Docs link - Desktop Only */}
            <HeaderTooltip 
              label="Документация" 
              description="Руководство по использованию платформы, описание моделей и возможностей"
              align="right"
            >
              <Link
                href="/docs"
                className={`hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-colors border border-[#303030] ${
                  pathname === '/docs' || pathname.startsWith('/docs/') 
                    ? 'bg-[#1f1f1f]' 
                    : 'hover:border-white/50'
                }`}
              >
                <Image src="/icon-docs-new.svg" alt="Docs" width={16} height={16} />
              </Link>
            </HeaderTooltip>
            
            {/* Assistant button */}
            <HeaderTooltip 
              label="Ассистент" 
              description="AI-помощник для написания промптов и анализа изображений"
              align="right"
            >
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="hidden lg:flex w-9 h-9 px-2 py-3 rounded-xl items-center justify-center transition-colors border border-[#303030] hover:border-white/50"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.99214 0.0227393C7.98537 0.0398037 7.97329 0.119653 7.96517 0.200453C7.93082 0.543024 7.80755 1.44746 7.70774 2.09106C7.31129 4.64427 6.72088 5.88994 5.54637 6.65111C5.49657 6.68337 5.45144 6.70984 5.44594 6.70984C5.44045 6.70984 5.41551 6.72448 5.39042 6.74241C5.3418 6.77711 5.05218 6.92663 4.92368 6.98341C4.33564 7.24318 3.58408 7.44918 2.52629 7.64071C2.42228 7.65951 2.28313 7.68339 2.21697 7.69377C2.15082 7.70415 2.05415 7.71972 2.00212 7.72834C1.9501 7.73697 1.84578 7.75259 1.77011 7.76311C1.69445 7.77363 1.59006 7.78923 1.53809 7.79784C1.48613 7.80646 1.23479 7.84096 0.979612 7.87482C0.724437 7.90868 0.463777 7.94391 0.400565 7.95323C0.337352 7.96255 0.252161 7.97094 0.211494 7.97165C0.170827 7.97235 0.106572 7.98278 0.0686926 7.99479L0 8.01668L0.0602082 8.02717C0.0932149 8.03294 0.197565 8.04641 0.292217 8.05728C0.547918 8.08652 1.09209 8.15734 1.29746 8.18813C1.50157 8.21871 1.6447 8.23897 1.77011 8.25508C1.81745 8.26122 1.89094 8.27277 1.93337 8.28088C1.97579 8.28899 2.07261 8.30496 2.14822 8.31617C2.32359 8.34227 2.92909 8.4486 3.04188 8.47298C3.08922 8.48316 3.15882 8.49839 3.19662 8.50659C3.78138 8.63438 4.46942 8.838 4.79477 8.97981C4.86261 9.00926 4.99667 9.06969 5.10617 9.12006C5.2395 9.18137 5.47237 9.3199 5.66778 9.45397C6.66224 10.1364 7.22068 11.2561 7.59496 13.318C7.62731 13.4963 7.66605 13.7199 7.68107 13.8149C7.69609 13.9099 7.71563 14.0303 7.72441 14.0825C7.73319 14.1347 7.74902 14.2396 7.75953 14.3156C7.77004 14.3916 7.78598 14.5004 7.79489 14.5573C7.80379 14.6143 7.82695 14.7853 7.84642 14.9372C7.86589 15.0891 7.89698 15.3339 7.91582 15.4811C7.93466 15.6283 7.95585 15.8009 7.96314 15.8648C7.97583 15.9781 7.98942 16.0154 8.01034 15.9944C8.01599 15.9887 8.02713 15.9078 8.03488 15.8146C8.09004 15.1574 8.36585 13.3599 8.49797 12.7962C8.72003 11.8496 8.84858 11.4515 9.1021 10.9257C9.30798 10.4985 9.53622 10.1709 9.8377 9.86938C10.4413 9.26588 11.1992 8.89596 12.4683 8.58528C12.8306 8.49656 13.399 8.38576 13.8432 8.31732C13.9141 8.30641 14.0146 8.29007 14.0666 8.28108C14.1186 8.27208 14.2501 8.25218 14.3588 8.23699C14.4675 8.22181 14.6067 8.20178 14.6681 8.19273C14.8762 8.16183 15.5349 8.07663 15.725 8.05594C15.829 8.04456 15.9334 8.02966 15.957 8.02267L16 8.01002L15.9089 7.99008C15.8588 7.97917 15.7899 7.97029 15.7557 7.97029C15.7215 7.97029 15.6464 7.96311 15.5889 7.95423C15.5315 7.94536 15.4187 7.9298 15.3383 7.91974C14.4882 7.81218 13.4921 7.65559 12.9495 7.54407C12.8314 7.51976 12.7154 7.49599 12.6917 7.49116C12.6103 7.47465 12.0472 7.33008 12.0043 7.31463C11.9807 7.30608 11.8801 7.2746 11.7809 7.24467C10.8887 6.97592 10.139 6.5302 9.69566 6.00545C9.02908 5.21602 8.64672 4.18403 8.34439 2.35875C8.31527 2.18307 8.28393 1.99661 8.27459 1.94445C8.23337 1.71175 8.07264 0.501699 8.03535 0.143598C8.02034 -0.000831749 8.01126 -0.0261197 7.99214 0.0227393Z" fill="white"/>
                </svg>
              </button>
            </HeaderTooltip>

            {/* Generation count indicator with dropdown */}
            <HeaderTooltip 
              label="Очередь генераций" 
              description="Нажмите, чтобы посмотреть активные и завершённые генерации"
              align="right"
              disabled={isQueueOpen}
            >
              <div className="relative">
                <button
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className={`w-9 h-9 rounded-xl border border-[#303030] flex items-center justify-center transition-colors ${
                    unviewedCount > 0 ? 'hover:border-white/50' : ''
                  }`}
                >
                  {hasActiveGenerations ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <span className="font-inter font-medium text-base text-white tracking-[-0.32px]">
                      {unviewedCount}
                    </span>
                  )}
                </button>
                
                {/* Generations Queue Dropdown */}
                <GenerationsQueue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
              </div>
            </HeaderTooltip>

            {/* User Avatar - Click to go to profile */}
            <HeaderTooltip 
              label="Профиль" 
              description="Настройки аккаунта, история генераций и персональные данные"
              align="right"
            >
              <Link
                href="/profile"
                className="flex w-9 h-9 rounded-xl overflow-hidden hover:ring-2 hover:ring-white/20 transition-all"
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {userEmail ? userEmail[0].toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
              </Link>
            </HeaderTooltip>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown - Pixel Perfect by Figma */}
      {isMobileMenuOpen && (
        <div 
          ref={menuRef}
          className="lg:hidden fixed left-4 top-[68px] z-[60] w-[calc(100%-32px)] max-w-[361px] bg-[#131313] rounded-[20px] p-4 flex flex-col gap-3"
          style={{ 
            boxShadow: '0px 4px 32px 0px rgba(0,0,0,0.9)'
          }}
        >
          {/* Navigation Items */}
          <div className="flex flex-col gap-1">
            {/* IMAGE */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                currentMode === 'image' ? 'bg-black' : ''
              }`}
            >
              IMAGE
            </Link>
            
            {/* VIDEO */}
            <Link
              href="/video"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                currentMode === 'video' ? 'bg-black' : ''
              }`}
            >
              VIDEO
            </Link>
            
            {/* KEYFRAMES */}
            <Link
              href="/keyframes"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                pathname === '/keyframes' ? 'bg-black' : ''
              }`}
            >
              KEYFRAMES
            </Link>
            
            {/* ANALYZE */}
            <Link
              href="/analyze"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                currentMode === 'analyze' ? 'bg-black' : ''
              }`}
            >
              ANALYZE
            </Link>
            
            {/* BRAINSTORM */}
            <Link
              href="/brainstorm"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white flex items-center gap-2 ${
                currentMode === 'brainstorm' ? 'bg-black' : ''
              }`}
            >
              BRAINSTORM
            </Link>
            
            {/* INPAINT */}
            <Link
              href="/inpaint"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white flex items-center gap-2 ${
                currentMode === 'inpaint' ? 'bg-black' : ''
              }`}
            >
              INPAINT
            </Link>
            
            {/* OUTPAINT */}
            <Link
              href="/expand"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white flex items-center gap-2 ${
                currentMode === 'expand' ? 'bg-black' : ''
              }`}
            >
              OUTPAINT
            </Link>
            
            {/* FLOW */}
            <Link
              href="/flow"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white flex items-center gap-2 ${
                currentMode === 'flow' ? 'bg-black' : ''
              }`}
            >
              FLOW
            </Link>
            
            {/* LORA - only for admins */}
            {isAdmin && (
              <Link
                href="/lora"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white flex items-center gap-2 ${
                  currentMode === 'lora' ? 'bg-black' : ''
                }`}
              >
                LORA
              </Link>
            )}
          </div>
          
          {/* Divider */}
          <div className="h-px w-full bg-[#606060]" />
          
          {/* Profile */}
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
              pathname === '/profile' ? 'bg-black' : ''
            }`}
          >
            Профиль
          </Link>
          
          {/* Пространства - only for admins */}
          {isAdmin && (
            <Link
              href="/workspaces"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                pathname === '/workspaces' || pathname.startsWith('/workspaces/') ? 'bg-black' : ''
              }`}
            >
              Пространства
            </Link>
          )}
          
          {/* Docs - for all users */}
          <Link
            href="/docs"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
              pathname === '/docs' || pathname.startsWith('/docs/') ? 'bg-black' : ''
            }`}
          >
            Документация
          </Link>

          {/* Dashboard - only for admins */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                pathname === '/admin' || pathname.startsWith('/admin/') ? 'bg-black' : ''
              }`}
            >
              Dashboard
            </Link>
          )}
        </div>
      )}

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[55] bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Assistant Panel */}
      <AssistantPanel 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)}
        context={{
          currentAction: pathname === '/' ? 'Создание изображения' :
                         pathname === '/video' ? 'Создание видео' :
                         pathname === '/keyframes' ? 'Keyframes' :
                         pathname === '/analyze' ? 'Анализ изображения' :
                         pathname === '/brainstorm' ? 'Brainstorm' :
                         pathname === '/inpaint' ? 'Inpainting' :
                         pathname === '/expand' ? 'Outpainting' :
                         pathname === '/lora' ? 'LoRA' :
                         undefined
        }}
      />
    </>
  );
}
