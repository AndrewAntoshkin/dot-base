'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, WifiOff, Check, ChevronDown } from 'lucide-react';
import { GenerationsQueue } from './generations-queue';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';

// Navigation items with descriptions
const NAV_ITEMS = [
  { href: '/', label: 'Image', description: 'Генерация изображений из текстового описания. Выберите модель, напишите промпт и получите уникальные картинки.' },
  { href: '/video', label: 'Video', description: 'Создание видео из текста или изображения. Превращайте статичные картинки в динамичные ролики.' },
  { href: '/keyframes', label: 'Keyframes', description: 'Создание видео по частям с последующей склейкой. Добавляйте сегменты с начальным и конечным кадром — ИИ сгенерирует и объединит их в одно видео.' },
  { href: '/analyze', label: 'Analyze', description: 'Анализ изображений с помощью ИИ. Получите описание, теги и информацию о содержимом картинки.' },
  { href: '/brainstorm', label: 'Brainstorm', description: 'Генерация идей и промптов. ИИ поможет придумать креативные концепции для ваших проектов.' },
  { href: '/inpaint', label: 'Inpaint', description: 'Редактирование части изображения. Выделите область и замените её на что-то новое по описанию.' },
  { href: '/expand', label: 'Outpaint', description: 'Расширение границ изображения. Добавьте контент за пределами исходной картинки.' },
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
          isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
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

export function Header() {
  const pathname = usePathname();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations, isOffline, networkError } = useGenerations();
  const menuRef = useRef<HTMLDivElement>(null);
  const { email: userEmail, isAdmin, workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useUser();

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
  const currentMode = pathname === '/video' ? 'video' : pathname === '/keyframes' ? 'keyframes' : pathname === '/analyze' ? 'analyze' : pathname === '/brainstorm' ? 'brainstorm' : pathname === '/inpaint' ? 'inpaint' : pathname === '/expand' ? 'expand' : 'image';
  
  // isAdmin теперь приходит из UserContext (роль загружается из БД)
  
  return (
    <>
      <header className="sticky top-0 z-50 bg-[#101010] border-b border-[#2f2f2f]">
        <div className="px-4 lg:px-20 py-3 flex items-center">
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
              {NAV_ITEMS.map((item) => (
                <NavLinkWithTooltip
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                  isActive={pathname === item.href}
                />
              ))}
            </nav>
          </div>

          {/* Right section - Workspace, Dashboard, Count, Avatar */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Network status indicator */}
            {(isOffline || networkError) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
                <span className="hidden sm:inline font-inter text-xs text-yellow-500">
                  {isOffline ? 'Офлайн' : 'Проблемы с сетью'}
                </span>
              </div>
            )}

            {/* Workspace Switcher - Desktop Only, only if more than 1 workspace */}
            {workspaces.length > 1 && (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                  className="flex items-center gap-2 h-9 px-3 py-2 rounded-xl border border-[#4d4d4d] font-inter font-medium text-xs text-white transition-colors hover:border-white/50"
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
              <Link
                href="/admin"
                className={`hidden lg:flex h-9 px-3 py-2 rounded-xl items-center font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-colors border border-[#4d4d4d] ${
                  pathname === '/admin' || pathname.startsWith('/admin/') 
                    ? 'bg-[#1f1f1f] text-white' 
                    : 'text-white hover:border-white/50'
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {/* Generation count indicator with dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className={`w-8 h-8 rounded-full border-2 border-[#434343] flex items-center justify-center transition-colors ${
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

            {/* User Avatar - Click to go to profile */}
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-white/20 transition-all"
              style={{ border: '0.67px solid rgba(255,255,255,0.3)' }}
            >
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userEmail ? userEmail[0].toUpperCase() : 'U'}
                </span>
              </div>
            </Link>
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
    </>
  );
}
