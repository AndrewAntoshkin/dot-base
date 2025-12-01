'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  getPollingInterval,
  getNetworkQuality,
  isPageVisible,
  NetworkQuality,
} from '@/lib/network-utils';

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
  networkQuality: NetworkQuality;
}

const GenerationsContext = createContext<GenerationsContextType | undefined>(undefined);

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(() => getNetworkQuality());
  
  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const refreshGenerations = useCallback(async () => {
    // Не делаем запросы, если страница не видима или компонент размонтирован
    if (!isPageVisible() || !isMountedRef.current) return;
    
    try {
      const response = await fetch('/api/generations/list?limit=20', {
        credentials: 'include',
      });
      if (response.ok && isMountedRef.current) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      // Тихо игнорируем ошибки сети
      console.error('Error fetching generations:', error);
    }
  }, []);

  const addGeneration = useCallback((generation: Generation) => {
    setGenerations((prev) => [generation, ...prev.slice(0, 19)]);
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

  // Простой polling без сложной логики
  useEffect(() => {
    isMountedRef.current = true;
    
    // Первоначальная загрузка
    refreshGenerations();
    
    // Определяем интервал
    const interval = getPollingInterval(networkQuality);
    
    // Запускаем polling
    pollingIntervalRef.current = setInterval(() => {
      if (isPageVisible()) {
        refreshGenerations();
      }
    }, interval);

    // Обработчик видимости страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshGenerations();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [networkQuality, refreshGenerations]);

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
        networkQuality,
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
