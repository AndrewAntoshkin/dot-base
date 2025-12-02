'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, LogOut, WifiOff } from 'lucide-react';
import { GenerationsQueue } from './generations-queue';
import { useGenerations } from '@/contexts/generations-context';
import { createBrowserClient } from '@supabase/ssr';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations, isOffline, networkError } = useGenerations();
  const menuRef = useRef<HTMLDivElement>(null);

  // Мемоизируем Supabase клиент - создаём только один раз
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    let isMounted = true;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        setUserEmail(user.email || null);
      }
    };
    getUser();
    return () => { isMounted = false; };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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
  const currentMode = pathname === '/video' ? 'video' : pathname === '/analyze' ? 'analyze' : 'image';
  
  return (
    <>
      <header className="sticky top-0 z-50 bg-[#131313]">
        <div className="px-4 lg:px-20 py-3 lg:py-3 flex items-center justify-between">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-4 lg:gap-6">
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

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/LogoBase.svg" 
                alt="BASE" 
                width={65} 
                height={18}
                priority
                className="h-4 lg:h-[18px] w-auto"
              />
            </Link>

            {/* Navigation Links - Desktop Only */}
            <nav className="hidden lg:flex items-start gap-1">
              <Link
                href="/"
                className={`px-3 py-2 rounded font-inter font-medium text-base tracking-[-0.32px] ${
                  pathname === '/' ? 'bg-[#1f1f1f] text-white' : 'text-[#656565] hover:text-white'
                }`}
              >
                Image
              </Link>
              <Link
                href="/video"
                className={`px-3 py-2 rounded font-inter font-medium text-base tracking-[-0.32px] ${
                  pathname === '/video' ? 'bg-[#1f1f1f] text-white' : 'text-[#656565] hover:text-white'
                }`}
              >
                Video
              </Link>
              <Link
                href="/analyze"
                className={`px-3 py-2 rounded font-inter font-medium text-base tracking-[-0.32px] ${
                  pathname === '/analyze' ? 'bg-[#1f1f1f] text-white' : 'text-[#656565] hover:text-white'
                }`}
              >
                Analyze
              </Link>
            </nav>
          </div>

          {/* Right side - Status, Галерея (desktop), Avatar */}
          <div className="flex items-center gap-2 lg:gap-6">
            <div className="flex items-center gap-2 lg:gap-1 relative">
              {/* Network status indicator */}
              {(isOffline || networkError) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                  <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="hidden sm:inline font-inter text-xs text-yellow-500">
                    {isOffline ? 'Офлайн' : 'Проблемы с сетью'}
                  </span>
                </div>
              )}
              
              {/* Generation status indicator - clickable */}
              {unviewedCount > 0 && (
                <button
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className="border border-[#303030] rounded-full h-8 px-2.5 pr-3 flex items-center gap-2 hover:bg-[#1f1f1f] transition-colors"
                >
                  {hasActiveGenerations && (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  )}
                  <span className="font-inter font-medium text-base text-white tracking-[-0.32px]">
                    {unviewedCount}
                  </span>
                </button>
              )}

              {/* Галерея link - Desktop Only */}
              <Link
                href="/history"
                className="hidden lg:block px-3 py-2 rounded font-inter font-medium text-base text-white tracking-[-0.32px]"
              >
                Галерея
              </Link>

              {/* User menu */}
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
