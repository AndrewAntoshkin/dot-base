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
  settings?: Record<string, any> & { auto_retry_count?: number };
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
  markAllAsViewed: () => Promise<void>;
  refreshGenerations: () => Promise<void>;
}

const GenerationsContext = createContext<GenerationsContextType | undefined>(undefined);

// Адаптивные интервалы polling (оптимизированы для снижения Disk IO)
const POLLING_ACTIVE = 5000;       // 5 сек - есть активные генерации (было 3)
const POLLING_IDLE = 60000;        // 60 сек - нет активных генераций (было 30)
const POLLING_BACKGROUND = 120000; // 120 сек - вкладка в фоне (было 60)
const POLLING_ERROR = 60000;       // 60 сек - при ошибках соединения (было 45)
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Проверка, является ли ошибка AbortError (запрос отменён)
 */
function isAbortError(error: any): boolean {
  return error?.name === 'AbortError' || 
         error?.code === 'ABORT_ERR' || 
         error?.message?.includes('aborted') ||
         error?.message?.includes('abort');
}

interface GenerationsProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function GenerationsProvider({ children, isAuthenticated = true }: GenerationsProviderProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const [pollInterval, setPollInterval] = useState(POLLING_IDLE);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const pollIntervalRef = useRef(POLLING_IDLE);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isWindowVisibleRef = useRef(true);
  const hasActiveRef = useRef(false);
  const skipNextPollRef = useRef(false); // Пропустить следующий poll после markAllAsViewed

  // Обновляем refs при изменении props/state
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    isWindowVisibleRef.current = isWindowVisible;
  }, [isWindowVisible]);

  useEffect(() => {
    pollIntervalRef.current = pollInterval;
  }, [pollInterval]);

  /**
   * Вычислить оптимальный интервал polling на основе текущего состояния
   * Определён до refreshGenerations чтобы избежать циклической зависимости
   */
  const calculateOptimalInterval = useCallback((): number => {
    // При ошибках - медленный интервал
    if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
      return POLLING_ERROR;
    }
    
    // Вкладка в фоне - самый медленный
    if (!isWindowVisibleRef.current) {
      return POLLING_BACKGROUND;
    }
    
    // Есть активные генерации - быстрый polling
    if (hasActiveRef.current) {
      return POLLING_ACTIVE;
    }
    
    // Обычный режим - умеренный интервал
    return POLLING_IDLE;
  }, []);

  // refreshGenerations без зависимостей для стабильности
  const refreshGenerations = useCallback(async () => {
    if (!isAuthenticatedRef.current || !isWindowVisibleRef.current) {
      return;
    }
    
    // Пропускаем poll если недавно было markAllAsViewed (предотвращаем race condition)
    if (skipNextPollRef.current) {
      skipNextPollRef.current = false;
      console.log('[Generations] Skipping refresh - cooldown after clear');
      return;
    }
    
    // Пропускаем если офлайн
    if (!isOnline()) {
      setIsOffline(true);
      console.log('[Generations] Skipping refresh - offline');
      return;
    }
    
    setIsOffline(false);
    
    // Отменяем предыдущий запрос если он ещё выполняется
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      // Сначала синхронизируем статусы с Replicate (только если есть активные)
      if (hasActiveRef.current) {
        try {
          await fetchWithTimeout('/api/generations/sync-status', {
            method: 'POST',
            timeout: 10000,
            retries: 0,
            credentials: 'include',
          });
        } catch (syncError) {
          // Игнорируем ошибки sync - продолжаем получать список
          console.error('[Generations] Sync error:', syncError);
        }
      }
      
      // Use skipCounts=true to avoid 4 extra COUNT queries on each poll
      // Context only needs the list for badge/unviewed count
      const response = await fetchWithTimeout('/api/generations/list?limit=20&skipCounts=true', {
        timeout: 15000, // 15 секунд timeout
        retries: 1,
        credentials: 'include',
        signal: abortController.signal,
      });
      
      // Проверяем что запрос не был отменён
      if (abortController.signal.aborted) return;
      
      if (response.ok) {
        const data = await response.json();
        
        // Ещё одна проверка
        if (abortController.signal.aborted) return;
        
        setGenerations(data.generations || []);
        setNetworkError(null);
        
        // Сбрасываем счётчик ошибок при успехе
        consecutiveErrorsRef.current = 0;
        
        // Пересчитываем оптимальный интервал
        const newInterval = calculateOptimalInterval();
        if (pollIntervalRef.current !== newInterval) {
          setPollInterval(newInterval);
        }
      } else if (response.status === 401) {
        // Не авторизован - не показываем как сетевую ошибку
        console.log('[Generations] Not authenticated');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      // Игнорируем AbortError - это нормальная ситуация
      if (isAbortError(error)) {
        return;
      }
      
      // Проверяем что запрос не был отменён
      if (abortController.signal.aborted) return;
      
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
        
        // Пересчитываем оптимальный интервал
        const newInterval = calculateOptimalInterval();
        if (pollIntervalRef.current !== newInterval) {
          setPollInterval(newInterval);
        }
      }
    }
  }, [calculateOptimalInterval]); // Добавляем calculateOptimalInterval

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
    } catch (error: any) {
      // Игнорируем AbortError
      if (!isAbortError(error)) {
        console.error('[Generations] Mark viewed error:', error);
      }
    }
  }, []);

  const markAllAsViewed = useCallback(async () => {
    // Оптимистичное обновление UI
    setGenerations((prev) =>
      prev.map((g) => ({ ...g, viewed: true }))
    );
    
    // Пропустить следующий poll чтобы не перезаписать локальное состояние
    // до того как сервер обновится (предотвращаем race condition)
    skipNextPollRef.current = true;
    
    try {
      await fetchWithTimeout('/api/generations/view-all', { 
        method: 'POST',
        timeout: 10000,
        retries: 1,
        credentials: 'include',
      });
    } catch (error: any) {
      // Игнорируем AbortError
      if (!isAbortError(error)) {
        console.error('[Generations] Mark all viewed error:', error);
      }
    }
  }, []);

  // Derived state
  const unviewedGenerations = generations.filter((g) => !g.viewed);
  const unviewedCount = unviewedGenerations.length;
  const hasActiveGenerations = unviewedGenerations.some(
    (g) => g.status === 'pending' || g.status === 'processing'
  );

  // Обновляем ref для использования в вычислении интервала
  useEffect(() => {
    hasActiveRef.current = hasActiveGenerations;
  }, [hasActiveGenerations]);

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

  // Автоматическое переключение интервала при изменении состояния
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const newInterval = calculateOptimalInterval();
    if (pollIntervalRef.current !== newInterval) {
      console.log(`[Generations] Adaptive polling: ${pollIntervalRef.current}ms → ${newInterval}ms (active: ${hasActiveGenerations}, visible: ${isWindowVisible})`);
      setPollInterval(newInterval);
    }
  }, [hasActiveGenerations, isWindowVisible, isAuthenticated, calculateOptimalInterval]);

  // Polling - главный эффект
  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Начальная загрузка
    refreshGenerations();
    
    // Устанавливаем интервал
    intervalRef.current = setInterval(refreshGenerations, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Отменяем текущий запрос при размонтировании
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, pollInterval, refreshGenerations]);

  // Отслеживание видимости окна
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = document.visibilityState !== 'hidden';
      setIsWindowVisible(visible);
      if (visible && isAuthenticatedRef.current) {
        refreshGenerations();
      }
    };

    const handleFocus = () => {
      setIsWindowVisible(true);
      if (isAuthenticatedRef.current) {
        refreshGenerations();
      }
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
        markAllAsViewed,
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
