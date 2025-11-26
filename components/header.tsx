'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { GenerationsQueue } from './generations-queue';
import { useGenerations } from '@/contexts/generations-context';
import { createBrowserClient } from '@supabase/ssr';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations } = useGenerations();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
    };
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };
  
  return (
    <header className="sticky top-0 z-50 bg-[#101010]">
      <div className="px-20 py-3 flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/LogoBase.svg" 
              alt="BASE" 
              width={65} 
              height={18}
              priority
              className="h-[18px] w-auto"
            />
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-start gap-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded font-inter font-medium text-base text-white tracking-[-0.32px] ${
                pathname === '/' ? 'bg-[#1f1f1f]' : ''
              }`}
            >
              Image
            </Link>
            <span
              className="px-3 py-2 rounded font-inter font-medium text-base text-[#656565] tracking-[-0.32px] cursor-not-allowed"
              title="Coming soon"
            >
              Video
            </span>
            <span
              className="px-3 py-2 rounded font-inter font-medium text-base text-[#656565] tracking-[-0.32px] cursor-not-allowed"
              title="Coming soon"
            >
              Text
            </span>
          </nav>
        </div>

        {/* Right side - Галерея, Status, Avatar */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 relative">
            {/* Generation status indicator - clickable */}
            {unviewedCount > 0 && (
              <button
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className="border border-[#666666] rounded-full h-8 px-2.5 pr-3 flex items-center gap-2 hover:bg-[#1f1f1f] transition-colors"
              >
                {hasActiveGenerations && (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                )}
                <span className="font-inter font-medium text-base text-white tracking-[-0.32px]">
                  {unviewedCount}
                </span>
              </button>
            )}

            {/* Галерея link */}
            <Link
              href="/history"
              className="px-3 py-2 rounded font-inter font-medium text-base text-white tracking-[-0.32px]"
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
  );
}

