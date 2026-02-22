'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Check, ChevronDown, Search, Trash2 } from 'lucide-react';
import { AssistantPanel } from './assistant-panel';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { AnnouncementBanner } from './announcement-banner';
import { useRouter } from 'next/navigation';
import { NotificationsButton } from './notifications';

// ─── Mobile nav items (sidebar handles desktop nav) ─────────────────
const NAV_ITEMS = [
  { href: '/', label: 'Image' },
  { href: '/video', label: 'Video' },
  { href: '/keyframes', label: 'Keyframes' },
  { href: '/brainstorm', label: 'Brainstorm' },
  { href: '/flow', label: 'Flow' },
  { href: '/lora', label: 'LoRA' },
];

// ─── Workspace chip selector icon ───────────────────────────────────
function ChevronSelectorVertical({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3 7.5L6 10.5L9 7.5M3 4.5L6 1.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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

  const currentMode =
    pathname === '/video'
      ? 'video'
      : pathname === '/keyframes'
        ? 'keyframes'
        : pathname === '/brainstorm'
          ? 'brainstorm'
          : pathname === '/flow'
            ? 'flow'
            : pathname === '/lora'
              ? 'lora'
              : 'image';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#101010]">
        {/* Announcement Banner */}
        <AnnouncementBanner />

        <div className="px-4 lg:px-6 py-3 flex items-center gap-6">
          {/* ── Left: Mobile hamburger + Logo (mobile) + Workspace chips (desktop) ── */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger - Mobile Only */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-6 h-6 flex flex-col justify-center items-center gap-[5px] flex-shrink-0"
              aria-label="Open menu"
            >
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
              <div className="w-[18px] h-[2px] bg-[#d9d9d9]" />
            </button>

            {/* Logo - Mobile Only */}
            <Link href="/welcome" className="lg:hidden flex items-center flex-shrink-0">
              <Image
                src="/baseCRLogo.svg"
                alt="BASE"
                width={65}
                height={18}
                priority
                className="h-[18px] w-auto"
              />
            </Link>

            {/* Workspace switcher — Desktop Only */}
            {workspaces.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 min-w-0 relative">
                <button
                  onClick={() =>
                    setIsWorkspaceSwitcherOpen(
                      isWorkspaceSwitcherOpen ? null : 'open'
                    )
                  }
                  className="flex items-center gap-2 h-9 px-3 py-2 rounded-xl border border-[#303030] transition-colors hover:border-[#505050]"
                >
                  <span className="font-inter font-medium text-xs tracking-[-0.01em] text-white truncate max-w-[160px]">
                    {workspaces.find((w) => w.id === selectedWorkspaceId)?.name || 'Пространство'}
                  </span>
                  <span className="flex items-center p-0.5 bg-[#232323] rounded">
                    <ChevronSelectorVertical className="text-[#A2A2A2]" />
                  </span>
                </button>

                {/* Dropdown */}
                {isWorkspaceSwitcherOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsWorkspaceSwitcherOpen(null)}
                    />
                    <div
                      className="absolute left-0 top-full mt-2 min-w-[200px] p-2 bg-[#1A1A1A] rounded-xl z-20"
                      style={{ boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.8)' }}
                    >
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            setSelectedWorkspaceId(ws.id);
                            setIsWorkspaceSwitcherOpen(null);
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between rounded-lg transition-colors ${
                            selectedWorkspaceId === ws.id
                              ? 'bg-[#2c2c2c] text-white'
                              : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                          }`}
                        >
                          <span className="font-inter font-normal text-sm truncate">
                            {ws.name}
                          </span>
                          {selectedWorkspaceId === ws.id && (
                            <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Assistant, Notifications, Avatar ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Assistant button — Desktop */}
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center transition-colors bg-[#EFD564] hover:bg-[#EFD564]/90"
              aria-label="Ассистент"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.99214 0.0227393C7.98537 0.0398037 7.97329 0.119653 7.96517 0.200453C7.93082 0.543024 7.80755 1.44746 7.70774 2.09106C7.31129 4.64427 6.72088 5.88994 5.54637 6.65111C5.49657 6.68337 5.45144 6.70984 5.44594 6.70984C5.44045 6.70984 5.41551 6.72448 5.39042 6.74241C5.3418 6.77711 5.05218 6.92663 4.92368 6.98341C4.33564 7.24318 3.58408 7.44918 2.52629 7.64071C2.42228 7.65951 2.28313 7.68339 2.21697 7.69377C2.15082 7.70415 2.05415 7.71972 2.00212 7.72834C1.9501 7.73697 1.84578 7.75259 1.77011 7.76311C1.69445 7.77363 1.59006 7.78923 1.53809 7.79784C1.48613 7.80646 1.23479 7.84096 0.979612 7.87482C0.724437 7.90868 0.463777 7.94391 0.400565 7.95323C0.337352 7.96255 0.252161 7.97094 0.211494 7.97165C0.170827 7.97235 0.106572 7.98278 0.0686926 7.99479L0 8.01668L0.0602082 8.02717C0.0932149 8.03294 0.197565 8.04641 0.292217 8.05728C0.547918 8.08652 1.09209 8.15734 1.29746 8.18813C1.50157 8.21871 1.6447 8.23897 1.77011 8.25508C1.81745 8.26122 1.89094 8.27277 1.93337 8.28088C1.97579 8.28899 2.07261 8.30496 2.14822 8.31617C2.32359 8.34227 2.92909 8.4486 3.04188 8.47298C3.08922 8.48316 3.15882 8.49839 3.19662 8.50659C3.78138 8.63438 4.46942 8.838 4.79477 8.97981C4.86261 9.00926 4.99667 9.06969 5.10617 9.12006C5.2395 9.18137 5.47237 9.3199 5.66778 9.45397C6.66224 10.1364 7.22068 11.2561 7.59496 13.318C7.62731 13.4963 7.66605 13.7199 7.68107 13.8149C7.69609 13.9099 7.71563 14.0303 7.72441 14.0825C7.73319 14.1347 7.74902 14.2396 7.75953 14.3156C7.77004 14.3916 7.78598 14.5004 7.79489 14.5573C7.80379 14.6143 7.82695 14.7853 7.84642 14.9372C7.86589 15.0891 7.89698 15.3339 7.91582 15.4811C7.93466 15.6283 7.95585 15.8009 7.96314 15.8648C7.97583 15.9781 7.98942 16.0154 8.01034 15.9944C8.01599 15.9887 8.02713 15.9078 8.03488 15.8146C8.09004 15.1574 8.36585 13.3599 8.49797 12.7962C8.72003 11.8496 8.84858 11.4515 9.1021 10.9257C9.30798 10.4985 9.53622 10.1709 9.8377 9.86938C10.4413 9.26588 11.1992 8.89596 12.4683 8.58528C12.8306 8.49656 13.399 8.38576 13.8432 8.31732C13.9141 8.30641 14.0146 8.29007 14.0666 8.28108C14.1186 8.27208 14.2501 8.25218 14.3588 8.23699C14.4675 8.22181 14.6067 8.20178 14.6681 8.19273C14.8762 8.16183 15.5349 8.07663 15.725 8.05594C15.829 8.04456 15.9334 8.02966 15.957 8.02267L16 8.01002L15.9089 7.99008C15.8588 7.97917 15.7899 7.97029 15.7557 7.97029C15.7215 7.97029 15.6464 7.96311 15.5889 7.95423C15.5315 7.94536 15.4187 7.9298 15.3383 7.91974C14.4882 7.81218 13.4921 7.65559 12.9495 7.54407C12.8314 7.51976 12.7154 7.49599 12.6917 7.49116C12.6103 7.47465 12.0472 7.33008 12.0043 7.31463C11.9807 7.30608 11.8801 7.2746 11.7809 7.24467C10.8887 6.97592 10.139 6.5302 9.69566 6.00545C9.02908 5.21602 8.64672 4.18403 8.34439 2.35875C8.31527 2.18307 8.28393 1.99661 8.27459 1.94445C8.23337 1.71175 8.07264 0.501699 8.03535 0.143598C8.02034 -0.000831749 8.01126 -0.0261197 7.99214 0.0227393Z"
                  fill="black"
                />
              </svg>
            </button>

            {/* Notifications — Desktop */}
            <div className="relative hidden lg:block">
              <NotificationsButton
                className="w-9 h-9"
                onOpenChange={setIsNotificationsOpen}
              />
            </div>

            {/* User Avatar */}
            <Link
              href="/profile"
              className="flex w-9 h-9 rounded-xl overflow-hidden hover:ring-2 hover:ring-white/20 transition-all flex-shrink-0"
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
          </div>
        </div>
      </header>

      {/* ── Mobile Menu ── */}
      {isMobileMenuOpen && (
        <div
          ref={menuRef}
          className="lg:hidden fixed left-4 top-[68px] z-[60] w-[calc(100%-32px)] max-w-[361px] bg-[#131313] rounded-[20px] p-4 flex flex-col gap-3"
          style={{ boxShadow: '0px 4px 32px 0px rgba(0,0,0,0.9)' }}
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => item.href !== '/lora' || isAdmin).map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                  (item.href === '/' && pathname === '/') ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                    ? 'bg-black'
                    : ''
                }`}
              >
                {item.label.toUpperCase()}
              </Link>
            ))}
          </div>

          <div className="h-px w-full bg-[#606060]" />

          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
              pathname === '/profile' ? 'bg-black' : ''
            }`}
          >
            Профиль
          </Link>
          {isAdmin && (
            <Link
              href="/workspaces"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                pathname.startsWith('/workspaces') ? 'bg-black' : ''
              }`}
            >
              Пространства
            </Link>
          )}
          <Link
            href="/docs"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
              pathname.startsWith('/docs') ? 'bg-black' : ''
            }`}
          >
            Документация
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-4 py-3 rounded-[16px] font-inter font-medium text-[20px] leading-[24px] text-white ${
                pathname.startsWith('/admin') ? 'bg-black' : ''
              }`}
            >
              Dashboard
            </Link>
          )}
        </div>
      )}

      {/* Backdrop */}
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
          currentAction:
            pathname === '/'
              ? 'Создание изображения'
              : pathname === '/video'
                ? 'Создание видео'
                : pathname === '/keyframes'
                  ? 'Keyframes'
                  : pathname === '/brainstorm'
                    ? 'Brainstorm'
                    : pathname === '/lora'
                      ? 'LoRA'
                      : undefined,
        }}
      />
    </>
  );
}
