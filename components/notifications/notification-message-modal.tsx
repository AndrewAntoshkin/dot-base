'use client';

import { X } from 'lucide-react';
import { Notification } from './notifications-button';

// Parse text and convert URLs to clickable links
function parseTextWithLinks(text: string): React.ReactNode[] {
  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
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

interface NotificationMessageModalProps {
  notification: Notification | null;
  onClose: () => void;
}

export function NotificationMessageModal({ notification, onClose }: NotificationMessageModalProps) {
  if (!notification) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-[#101010] rounded-[32px] w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-white/90 transition-colors z-10"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5">
          <SupportIcon className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">
            {notification.type === 'support_reply' ? 'Ответ от поддержки' : notification.title}
          </span>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="bg-transparent border border-[#333] rounded-2xl p-4 max-h-[400px] overflow-y-auto">
            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
              {notification.message ? parseTextWithLinks(notification.message) : ''}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 h-10 border border-[#333] rounded-xl text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
