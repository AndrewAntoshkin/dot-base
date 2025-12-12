'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, LogOut, WifiOff } from 'lucide-react';
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
        className={`h-9 px-3 py-2 rounded-xl flex items-center justify-center font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-colors ${
          isActive ? 'bg-[#1f1f1f] text-white' : 'text-white hover:text-white/80'
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
  const router = useRouter();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations, isOffline, networkError } = useGenerations();
  const menuRef = useRef<HTMLDivElement>(null);
  const { email: userEmail, setEmail: setUserEmail, isAdmin } = useUser();

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      });
      if (!response.ok) {
        console.error('Logout failed', await response.text());
      }
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUserEmail(null);
      router.push('/login');
      router.refresh();
    }
  }, [router, setUserEmail]);

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
          {/* Left section - Logo (+ hamburger on mobile) */}
          <div className="flex items-center gap-6 flex-1">
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
          </div>

          {/* Center section - Navigation Links (Desktop Only) - Absolutely centered */}
          <nav className="hidden lg:flex items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
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

          {/* Right section - История, Dashboard, Count, Avatar */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Network status indicator */}
            {(isOffline || networkError) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
                <span className="hidden sm:inline font-inter text-xs text-yellow-500">
                  {isOffline ? 'Офлайн' : 'Проблемы с сетью'}
                </span>
              </div>
            )}

            {/* История link - Desktop Only */}
            <Link
              href="/history"
              className={`hidden lg:flex h-9 px-3 py-2 rounded-2xl items-center font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-colors ${
                pathname === '/history' ? 'bg-[#1f1f1f] text-white' : 'text-white hover:text-white/80'
              }`}
            >
              История
            </Link>

            {/* Dashboard link - Desktop Only, only for admins */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`hidden lg:flex h-9 px-3 py-2 rounded-2xl items-center font-inter font-medium text-xs uppercase tracking-[-0.12px] transition-colors ${
                  pathname === '/admin' || pathname.startsWith('/admin/') 
                    ? 'bg-[#1f1f1f] text-white' 
                    : 'text-white hover:text-white/80'
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {/* Generation count indicator */}
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

            {/* User Avatar */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-white/20 transition-all"
              >
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {userEmail ? userEmail[0].toUpperCase() : 'U'}
                  </span>
                </div>
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-xl z-20 overflow-hidden">
                    {userEmail && (
                      <div className="px-4 py-3 border-b border-[#2f2f2f]">
                        <p className="font-inter text-sm text-[#959595]">Вы вошли как:</p>
                        <p className="font-inter text-sm text-white truncate mt-1">{userEmail}</p>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 flex items-center gap-2 font-inter text-sm text-white hover:bg-[#2f2f2f] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Generations Queue Dropdown */}
            <GenerationsQueue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
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
          
          {/* Галерея */}
          <Link
            href="/history"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
              pathname === '/history' ? 'bg-black' : ''
            }`}
          >
            Галерея
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
    </>
  );
}
