'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GenerationsQueue } from './generations-queue';
import { useGenerations } from '@/contexts/generations-context';

export function Header() {
  const pathname = usePathname();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const { unviewedCount, hasActiveGenerations } = useGenerations();
  
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

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
            </div>

            {/* Generations Queue Dropdown */}
            <GenerationsQueue isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  );
}

