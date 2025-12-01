'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

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

// Простой интервал - 10 секунд
const POLLING_INTERVAL = 10000;

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshGenerations = useCallback(async () => {
    try {
      const response = await fetch('/api/generations/list?limit=20');
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
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
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, viewed: true } : g))
    );
    try {
      await fetch(`/api/generations/${id}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Mark viewed error:', error);
    }
  }, []);

  // Derived state
  const unviewedGenerations = generations.filter((g) => !g.viewed);
  const unviewedCount = unviewedGenerations.length;
  const hasActiveGenerations = unviewedGenerations.some(
    (g) => g.status === 'pending' || g.status === 'processing'
  );

  // Простой polling
  useEffect(() => {
    refreshGenerations();
    
    intervalRef.current = setInterval(refreshGenerations, POLLING_INTERVAL);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshGenerations]);

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
