'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface Generation {
  id: string;
  model_name: string;
  action: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  viewed: boolean;
}

interface GenerationsContextType {
  generations: Generation[];
  unviewedCount: number;
  unviewedGenerations: Generation[];
  hasActiveGenerations: boolean;
  addGeneration: (generation: Generation) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
  markAsViewed: (id: string) => Promise<void>;
  refreshGenerations: () => Promise<void>;
}

const GenerationsContext = createContext<GenerationsContextType | undefined>(undefined);

// Smart polling intervals
const POLLING_INTERVAL_ACTIVE = 5000; // 5 сек когда есть активные генерации (desktop)
const POLLING_INTERVAL_IDLE = 30000;  // 30 сек когда всё готово (desktop)
const POLLING_INTERVAL_BACKGROUND = 60000; // 60 сек когда вкладка не активна
const POLLING_INTERVAL_MOBILE = 60000; // 60 сек на мобилке - экономим батарею

// Определение мобильного устройства
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const refreshGenerations = useCallback(async () => {
    // Throttle: не чаще чем раз в 2 секунды
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;

    try {
      // Грузим только последние 20 для скорости
      const response = await fetch('/api/generations/list?limit=20', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  }, []);

  const addGeneration = useCallback((generation: Generation) => {
    setGenerations((prev) => [generation, ...prev.slice(0, 19)]); // Держим макс 20
  }, []);

  const updateGeneration = useCallback((id: string, updates: Partial<Generation>) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const markAsViewed = useCallback(async (id: string) => {
    // Optimistic update
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, viewed: true } : g))
    );

    try {
      await fetch(`/api/generations/${id}/view`, { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }, []);

  // Вычисляем derived state
  const unviewedGenerations = generations.filter((g) => !g.viewed);
  const unviewedCount = unviewedGenerations.length;
  const hasActiveGenerations = unviewedGenerations.some(
    (g) => g.status === 'pending' || g.status === 'processing'
  );

  // Smart polling: адаптивный интервал
  useEffect(() => {
    // Initial fetch
    refreshGenerations();

    const setupPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      let interval: number;
      const isMobile = isMobileDevice();
      
      if (!isPageVisible) {
        interval = POLLING_INTERVAL_BACKGROUND;
      } else if (isMobile) {
        // На мобилке всегда редкий polling для экономии батареи
        interval = hasActiveGenerations ? 15000 : POLLING_INTERVAL_MOBILE; // 15 сек если активно, иначе 60
      } else if (hasActiveGenerations) {
        interval = POLLING_INTERVAL_ACTIVE;
      } else {
        interval = POLLING_INTERVAL_IDLE;
      }

      pollingIntervalRef.current = setInterval(refreshGenerations, interval);
    };

    setupPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPageVisible, hasActiveGenerations, refreshGenerations]);

  return (
    <GenerationsContext.Provider
      value={{
        generations,
        unviewedCount,
        unviewedGenerations,
        hasActiveGenerations,
        addGeneration,
        updateGeneration,
        markAsViewed,
        refreshGenerations,
      }}
    >
      {children}
    </GenerationsContext.Provider>
  );
}

export function useGenerations() {
  const context = useContext(GenerationsContext);
  if (!context) {
    throw new Error('useGenerations must be used within GenerationsProvider');
  }
  return context;
}

