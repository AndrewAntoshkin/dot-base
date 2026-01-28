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
  date: string;
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
    
    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      const dateKey = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    return Object.entries(groups).map(([date, notifications]) => ({
      date,
      notifications,
    }));
  };

  const groupedNotifications = groupNotifications(notifications);

  // Format time
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
      <div 
        className="fixed top-4 right-4 bottom-4 w-[420px] bg-[#1A1A1A] rounded-[20px] z-50 flex flex-col overflow-hidden"
        style={{ boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.8)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <span className="text-xs font-semibold text-white uppercase tracking-wide">
              уведомления
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-[#333] hover:bg-[#252525] transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <div className="py-8 text-center text-[#959595] text-sm">
              Загрузка...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-[#959595] text-sm">
              Нет уведомлений
            </div>
          ) : (
            <div className="space-y-4">
              {groupedNotifications.map((group) => (
                <div key={group.date} className="space-y-3">
                  {/* Date Label */}
                  <div className="text-sm font-medium text-[#959595] uppercase">
                    {group.date}
                  </div>

                  {/* Notifications - gap 20px between items */}
                  <div className="flex flex-col gap-5">
                    {group.notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => onNotificationClick(notification)}
                        className="w-full flex items-start gap-3 text-left"
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          {notification.type === 'support_reply' ? (
                            <SupportIcon className="w-5 h-5 text-white" />
                          ) : (
                            <Megaphone className="w-5 h-5 text-white" />
                          )}
                        </div>

                        {/* Content - gap 4px between title and subtitle */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className={`text-sm font-medium leading-[1.29] ${notification.is_read ? 'text-[#717171]' : 'text-white'}`}>
                            {notification.type === 'support_reply' ? 'Поддержка' : notification.title}
                          </span>
                          <p className="text-xs leading-[1.5] text-[#959595] line-clamp-2">
                            {notification.type === 'support_reply' 
                              ? 'Ответ на запрос' 
                              : notification.message || notification.title}
                          </p>
                        </div>

                        {/* Date & indicator - gap 8px */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-[#717171]">
                            {formatDate(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FA5252]" />
                          )}
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
