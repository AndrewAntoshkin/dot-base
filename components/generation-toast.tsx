'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useGenerations } from '@/contexts/generations-context';

interface ToastItem {
  id: string;
  modelName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

// Custom loading spinner matching Figma design
const LoadingSpinner = () => (
  <svg 
    className="animate-spin" 
    width="16" 
    height="16" 
    viewBox="0 0 16 16" 
    fill="none"
  >
    <path 
      d="M8 1.5V4M8 12v2.5M3.05 3.05L4.88 4.88M11.12 11.12l1.83 1.83M1.5 8H4M12 8h2.5M3.05 12.95l1.83-1.83M11.12 4.88l1.83-1.83" 
      stroke="white" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Success icon (green checkmark)
const SuccessIcon = () => (
  <CheckCircle className="w-4 h-4 text-[#88fa7c]" />
);

// Error icon (red X)
const ErrorIcon = () => (
  <XCircle className="w-4 h-4 text-[#f55d5d]" />
);

interface GenerationToastProps {
  toast: ToastItem;
  index: number;
  totalCount: number;
  isHovered: boolean;
  onNavigate: (id: string) => void;
  onDismiss: (id: string) => void;
}

function GenerationToast({ 
  toast, 
  index, 
  totalCount, 
  isHovered, 
  onNavigate,
  onDismiss 
}: GenerationToastProps) {
  // Calculate position based on hover state
  const getTransform = () => {
    if (isHovered) {
      // Expanded: each toast moves down by its full height + gap
      return `translateY(${index * 64}px)`;
    }
    // Stacked: slight offset for visual depth
    const stackOffset = Math.min(index * 8, 24); // Max 24px offset
    const scale = 1 - Math.min(index * 0.02, 0.06); // Slight scale down
    return `translateY(${stackOffset}px) scale(${scale})`;
  };

  const getZIndex = () => {
    return 100 - index; // First item on top
  };

  const getOpacity = () => {
    if (isHovered) return 1;
    // Fade out items further back in stack
    return Math.max(1 - index * 0.15, 0.6);
  };

  const getStatusText = () => {
    switch (toast.status) {
      case 'pending':
      case 'processing':
        return 'В обработке';
      case 'completed':
        return 'Готово';
      case 'failed':
        return 'Ошибка';
      case 'cancelled':
        return 'Отменено';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (toast.status) {
      case 'pending':
      case 'processing':
        return <LoadingSpinner />;
      case 'completed':
        return <SuccessIcon />;
      case 'failed':
      case 'cancelled':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  return (
    <div
      className="absolute top-0 right-0 w-[300px] bg-[#1a1a1a] rounded-xl p-3 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-all duration-300 ease-out cursor-pointer"
      style={{
        transform: getTransform(),
        zIndex: getZIndex(),
        opacity: getOpacity(),
      }}
      onClick={() => onNavigate(toast.id)}
    >
      {/* Status Icon */}
      <div className="shrink-0">
        {getStatusIcon()}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-white text-sm font-normal truncate">
          {toast.modelName}
        </p>
        <p className="text-[#656565] text-xs font-normal">
          {getStatusText()}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(toast.id);
        }}
        className="shrink-0 h-8 px-2 bg-[#212121] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
      >
        <span className="text-[#bbbbbb] text-xs font-medium">
          Перейти
        </span>
      </button>
    </div>
  );
}

// Auto-dismiss timeout in ms
const AUTO_DISMISS_TIMEOUT = 3000;

export function GenerationToastContainer() {
  const router = useRouter();
  const { unviewedGenerations, markAsViewed } = useGenerations();
  const [isHovered, setIsHovered] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [toastTimers, setToastTimers] = useState<Map<string, number>>(new Map());

  // Filter toasts to show (not dismissed)
  const toasts: ToastItem[] = unviewedGenerations
    .filter(g => !dismissedIds.has(g.id))
    .slice(0, 5) // Max 5 toasts
    .map(g => ({
      id: g.id,
      modelName: g.model_name,
      status: g.status,
      createdAt: g.created_at,
    }));

  // Initialize timers for new toasts
  useEffect(() => {
    const now = Date.now();
    toasts.forEach(toast => {
      if (!toastTimers.has(toast.id)) {
        setToastTimers(prev => {
          const next = new Map(prev);
          next.set(toast.id, now);
          return next;
        });
      }
    });
  }, [toasts, toastTimers]);

  // Auto-dismiss toasts after timeout (only when not hovered)
  useEffect(() => {
    if (isHovered) return; // Don't dismiss while hovering
    
    const interval = setInterval(() => {
      const now = Date.now();
      const toastsToDismiss: string[] = [];
      
      toastTimers.forEach((startTime, id) => {
        if (now - startTime >= AUTO_DISMISS_TIMEOUT) {
          toastsToDismiss.push(id);
        }
      });
      
      if (toastsToDismiss.length > 0) {
        setDismissedIds(prev => {
          const next = new Set(prev);
          toastsToDismiss.forEach(id => next.add(id));
          return next;
        });
        setToastTimers(prev => {
          const next = new Map(prev);
          toastsToDismiss.forEach(id => next.delete(id));
          return next;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isHovered, toastTimers]);

  // Reset timers when hover ends (give user another 5 seconds)
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Reset all timers to give another 5 seconds after hover ends
    const now = Date.now();
    setToastTimers(prev => {
      const next = new Map();
      toasts.forEach(toast => {
        next.set(toast.id, now);
      });
      return next;
    });
  }, [toasts]);

  const handleNavigate = useCallback((id: string) => {
    markAsViewed(id);
    setDismissedIds(prev => new Set(prev).add(id));
    router.push(`/result/${id}`);
  }, [markAsViewed, router]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  }, []);

  // Don't render if no toasts
  if (toasts.length === 0) return null;

  // Calculate container height based on hover state
  const containerHeight = isHovered 
    ? toasts.length * 64 // 56px toast + 8px gap
    : 56 + Math.min((toasts.length - 1) * 8, 24); // Base + stack offset

  return (
    <div 
      className="fixed top-[62px] right-4 z-50"
      style={{ height: containerHeight }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {toasts.map((toast, index) => (
        <GenerationToast
          key={toast.id}
          toast={toast}
          index={index}
          totalCount={toasts.length}
          isHovered={isHovered}
          onNavigate={handleNavigate}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}

