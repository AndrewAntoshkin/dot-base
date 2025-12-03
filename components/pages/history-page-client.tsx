'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Loader2, Download, Play, Trash2, Type, RefreshCw, Heart, LinkIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Generation {
  id: string;
  action: string;
  model_name: string;
  status: string;
  output_urls: string[] | null;
  prompt: string | null;
  created_at: string;
  is_favorite: boolean;
  error_message?: string | null;
}

interface TabCounts {
  all: number;
  processing: number;
  favorites: number;
  failed: number;
}

type TabType = 'all' | 'processing' | 'favorites' | 'failed';

const TABS: { id: TabType; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'processing', label: 'В работе' },
  { id: 'favorites', label: 'Избранные' },
  { id: 'failed', label: 'Ошибки' },
];

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

// SVG иконки для пиксель-перфект
const HeartOutlineIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.76621 8.76621L7.69289 13.6929C7.86193 13.8619 8.13807 13.8619 8.30711 13.6929L13.2338 8.76621C14.4661 7.53393 14.4661 5.53274 13.2338 4.30046C12.0015 3.06818 10.0003 3.06818 8.76804 4.30046L8 5.06851L7.23196 4.30046C5.99968 3.06818 3.99849 3.06818 2.76621 4.30046C1.53393 5.53274 1.53393 7.53393 2.76621 8.76621Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HeartFilledIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.76621 8.76621L7.69289 13.6929C7.86193 13.8619 8.13807 13.8619 8.30711 13.6929L13.2338 8.76621C14.4661 7.53393 14.4661 5.53274 13.2338 4.30046C12.0015 3.06818 10.0003 3.06818 8.76804 4.30046L8 5.06851L7.23196 4.30046C5.99968 3.06818 3.99849 3.06818 2.76621 4.30046C1.53393 5.53274 1.53393 7.53393 2.76621 8.76621Z" fill="#FA5252" stroke="#FA5252" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BrokenLinkIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.3333 15L8.33333 20L13.3333 25" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26.6667 15L31.6667 20L26.6667 25" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23.3333 11.6667L16.6667 28.3333" stroke="#959595" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function HistoryPageClient() {
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [counts, setCounts] = useState<TabCounts>({ all: 0, processing: 0, favorites: 0, failed: 0 });
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  // Проверяем есть ли активные генерации (processing/pending)
  const hasActiveGenerations = generations.some(
    g => g.status === 'processing' || g.status === 'pending'
  );

  const fetchGenerations = useCallback(async (silent = false, skipCounts = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const url = `/api/generations/list?page=${page}&limit=20&tab=${activeTab}${skipCounts ? '&skipCounts=true' : ''}`
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setTotalPages(data.totalPages || 1);
        // Обновляем счётчики только если они пришли (не skipCounts)
        if (data.counts && (data.counts.all > 0 || data.counts.processing > 0 || data.counts.favorites > 0 || data.counts.failed > 0)) {
          setCounts(data.counts);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [page, activeTab]);

  // Быстрое обновление только счётчиков (отдельный легковесный эндпоинт)
  const updateCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/generations/counts');
      if (response.ok) {
        const data = await response.json();
        setCounts(data);
      }
    } catch (error) {
      console.error('Update counts error:', error);
    }
  }, []);

  // Синхронизация статусов processing генераций с Replicate
  const syncProcessingStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/generations/sync-status', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        if (data.synced > 0) {
          console.log(`Synced ${data.synced} generations`);
          // Перезагрузить данные после синхронизации
          fetchGenerations(true);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, [fetchGenerations]);

  // Сброс страницы при смене таба
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Начальная загрузка + синхронизация
  useEffect(() => {
    fetchGenerations();
    // Синхронизируем статусы при загрузке страницы
    syncProcessingStatuses();
  }, [fetchGenerations, syncProcessingStatuses]);

  // Синхронизация при переключении на таб "В работе"
  useEffect(() => {
    if (activeTab === 'processing') {
      syncProcessingStatuses();
    }
  }, [activeTab, syncProcessingStatuses]);

  // Polling для обновления - быстрее на табе "В работе" или при активных генерациях
  useEffect(() => {
    const needsFastPolling = activeTab === 'processing' || hasActiveGenerations;
    const interval = needsFastPolling ? POLLING_ACTIVE : POLLING_IDLE;
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(async () => {
      // Если есть активные генерации - сначала синхронизируем статусы
      if (hasActiveGenerations) {
        await syncProcessingStatuses();
      } else {
        fetchGenerations(true);
      }
    }, interval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [hasActiveGenerations, activeTab, fetchGenerations, syncProcessingStatuses]);

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
          const newData = payload.new as Generation;
          console.log('[History] Real-time update:', newData.id, newData.status);
          
          // Проверяем, должна ли генерация оставаться в текущем табе
          const shouldBeInCurrentTab = (gen: Generation) => {
            switch (activeTab) {
              case 'processing':
                return gen.status === 'pending' || gen.status === 'processing';
              case 'favorites':
                return gen.is_favorite === true;
              case 'failed':
                return gen.status === 'failed';
              default: // 'all'
                return true;
            }
          };
          
          setGenerations(prev => {
            // Обновляем генерацию
            const updated = prev.map(g => 
              g.id === newData.id ? { ...g, ...newData } : g
            );
            
            // Фильтруем - убираем те, что больше не соответствуют табу
            return updated.filter(shouldBeInCurrentTab);
          });
          
          // Обновляем счётчики (отдельный запрос)
          updateCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, updateCounts]);

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
        // Refresh counts
        fetchGenerations(true);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/generations/${id}/favorite`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setGenerations(prev => 
          prev.map(g => 
            g.id === id ? { ...g, is_favorite: data.is_favorite } : g
          )
        );
        // Refresh counts
        fetchGenerations(true);
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleRetry = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (retryingIds.has(id)) return;
    
    setRetryingIds(prev => new Set(prev).add(id));
    
    try {
      const response = await fetch(`/api/generations/${id}/retry`, { method: 'POST' });
      if (response.ok) {
        // Update local state to show processing
        setGenerations(prev => 
          prev.map(g => 
            g.id === id ? { ...g, status: 'processing', error_message: null } : g
          )
        );
        // Refresh data
        fetchGenerations(true);
      }
    } catch (error) {
      console.error('Retry error:', error);
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
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
        {/* Заголовок и табы */}
        <div className="flex flex-col gap-1 mb-4">
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            История генераций
          </h1>
          
          {/* Tabs - горизонтальный скролл на мобильных */}
          <div className="flex gap-3 border-b border-[#2e2e2e] overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const count = counts[tab.id];
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-[10px] px-0 shrink-0
                    ${isActive ? 'border-b-2 border-white' : 'border-b-2 border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-2 py-1">
                    <span 
                      className={`
                        font-inter text-[14px] leading-[20px] whitespace-nowrap
                        ${isActive ? 'font-medium text-white' : 'font-normal text-[#959595]'}
                      `}
                    >
                      {tab.label}
                    </span>
                    <div className="bg-[#2c2c2c] min-w-[20px] h-[20px] rounded-[6px] flex items-center justify-center px-1.5">
                      <span className="font-inter font-medium text-[10px] text-white leading-[20px]">
                        {count}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="font-inter text-base text-[#8c8c8c] mb-6">
                {activeTab === 'all' 
                  ? 'У вас пока нет генераций'
                  : activeTab === 'processing'
                  ? 'Нет активных генераций'
                  : activeTab === 'favorites'
                  ? 'Нет избранных генераций'
                  : 'Нет ошибок'
                }
              </p>
              {activeTab === 'all' && (
                <Link
                  href="/"
                  className="inline-block bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white"
                >
                  Создать первую генерацию
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Grid - 5 колонок на xl (1280px+), 4 на lg, 3 на md, 2 на mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {generations.map((generation) => {
                const isFailed = generation.status === 'failed';
                const isRetrying = retryingIds.has(generation.id);
                
                return (
                  <div
                    key={generation.id}
                    className={`
                      border rounded-[16px] cursor-pointer transition-colors
                      ${isFailed 
                        ? 'border-[#ff4949] hover:border-[#ff6666]' 
                        : 'border-[#252525] hover:border-[#3a3a3a]'
                      }
                    `}
                    onClick={() => handleClick(generation)}
                  >
                    <div className="p-1 flex flex-col">
                      {/* Изображение */}
                      <div className="relative aspect-square rounded-[12px] overflow-hidden bg-[#151515]">
                        {isFailed ? (
                          // Ошибка - показываем иконку broken link
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BrokenLinkIcon />
                          </div>
                        ) : generation.output_urls?.[0] && isValidMediaUrl(generation.output_urls[0]) ? (
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
                        
                        {/* Badge модели - на мобильных внизу слева, на больших экранах вверху */}
                        <div className="absolute bottom-2 sm:bottom-auto sm:top-2 left-2 bg-[#181818] px-1.5 py-1 rounded-[8px] flex items-center justify-center">
                          <span className="font-inter font-medium text-[10px] text-[#bbbbbb] uppercase tracking-[-0.2px] leading-4 text-center">
                            {generation.model_name}
                          </span>
                        </div>

                        {/* Кнопка избранного (только для не-ошибок) */}
                        {!isFailed && (
                          <button
                            onClick={(e) => handleToggleFavorite(e, generation.id)}
                            className="absolute top-2 right-2 bg-[#181818] border border-[#2f2f2f] p-2 rounded-[8px] hover:bg-[#252525] transition-colors"
                          >
                            {generation.is_favorite ? <HeartFilledIcon /> : <HeartOutlineIcon />}
                          </button>
                        )}
                      </div>

                      {/* Текстовый блок */}
                      <div className="p-2 lg:p-3 flex flex-col gap-2 lg:gap-3">
                        {/* Промпт */}
                        <p className="font-inter font-normal text-[11px] lg:text-[12px] text-[#8c8c8c] leading-4 line-clamp-3">
                          {generation.prompt || 'Без промпта'}
                        </p>

                        {/* Дата и кнопки */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                          <span className="font-inter font-medium text-[10px] lg:text-[12px] text-[#4d4d4d] leading-5 whitespace-nowrap">
                            {formatDateCustom(generation.created_at)}
                          </span>
                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            {/* Кнопка удаления */}
                            <button
                              onClick={(e) => handleDelete(e, generation.id)}
                              className="p-1.5 lg:p-2 rounded-[6px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            </button>
                            
                            {/* Кнопка скачивания ИЛИ повтора */}
                            {isFailed ? (
                              <button
                                onClick={(e) => handleRetry(e, generation.id)}
                                disabled={isRetrying}
                                className="p-1.5 lg:p-2 rounded-[6px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                              </button>
                            ) : generation.output_urls?.[0] && (
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
                );
              })}
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
