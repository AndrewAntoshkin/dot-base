'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { useGenerations } from '@/contexts/generations-context';

interface ToastItem {
  id: string;
  modelName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  retryCount?: number;
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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const swipeOffsetRef = useRef<number>(0);
  const SWIPE_THRESHOLD = 100; // Minimum swipe distance to dismiss

  // Calculate position based on hover state and swipe
  const getTransform = () => {
    const baseTransform = isHovered
      ? `translateY(${index * 64}px)` // Expanded
      : (() => {
          const stackOffset = Math.min(index * 8, 24);
          const scale = 1 - Math.min(index * 0.02, 0.06);
          return `translateY(${stackOffset}px) scale(${scale})`;
        })();
    
    // Add swipe offset (only horizontal)
    if (swipeOffset !== 0) {
      return `${baseTransform} translateX(${swipeOffset}px)`;
    }
    return baseTransform;
  };

  const getZIndex = () => {
    return 100 - index; // First item on top
  };

  const getOpacity = () => {
    if (isHovered) return 1;
    // Fade out items further back in stack
    const baseOpacity = Math.max(1 - index * 0.15, 0.6);
    // Fade out during swipe
    if (swipeOffset !== 0) {
      return baseOpacity * (1 - Math.abs(swipeOffset) / 300);
    }
    return baseOpacity;
  };

  // Touch/Mouse handlers for swipe
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
  };

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    currentXRef.current = clientX;
    const deltaX = currentXRef.current - startXRef.current;
    // Only allow swiping left (negative deltaX)
    if (deltaX < 0) {
      const newOffset = Math.max(deltaX, -300); // Max swipe distance
      swipeOffsetRef.current = newOffset;
      setSwipeOffset(newOffset);
    }
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If swiped enough, dismiss
    const currentOffset = swipeOffsetRef.current;
    if (Math.abs(currentOffset) >= SWIPE_THRESHOLD) {
      onDismiss(toast.id);
    } else {
      // Snap back
      swipeOffsetRef.current = 0;
      setSwipeOffset(0);
    }
    
    startXRef.current = 0;
    currentXRef.current = 0;
  }, [isDragging, toast.id, onDismiss]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while swiping
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events (for desktop drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Global mouse move/up listeners for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleEnd();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  const getStatusText = () => {
    switch (toast.status) {
      case 'pending':
      case 'processing':
        if (toast.retryCount && toast.retryCount > 0) {
          return `Попытка ${toast.retryCount}/3...`;
        }
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
      className="absolute top-0 right-0 w-[300px] bg-[#1a1a1a] rounded-xl p-3 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-all duration-300 ease-out cursor-pointer relative group"
      style={{
        transform: getTransform(),
        zIndex: getZIndex(),
        opacity: getOpacity(),
        touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal swipe
      }}
      onClick={() => {
        if (!isDragging && swipeOffset === 0) {
          onNavigate(toast.id);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Close button - visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full hover:bg-[#2a2a2a] z-10"
        aria-label="Close"
      >
        <X className="w-4 h-4 text-[#bbbbbb] hover:text-white" />
      </button>

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
          if (!isDragging && swipeOffset === 0) {
            onNavigate(toast.id);
          }
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
const STORAGE_KEY_SHOWN_TOASTS = 'generation-toasts-shown';
const STORAGE_KEY_SESSION_START = 'generation-toasts-session-start';

/**
 * Get shown toast IDs from sessionStorage
 */
function getShownToastIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_SHOWN_TOASTS);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save shown toast IDs to sessionStorage
 */
function saveShownToastIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY_SHOWN_TOASTS, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get session start time (when page was loaded)
 */
function getSessionStartTime(): number {
  if (typeof window === 'undefined') return Date.now();
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_SESSION_START);
    if (stored) {
      return parseInt(stored, 10);
    }
    // First load - save current time
    const now = Date.now();
    sessionStorage.setItem(STORAGE_KEY_SESSION_START, now.toString());
    return now;
  } catch {
    return Date.now();
  }
}

export function GenerationToastContainer() {
  const router = useRouter();
  const { unviewedGenerations, markAsViewed } = useGenerations();
  const [isHovered, setIsHovered] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getShownToastIds());
  const [toastTimers] = useState<Map<string, number>>(() => new Map());
  const sessionStartTimeRef = useRef<number>(getSessionStartTime());
  const previousGenerationsRef = useRef<Set<string>>(new Set());

  // Initialize session start time on mount
  useEffect(() => {
    sessionStartTimeRef.current = getSessionStartTime();
  }, []);

  // Track which generations were already present when page loaded
  useEffect(() => {
    if (unviewedGenerations.length > 0 && previousGenerationsRef.current.size === 0) {
      // First load - mark all existing generations as "already shown" (don't show toasts for them)
      const existingIds = new Set(unviewedGenerations.map(g => g.id));
      previousGenerationsRef.current = existingIds;
      // Mark them as dismissed so they don't show as toasts
      setDismissedIds(prev => {
        const next = new Set(prev);
        existingIds.forEach(id => next.add(id));
        saveShownToastIds(next);
        return next;
      });
    }
  }, [unviewedGenerations]);

  // Filter toasts to show:
  // 1. Only completed/failed/cancelled (not pending/processing)
  // 2. Not dismissed
  // 3. Only NEW generations that completed AFTER page load (not old unviewed ones)
  const toasts: ToastItem[] = unviewedGenerations
    .filter(g => !dismissedIds.has(g.id))
    .filter(g => g.status === 'completed' || g.status === 'failed' || g.status === 'cancelled')
    .filter(g => {
      // Only show toasts for generations that completed AFTER session started
      // OR that weren't present when page first loaded
      const createdAt = new Date(g.created_at).getTime();
      const wasPresentOnLoad = previousGenerationsRef.current.has(g.id);
      return !wasPresentOnLoad && createdAt >= sessionStartTimeRef.current - 5000; // 5 second buffer
    })
    .slice(0, 5) // Max 5 toasts
    .map(g => ({
      id: g.id,
      modelName: g.model_name,
      status: g.status,
      createdAt: g.created_at,
      retryCount: g.settings?.auto_retry_count || 0,
    }));

  // Initialize timers for new toasts
  useEffect(() => {
    const now = Date.now();
    toasts.forEach(toast => {
      if (!toastTimers.has(toast.id)) {
        toastTimers.set(toast.id, now);
      }
    });
  }, [toasts, toastTimers]);

  // Auto-dismiss toasts after timeout (only when not hovered)
  useEffect(() => {
    if (isHovered) return; // Don't dismiss while hovering
    if (toasts.length === 0) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const toastsToDismiss: string[] = [];
      
      toasts.forEach(toast => {
        const startTime = toastTimers.get(toast.id);
        if (startTime && now - startTime >= AUTO_DISMISS_TIMEOUT) {
          toastsToDismiss.push(toast.id);
        }
      });
      
      if (toastsToDismiss.length > 0) {
        setDismissedIds(prev => {
          const next = new Set(prev);
          toastsToDismiss.forEach(id => next.add(id));
          return next;
        });
        toastsToDismiss.forEach(id => toastTimers.delete(id));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isHovered, toasts, toastTimers]);

  // Reset timers when hover ends (give user another 3 seconds)
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Reset all timers to give another 3 seconds after hover ends
    const now = Date.now();
    toasts.forEach(toast => {
      toastTimers.set(toast.id, now);
    });
  }, [toasts, toastTimers]);

  const handleNavigate = useCallback((id: string) => {
    markAsViewed(id);
    setDismissedIds(prev => {
      const next = new Set(prev).add(id);
      saveShownToastIds(next);
      return next;
    });
    router.push(`/result/${id}`);
  }, [markAsViewed, router]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev).add(id);
      saveShownToastIds(next);
      return next;
    });
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

