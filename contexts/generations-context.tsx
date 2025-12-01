'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  getPollingInterval,
  getNetworkQuality,
  subscribeToNetworkChanges,
  subscribeToVisibilityChanges,
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
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('fast');
  const [isVisible, setIsVisible] = useState(true);
  
  // Храним ref для interval ID
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasActiveRef = useRef(false);

  const refreshGenerations = useCallback(async () => {
    // Не делаем запросы, если страница не видима
    if (!isPageVisible()) {
      return;
    }
    
    try {
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
  hasActiveRef.current = hasActiveGenerations;

  // Инициализация качества сети
  useEffect(() => {
    setNetworkQuality(getNetworkQuality());
  }, []);

  // Подписка на изменения качества сети
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((quality) => {
      console.log(`[Network] Quality changed to: ${quality}`);
      setNetworkQuality(quality);
    });
    return unsubscribe;
  }, []);

  // Подписка на видимость страницы
  useEffect(() => {
    const unsubscribe = subscribeToVisibilityChanges((visible) => {
      setIsVisible(visible);
      // При возвращении на страницу сразу обновляем
      if (visible) {
        refreshGenerations();
      }
    });
    return unsubscribe;
  }, [refreshGenerations]);

  // Умный polling с адаптацией к сети и видимости
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Не запускаем polling если страница не видима
    if (!isVisible) {
      return;
    }

    // Получаем интервал в зависимости от качества сети и наличия активных генераций
    const baseInterval = getPollingInterval(networkQuality);
    // Если нет активных генераций - polling ещё реже
    const interval = hasActiveRef.current ? baseInterval : baseInterval * 2;

    // Первоначальная загрузка
    refreshGenerations();

    // Запускаем polling
    pollingIntervalRef.current = setInterval(() => {
      // Динамически проверяем, есть ли активные генерации
      const dynamicInterval = hasActiveRef.current ? baseInterval : baseInterval * 2;
      // Если интервал изменился, перезапускаем
      if (dynamicInterval !== interval && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = setInterval(refreshGenerations, dynamicInterval);
      }
      refreshGenerations();
    }, interval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [networkQuality, isVisible, refreshGenerations]);

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
