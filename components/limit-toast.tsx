'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useGenerations } from '@/contexts/generations-context';

type ToastType = 'limit' | 'ready';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface LimitToastContextType {
  showLimitToast: (message?: string) => void;
  showReadyToast: () => void;
  dismissToast: (id: string) => void;
}

const LimitToastContext = createContext<LimitToastContextType | undefined>(undefined);

export function useLimitToast() {
  const context = useContext(LimitToastContext);
  if (!context) {
    throw new Error('useLimitToast must be used within a LimitToastProvider');
  }
  return context;
}

const AUTO_DISMISS_LIMIT = 5000;
const AUTO_DISMISS_READY = 3000;

export function LimitToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { generations } = useGenerations();
  const [previousActiveCount, setPreviousActiveCount] = useState<number | null>(null);
  const [wasAtLimit, setWasAtLimit] = useState(false);
  
  // Calculate active generations count
  const activeCount = generations.filter(
    g => g.status === 'pending' || g.status === 'processing'
  ).length;
  
  // Track when we go from limit (5) to below limit
  useEffect(() => {
    if (previousActiveCount === null) {
      setPreviousActiveCount(activeCount);
      return;
    }
    
    // If we were at limit (5) and now we're below
    if (wasAtLimit && activeCount < 5) {
      setWasAtLimit(false);
      showReadyToast();
    }
    
    setPreviousActiveCount(activeCount);
  }, [activeCount, previousActiveCount, wasAtLimit]);
  
  const showLimitToast = useCallback((message?: string) => {
    const id = `limit-${Date.now()}`;
    const defaultMessage = 'Достигнут лимит (5 генераций). Дождитесь завершения текущих генераций.';
    
    setToasts(prev => {
      // Don't show duplicate limit toasts
      if (prev.some(t => t.type === 'limit')) return prev;
      return [...prev, { id, type: 'limit', message: message || defaultMessage }];
    });
    
    setWasAtLimit(true);
    
    // Auto dismiss
    setTimeout(() => {
      dismissToast(id);
    }, AUTO_DISMISS_LIMIT);
  }, []);
  
  const showReadyToast = useCallback(() => {
    const id = `ready-${Date.now()}`;
    
    setToasts(prev => {
      // Don't show if already showing
      if (prev.some(t => t.type === 'ready')) return prev;
      return [...prev, { id, type: 'ready', message: 'Можно продолжать генерацию!' }];
    });
    
    // Auto dismiss
    setTimeout(() => {
      dismissToast(id);
    }, AUTO_DISMISS_READY);
  }, []);
  
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <LimitToastContext.Provider value={{ showLimitToast, showReadyToast, dismissToast }}>
      {children}
      
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-xl ${
                toast.type === 'limit' 
                  ? 'bg-[#1a1010]/95 border border-red-500/40' 
                  : 'bg-[#101a10]/95 border border-green-500/40'
              }`}
              style={{ 
                boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.8)',
                minWidth: '280px',
                maxWidth: '400px',
              }}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === 'limit' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                {toast.type === 'limit' ? (
                  <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </div>
              
              {/* Message */}
              <p className={`font-inter text-sm flex-1 ${
                toast.type === 'limit' ? 'text-red-200' : 'text-green-200'
              }`}>
                {toast.message}
              </p>
              
              {/* Close button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          ))}
        </div>
      )}
    </LimitToastContext.Provider>
  );
}

