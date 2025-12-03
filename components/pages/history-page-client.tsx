'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Loader2, Download, Play, Trash2, Type } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Generation {
  id: string;
  action: string;
  model_name: string;
  status: string;
  output_urls: string[] | null;
  prompt: string | null;
  created_at: string;
}

function isVideoUrl(url: string): boolean {
  return ['.mp4', '.webm', '.mov', '.avi', '.mkv'].some(ext => url.toLowerCase().includes(ext));
}

function isVideoAction(action: string): boolean {
  return action.startsWith('video_');
}

function isTextAction(action: string): boolean {
  return action.startsWith('analyze_');
}

function isValidMediaUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

// Форматирование даты: 12.12.2025 / 12:03
function formatDateCustom(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} / ${hours}:${minutes}`;
}

// Интервалы polling
const POLLING_ACTIVE = 3000;  // 3 сек - есть активные генерации
const POLLING_IDLE = 30000;   // 30 сек - нет активных

export default function HistoryPageClient() {
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  // Проверяем есть ли активные генерации (processing/pending)
  const hasActiveGenerations = generations.some(
    g => g.status === 'processing' || g.status === 'pending'
  );

  const fetchGenerations = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/generations/list?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [page]);

  // Начальная загрузка
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Polling для обновления при активных генерациях
  useEffect(() => {
    const interval = hasActiveGenerations ? POLLING_ACTIVE : POLLING_IDLE;
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      fetchGenerations(true);
    }, interval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [hasActiveGenerations, fetchGenerations]);

  // Supabase Real-time подписка на изменения
  useEffect(() => {
    const supabase = supabaseRef.current;
    
    const channel = supabase
      .channel('generations-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
        },
        (payload) => {
          console.log('[History] Real-time update:', payload.new.id, payload.new.status);
          setGenerations(prev => 
            prev.map(g => 
              g.id === payload.new.id 
                ? { ...g, ...payload.new as Generation }
                : g
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${id}.${isVideoUrl(url) ? 'mp4' : 'png'}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Удалить эту генерацию?')) return;
    
    try {
      const response = await fetch(`/api/generations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setGenerations(prev => prev.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleClick = (generation: Generation) => {
    let basePath = '/';
    if (isVideoAction(generation.action)) basePath = '/video';
    else if (isTextAction(generation.action)) basePath = '/analyze';
    router.push(`${basePath}?generationId=${generation.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1 px-4 lg:px-[80px] py-6">
        {/* Заголовок */}
        <h1 className="font-inter font-medium text-[20px] text-white tracking-[-0.4px] leading-[28px] mb-4">
          История генераций
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="font-inter text-base text-[#8c8c8c] mb-6">
                У вас пока нет генераций
              </p>
              <Link
                href="/"
                className="inline-block bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white"
              >
                Создать первую генерацию
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Grid - 5 колонок на desktop, 2 на mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="border border-[#252525] rounded-[16px] cursor-pointer hover:border-[#3a3a3a] transition-colors"
                  onClick={() => handleClick(generation)}
                >
                  <div className="p-1 flex flex-col">
                    {/* Изображение */}
                    <div className="relative aspect-square rounded-[12px] overflow-hidden bg-[#151515]">
                      {generation.output_urls?.[0] && isValidMediaUrl(generation.output_urls[0]) ? (
                        isVideoUrl(generation.output_urls[0]) ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-8 w-8 lg:h-10 lg:w-10 text-[#656565]" />
                          </div>
                        ) : (
                          <img
                            src={generation.output_urls[0]}
                            alt={generation.prompt || 'Generated'}
                            className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
                            loading="lazy"
                          />
                        )
                      ) : isTextAction(generation.action) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Type className="h-8 w-8 lg:h-10 lg:w-10 text-[#656565]" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-inter text-[10px] lg:text-xs text-[#656565]">
                            {generation.status === 'processing' || generation.status === 'pending' 
                              ? 'Генерация...' 
                              : 'Нет изображения'}
                          </span>
                        </div>
                      )}
                      
                      {/* Badge модели */}
                      <div className="absolute top-2 left-2 bg-[#181818] px-1.5 py-1 rounded">
                        <span className="font-inter font-medium text-[10px] text-[#bbbbbb] uppercase tracking-[-0.2px] leading-4">
                          {generation.model_name}
                        </span>
                      </div>
                    </div>

                    {/* Текстовый блок */}
                    <div className="p-2 lg:p-3 flex flex-col gap-2 lg:gap-3">
                      {/* Промпт */}
                      <p className="font-inter font-normal text-[11px] lg:text-[12px] text-[#8c8c8c] leading-4 line-clamp-3">
                        {generation.prompt || 'Без промпта'}
                      </p>

                      {/* Дата и кнопки */}
                      <div className="flex items-end justify-between gap-2">
                        <span className="font-inter font-medium text-[10px] lg:text-[12px] text-[#4d4d4d] leading-5 whitespace-nowrap">
                          {formatDateCustom(generation.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(e, generation.id)}
                            className="p-1.5 lg:p-2 rounded-[6px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                          {generation.output_urls?.[0] && (
                            <button
                              onClick={(e) => handleDownload(e, generation.output_urls![0], generation.id)}
                              className="p-1.5 lg:p-2 rounded-[6px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                            >
                              <Download className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                <span className="font-inter text-sm text-[#8c8c8c]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
