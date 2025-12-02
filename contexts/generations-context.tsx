'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { fetchWithTimeout, isOnline, subscribeToNetworkChanges, getNetworkDiagnostics } from '@/lib/network-utils';

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
  isOffline: boolean;
  networkError: string | null;
  addGeneration: (generation: Generation) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
  markAsViewed: (id: string) => Promise<void>;
  refreshGenerations: () => Promise<void>;
}

const GenerationsContext = createContext<GenerationsContextType | undefined>(undefined);

// Интервалы polling
const POLLING_INTERVAL = 10000; // 10 секунд обычно
const POLLING_INTERVAL_SLOW = 20000; // 20 секунд при ошибках
const MAX_CONSECUTIVE_ERRORS = 3;

interface GenerationsProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function GenerationsProvider({ children, isAuthenticated = true }: GenerationsProviderProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isWindowVisible, setIsWindowVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );
  const [pollInterval, setPollInterval] = useState(POLLING_INTERVAL);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const pollIntervalRef = useRef(POLLING_INTERVAL);

  useEffect(() => {
    pollIntervalRef.current = pollInterval;
  }, [pollInterval]);

  const refreshGenerations = useCallback(async () => {
    if (!isAuthenticated || !isWindowVisible) {
      return;
    }
    // Пропускаем если офлайн
    if (!isOnline()) {
      setIsOffline(true);
      console.log('[Generations] Skipping refresh - offline');
      return;
    }
    
    setIsOffline(false);
    
    try {
      const response = await fetchWithTimeout('/api/generations/list?limit=20', {
        timeout: 15000, // 15 секунд timeout
        retries: 1,
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setNetworkError(null);
        
        // Сбрасываем счётчик ошибок при успехе
        consecutiveErrorsRef.current = 0;
        
        // Возвращаем нормальный интервал
        if (pollIntervalRef.current !== POLLING_INTERVAL) {
          setPollInterval(POLLING_INTERVAL);
        }
      } else if (response.status === 401) {
        // Не авторизован - не показываем как сетевую ошибку
        console.log('[Generations] Not authenticated');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      consecutiveErrorsRef.current++;
      
      console.error('[Generations] Refresh error:', {
        message: error.message,
        code: error.code,
        consecutiveErrors: consecutiveErrorsRef.current,
        diagnostics: getNetworkDiagnostics(),
      });
      
      // Показываем ошибку пользователю после нескольких попыток
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        if (error.code === 'OFFLINE') {
          setIsOffline(true);
          setNetworkError('Нет подключения к интернету');
        } else if (error.code === 'TIMEOUT') {
          setNetworkError('Медленное соединение. Данные могут обновляться с задержкой');
        } else {
          setNetworkError('Проблемы с соединением');
        }
        
        // Увеличиваем интервал при ошибках
        if (pollIntervalRef.current !== POLLING_INTERVAL_SLOW) {
          setPollInterval(POLLING_INTERVAL_SLOW);
        }
      }
    }
  }, [isAuthenticated, isWindowVisible]);

  const addGeneration = useCallback((generation: Generation) => {
    setGenerations((prev) => [generation, ...prev.slice(0, 19)]);
  }, []);

  const updateGeneration = useCallback((id: string, updates: Partial<Generation>) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }, []);

  const markAsViewed = useCallback(async (id: string) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, viewed: true } : g))
    );
    try {
      await fetchWithTimeout(`/api/generations/${id}/view`, { 
        method: 'POST',
        timeout: 10000,
        retries: 1,
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Generations] Mark viewed error:', error);
    }
  }, []);

  // Derived state
  const unviewedGenerations = generations.filter((g) => !g.viewed);
  const unviewedCount = unviewedGenerations.length;
  const hasActiveGenerations = unviewedGenerations.some(
    (g) => g.status === 'pending' || g.status === 'processing'
  );

  // Подписка на изменения сети
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((online) => {
      setIsOffline(!online);
      if (online) {
        // При восстановлении соединения - сразу обновляем
        setNetworkError(null);
        consecutiveErrorsRef.current = 0;
        refreshGenerations();
      }
    });
    
    return unsubscribe;
  }, [refreshGenerations]);

  // Polling
  useEffect(() => {
    if (!isAuthenticated || !isWindowVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    refreshGenerations();
    intervalRef.current = setInterval(refreshGenerations, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshGenerations, isAuthenticated, isWindowVisible, pollInterval]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = document.visibilityState !== 'hidden';
      setIsWindowVisible(visible);
      if (visible) {
        refreshGenerations();
      }
    };

    const handleFocus = () => {
      setIsWindowVisible(true);
      refreshGenerations();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshGenerations]);

  return (
    <GenerationsContext.Provider
      value={{
        generations,
        unviewedCount,
        unviewedGenerations,
        hasActiveGenerations,
        isOffline,
        networkError,
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
