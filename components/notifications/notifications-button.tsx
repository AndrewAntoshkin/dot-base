'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Megaphone } from 'lucide-react';
import { NotificationsSidebar } from './notifications-sidebar';
import { NotificationMessageModal } from './notification-message-modal';
import { createClient } from '@/lib/supabase/client';

// Bell icon
function BellIcon({ className }: { className?: string }) {
  return <Bell className={className} />;
}

// Announcement/megaphone icon
function AnnouncementIcon({ className }: { className?: string }) {
  return <Megaphone className={className} />;
}

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

export interface Notification {
  id: string;
  type: 'support_reply' | 'update' | 'announcement';
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface NotificationsButtonProps {
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function NotificationsButton({ className, onOpenChange }: NotificationsButtonProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=5');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch, realtime subscription, and fallback polling
  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to new notifications via Supabase Realtime
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // Get current user and subscribe to their notifications
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Add new notification to the top of the list
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev].slice(0, 5));
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe((status) => {
          console.log('[Notifications] Realtime subscription status:', status);
        });
    });
    
    // Fallback polling every 30 seconds (in case realtime doesn't work)
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(pollInterval);
    };
  }, [fetchNotifications]);

  // Notify parent about popover/sidebar state changes (to hide tooltip)
  useEffect(() => {
    onOpenChange?.(isPopoverOpen || isSidebarOpen);
  }, [isPopoverOpen, isSidebarOpen, onOpenChange]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPopoverOpen]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.type === 'update' && notification.link) {
      // Open changelog
      window.open(notification.link, '_blank');
    } else if (notification.type === 'support_reply') {
      // Open message modal
      setSelectedNotification(notification);
    } else if (notification.link) {
      window.open(notification.link, '_blank');
    }
    
    setIsPopoverOpen(false);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsPopoverOpen(!isPopoverOpen);
          if (!isPopoverOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 rounded-xl border border-[#333] hover:bg-[#1a1a1a] transition-colors ${className}`}
        aria-label="Уведомления"
      >
        <BellIcon className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-medium text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-[360px] bg-[#1a1a1a] rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.8)] overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-xs font-semibold text-white uppercase tracking-wide">
              Уведомления
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#666] hover:text-white transition-colors"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="px-5 pb-4 space-y-1">
            {isLoading ? (
              <div className="py-8 text-center text-[#666] text-sm">
                Загрузка...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-[#666] text-sm">
                Нет уведомлений
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#252525] transition-colors text-left"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.type === 'support_reply' ? (
                      <SupportIcon className="w-5 h-5 text-white" />
                    ) : (
                      <AnnouncementIcon className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium truncate ${notification.is_read ? 'text-[#888]' : 'text-white'}`}>
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
                    <p className={`text-sm truncate ${notification.is_read ? 'text-[#555]' : 'text-[#888]'}`}>
                      {notification.type === 'support_reply' 
                        ? 'Ответ на запрос' 
                        : notification.message || notification.title}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* View All Button */}
          {notifications.length > 0 && (
            <div className="px-5 pb-4">
              <button
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsSidebarOpen(true);
                }}
                className="w-full py-2 bg-[#252525] rounded-lg text-sm text-white hover:bg-[#303030] transition-colors"
              >
                Смотреть все
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sidebar */}
      <NotificationsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNotificationClick={(notification) => {
          handleNotificationClick(notification);
          if (notification.type === 'support_reply') {
            setIsSidebarOpen(false);
          }
        }}
      />

      {/* Message Modal */}
      <NotificationMessageModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </>
  );
}
