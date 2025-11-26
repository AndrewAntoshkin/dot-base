'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Generation {
  id: string;
  model_name: string;
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
  markAsViewed: (id: string) => Promise<void>;
  refreshGenerations: () => Promise<void>;
}

const GenerationsContext = createContext<GenerationsContextType | undefined>(undefined);

export function GenerationsProvider({ children }: { children: ReactNode }) {
  const [generations, setGenerations] = useState<Generation[]>([]);

  const refreshGenerations = async () => {
    try {
      const response = await fetch('/api/generations/list?limit=50');
      if (response.ok) {
        const data = await response.json();
        // API возвращает { generations: [...] }, а не просто массив
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    }
  };

  const addGeneration = (generation: Generation) => {
    setGenerations((prev) => [generation, ...prev]);
  };

  const markAsViewed = async (id: string) => {
    try {
      // Optimistic update
      setGenerations((prev) =>
        prev.map((g) => (g.id === id ? { ...g, viewed: true } : g))
      );

      // Call API
      await fetch(`/api/generations/${id}/view`, { method: 'POST' });
    } catch (error) {
      console.error('Error marking as viewed:', error);
      // Refresh on error
      refreshGenerations();
    }
  };

  // Poll for updates every 3 seconds
  useEffect(() => {
    refreshGenerations();
    const interval = setInterval(refreshGenerations, 3000);
    return () => clearInterval(interval);
  }, []);

  // Фильтруем непросмотренные генерации
  const unviewedGenerations = Array.isArray(generations)
    ? generations.filter((g) => !g.viewed)
    : [];

  const unviewedCount = unviewedGenerations.length;

  // Проверяем есть ли активные генерации (pending/processing) среди непросмотренных
  const hasActiveGenerations = unviewedGenerations.some(
    (g) => g.status === 'pending' || g.status === 'processing'
  );

  return (
    <GenerationsContext.Provider
      value={{
        generations,
        unviewedCount,
        unviewedGenerations,
        hasActiveGenerations,
        addGeneration,
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

