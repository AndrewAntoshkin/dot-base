'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  type Announcement,
  getActiveAnnouncement,
  getDismissedAnnouncementIds,
  dismissAnnouncement,
} from '@/lib/announcements-config';

export function AnnouncementBanner() {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Получаем закрытые анонсы и находим активный
    const dismissedIds = getDismissedAnnouncementIds();
    const active = getActiveAnnouncement(dismissedIds);
    
    if (active) {
      setAnnouncement(active);
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    if (!announcement) return;
    
    // Анимация закрытия
    setIsVisible(false);
    
    // Сохраняем в localStorage после анимации
    setTimeout(() => {
      dismissAnnouncement(announcement.id);
      setAnnouncement(null);
    }, 200);
  };

  const handleActionClick = () => {
    if (!announcement) return;
    router.push(announcement.actionUrl);
  };

  // Если нет анонса - не рендерим ничего
  if (!announcement) return null;

  return (
    <div
      className={`w-full bg-[#FCED44] transition-all duration-200 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="relative flex items-center justify-center gap-6 px-4 lg:px-20 py-1.5">
        {/* Основной текст */}
        <span className="font-inter text-xs font-normal text-[#050505]">
          {announcement.text}
        </span>

        {/* Кнопка действия */}
        <button
          onClick={handleActionClick}
          className="font-inter text-xs font-semibold text-[#050505] hover:underline transition-all"
        >
          {announcement.actionLabel}
        </button>

        {/* Кнопка закрытия */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 lg:right-20 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4 text-[#050505]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}


