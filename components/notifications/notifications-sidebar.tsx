'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Megaphone } from 'lucide-react';
import { Notification } from './notifications-button';

// Message question circle icon (for support)
function SupportIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
}

interface GroupedNotifications {
  label: string;
  notifications: Notification[];
}

export function NotificationsSidebar({ isOpen, onClose, onNotificationClick }: NotificationsSidebarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Group notifications by date
  const groupNotifications = (notifications: Notification[]): GroupedNotifications[] => {
    const groups: Record<string, Notification[]> = {};
    const now = new Date();
    
    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      let label: string;
      if (diffDays === 0) {
        label = 'Сегодня';
      } else if (diffDays === 1) {
        label = 'Вчера';
      } else if (diffDays < 7) {
        label = 'На этой неделе';
      } else {
        // Group by month
        label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(notification);
    });

    return Object.entries(groups).map(([label, notifications]) => ({
      label,
      notifications,
    }));
  };

  const groupedNotifications = groupNotifications(notifications);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 w-[420px] h-full bg-[#141414] border-l border-[#2f2f2f] z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f2f]">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-white" />
            <span className="text-sm font-semibold text-white uppercase tracking-wide">
              Уведомления
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#333] hover:bg-[#252525] transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-[#666] text-sm">
              Загрузка...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-[#666] text-sm">
              Нет уведомлений
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {groupedNotifications.map((group) => (
                <div key={group.label}>
                  {/* Date Label */}
                  <div className="text-xs font-medium text-[#666] uppercase tracking-wide mb-3">
                    {group.label}
                  </div>

                  {/* Notifications */}
                  <div className="space-y-1">
                    {group.notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => onNotificationClick(notification)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#1a1a1a] transition-colors text-left"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.type === 'support_reply' ? (
                            <SupportIcon className="w-5 h-5 text-white" />
                          ) : (
                            <Megaphone className="w-5 h-5 text-white" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium ${notification.is_read ? 'text-[#888]' : 'text-white'}`}>
                              {notification.type === 'support_reply' ? 'Поддержка' : notification.title}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-[#666]">
                                {formatDate(notification.created_at)}
                              </span>
                              {!notification.is_read && (
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                              )}
                            </div>
                          </div>
                          <p className={`text-sm line-clamp-2 ${notification.is_read ? 'text-[#555]' : 'text-[#888]'}`}>
                            {notification.type === 'support_reply' 
                              ? 'Ответ на запрос' 
                              : notification.message || notification.title}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
