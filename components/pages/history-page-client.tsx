'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Loader2, Download, Play, Trash2, Type, RefreshCw, Heart, LinkIcon, ChevronDown, X, Check } from 'lucide-react';
import { OnlyMineToggle } from '@/components/only-mine-toggle';

// Типы фильтров
interface FilterOption {
  value: string;
  label: string;
}

// Опции для фильтра "Тип"
const TYPE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Все типы' },
  { value: 'create', label: 'Создание' },
  { value: 'edit', label: 'Редактирование' },
  { value: 'upscale', label: 'Увеличение' },
  { value: 'remove_bg', label: 'Удаление фона' },
  { value: 'video_create', label: 'Видео' },
  { value: 'video_i2v', label: 'Image to Video' },
  { value: 'analyze_describe', label: 'Анализ' },
  { value: 'inpaint', label: 'Inpaint' },
  { value: 'outpaint', label: 'Outpaint' },
];

// Опции для фильтра "Статус"
const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Все статусы' },
  { value: 'succeeded', label: 'Успешные' },
  { value: 'processing', label: 'В процессе' },
  { value: 'pending', label: 'Ожидание' },
  { value: 'failed', label: 'Ошибка' },
];

// Опции для фильтра "Дата"
const DATE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Все время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'week', label: 'Последняя неделя' },
  { value: 'month', label: 'Последний месяц' },
];

interface Generation {
  id: string;
  user_id: string;
  action: string;
  model_name: string;
  status: string;
  output_urls: string[] | null;
  output_thumbs?: string[] | null;
  prompt: string | null;
  created_at: string;
  is_favorite: boolean;
  error_message?: string | null;
  // Creator info (для workspace view)
  creator?: {
    email: string | null;
    name: string;
  };
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  member_role: string;
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

// Интервалы polling (оптимизированы для снижения Disk IO)
const POLLING_ACTIVE = 5000;  // 5 сек - есть активные генерации
const POLLING_IDLE = 60000;   // 60 сек - нет активных

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

// Оптимизированное изображение с shimmer placeholder
function ImageWithShimmer({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <>
      {/* Shimmer placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse rounded-[12px]" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover rounded-[12px] transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
      />
    </>
  );
}

// Компонент dropdown фильтра
interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function FilterDropdown({ label, value, options, onChange, isOpen, onToggle }: FilterDropdownProps) {
  const selectedOption = options.find(o => o.value === value);
  const displayLabel = value ? selectedOption?.label : label;
  const hasValue = !!value;
  
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-colors
          ${hasValue 
            ? 'bg-[#2c2c2c] text-white border border-[#3a3a3a]' 
            : 'bg-[#1a1a1a] text-[#959595] border border-transparent hover:bg-[#252525]'
          }
        `}
      >
        <span className="whitespace-nowrap">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-[10px] shadow-lg z-50 py-1 max-h-[300px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                onToggle();
              }}
              className={`
                w-full text-left px-3 py-2 text-[13px] transition-colors
                ${option.value === value 
                  ? 'bg-[#2c2c2c] text-white' 
                  : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [counts, setCounts] = useState<TabCounts>({ all: 0, processing: 0, favorites: 0, failed: 0 });
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Workspace state
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [onlyMine, setOnlyMine] = useState(searchParams.get('onlyMine') !== 'false'); // По умолчанию включён
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  // Filter states
  const [filterCreator, setFilterCreator] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Available options for dynamic filters
  const [availableCreators, setAvailableCreators] = useState<FilterOption[]>([]);
  const [availableModels, setAvailableModels] = useState<FilterOption[]>([]);
  
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Проверяем есть ли активные генерации (processing/pending)
  const hasActiveGenerations = generations.some(
    g => g.status === 'processing' || g.status === 'pending'
  );

  // URL параметры
  const urlWorkspaceId = searchParams.get('workspaceId');
  const urlCreatorId = searchParams.get('creatorId');
  const urlOnlyMine = searchParams.get('onlyMine');

  // Инициализируем фильтр по создателю из URL
  useEffect(() => {
    if (urlCreatorId) {
      setFilterCreator(urlCreatorId);
    }
  }, [urlCreatorId]);

  // Инициализируем onlyMine из URL
  useEffect(() => {
    if (urlOnlyMine !== null) {
      setOnlyMine(urlOnlyMine !== 'false');
    }
  }, [urlOnlyMine]);

  // Загрузка workspace пользователя
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const response = await fetch('/api/workspaces');
        if (response.ok) {
          const data = await response.json();
          
          if (data.workspaces && data.workspaces.length > 0) {
            setAllWorkspaces(data.workspaces);
            
            // Если есть workspaceId в URL - ищем его
            if (urlWorkspaceId) {
              const targetWorkspace = data.workspaces.find((ws: Workspace) => ws.id === urlWorkspaceId);
              if (targetWorkspace) {
                setWorkspace(targetWorkspace);
                // При переходе из списка пространств - выключаем "Только мои"
                setOnlyMine(false);
              } else {
                // Если не нашли - берём первый
                setWorkspace(data.workspaces[0]);
              }
            } else {
              // Без workspaceId - берём первый
              setWorkspace(data.workspaces[0]);
            }
          }
        }
      } catch (error) {
        console.error('Fetch workspace error:', error);
      } finally {
        setWorkspaceLoading(false);
      }
    };
    fetchWorkspace();
  }, [urlWorkspaceId]);

  const fetchGenerations = useCallback(async (silent = false, skipCounts = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      // Добавляем workspace фильтры
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        tab: activeTab,
      });
      
      if (skipCounts) params.set('skipCounts', 'true');
      if (workspace?.id) {
        params.set('workspaceId', workspace.id);
        params.set('onlyMine', onlyMine.toString());
      }
      
      // Добавляем фильтры
      if (filterCreator) params.set('creatorId', filterCreator);
      if (filterDate) params.set('dateRange', filterDate);
      if (filterModel) params.set('modelName', filterModel);
      if (filterType) params.set('actionType', filterType);
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/generations/list?${params}`);
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
  }, [page, activeTab, workspace?.id, onlyMine, filterCreator, filterDate, filterModel, filterType, filterStatus]);
  
  // Загрузка доступных создателей и моделей для фильтров
  const fetchFilterOptions = useCallback(async () => {
    if (!workspace?.id) return;
    
    try {
      const response = await fetch(`/api/generations/filter-options?workspaceId=${workspace.id}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.creators) {
          setAvailableCreators([
            { value: '', label: 'Все создатели' },
            ...data.creators.map((c: { id: string; name: string }) => ({
              value: c.id,
              label: c.name
            }))
          ]);
        }
        
        if (data.models) {
          setAvailableModels([
            { value: '', label: 'Все модели' },
            ...data.models.map((m: string) => ({
              value: m,
              label: m
            }))
          ]);
        }
      }
    } catch (error) {
      console.error('Fetch filter options error:', error);
    }
  }, [workspace?.id]);
  
  // Загружаем опции фильтров при смене workspace
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

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
    console.log('🔄 Calling sync-status API...');
    try {
      const response = await fetch('/api/generations/sync-status', { method: 'POST' });
      console.log('✅ Sync-status response:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Sync result:', data);
        if (data.synced > 0) {
          // Перезагрузить данные после синхронизации
          fetchGenerations(true);
        }
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }, [fetchGenerations]);

  // Сброс страницы при смене таба, onlyMine или фильтров
  useEffect(() => {
    setPage(1);
  }, [activeTab, onlyMine, filterCreator, filterDate, filterModel, filterType, filterStatus]);
  
  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);
  
  // Функция сброса всех фильтров
  const resetFilters = () => {
    setFilterCreator('');
    setFilterDate('');
    setFilterModel('');
    setFilterType('');
    setFilterStatus('');
  };
  
  // Проверка есть ли активные фильтры
  const hasActiveFilters = filterCreator || filterDate || filterModel || filterType || filterStatus;

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

  // Polling для обновления - всегда используем быстрый polling для автообновления
  useEffect(() => {
    // Всегда используем быстрый интервал для автоматического обновления превью
    const interval = POLLING_ACTIVE;

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      console.log('⏰ Polling interval triggered');
      
      // Синхронизируем статусы с Replicate
      try {
        console.log('🔄 Calling sync-status API...');
        const syncResponse = await fetch('/api/generations/sync-status', { method: 'POST' });
        console.log('✅ Sync-status response:', syncResponse.status);
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log('📊 Sync result:', syncData);
        }
      } catch (error) {
        console.error('❌ Sync error:', error);
      }
      
      // Обновляем список
      fetchGenerations(true, true);
    }, interval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchGenerations]);

  // NOTE: Realtime подписка отключена для снижения Disk IO
  // Все обновления обрабатываются через polling выше
  // Это значительно снижает нагрузку на WAL и Disk IO
  // См. supabase/migrations/optimize_disk_io.sql

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
        {/* Заголовок с workspace */}
        <div className="flex flex-col gap-1 mb-4">
          {/* Название workspace + заголовок */}
          <div className="flex flex-col gap-0">
            {workspace && (
              <span className="font-inter font-medium text-[14px] text-[#717171] tracking-[-0.3px] leading-[20px]">
                {workspace.name}
              </span>
            )}
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            История генераций
          </h1>
          </div>
          
          {/* Tabs и свитч "Только мои" */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2e2e2e] pb-0">
          {/* Tabs - горизонтальный скролл на мобильных */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
          
          {/* Фильтры */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            {/* Переключатель пространства - только если больше одного */}
            {allWorkspaces.length > 1 && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === 'workspace' ? null : 'workspace');
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium bg-[#2c2c2c] text-white border border-[#3a3a3a] transition-colors hover:bg-[#3a3a3a]"
                >
                  <span className="whitespace-nowrap max-w-[150px] truncate">{workspace?.name || 'Пространство'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'workspace' ? 'rotate-180' : ''}`} />
                </button>
                
                {openDropdown === 'workspace' && (
                  <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-[10px] shadow-lg z-50 py-1 max-h-[300px] overflow-y-auto">
                    {allWorkspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspace(ws);
                          setOpenDropdown(null);
                        }}
                        className={`
                          w-full text-left px-3 py-2 text-[13px] transition-colors flex items-center justify-between
                          ${ws.id === workspace?.id 
                            ? 'bg-[#2c2c2c] text-white' 
                            : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                          }
                        `}
                      >
                        <span className="truncate">{ws.name}</span>
                        {ws.id === workspace?.id && <Check className="w-4 h-4 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Фильтр по создателю - только если не "Только мои" */}
            {!onlyMine && availableCreators.length > 1 && (
              <FilterDropdown
                label="Создатель"
                value={filterCreator}
                options={availableCreators}
                onChange={setFilterCreator}
                isOpen={openDropdown === 'creator'}
                onToggle={() => setOpenDropdown(openDropdown === 'creator' ? null : 'creator')}
              />
            )}
            
            {/* Фильтр по дате */}
            <FilterDropdown
              label="Дата создания"
              value={filterDate}
              options={DATE_OPTIONS}
              onChange={setFilterDate}
              isOpen={openDropdown === 'date'}
              onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
            />
            
            {/* Фильтр по модели */}
            {availableModels.length > 1 && (
              <FilterDropdown
                label="Модель"
                value={filterModel}
                options={availableModels}
                onChange={setFilterModel}
                isOpen={openDropdown === 'model'}
                onToggle={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
              />
            )}
            
            {/* Фильтр по типу */}
            <FilterDropdown
              label="Тип"
              value={filterType}
              options={TYPE_OPTIONS}
              onChange={setFilterType}
              isOpen={openDropdown === 'type'}
              onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
            />
            
            {/* Фильтр по статусу */}
            <FilterDropdown
              label="Статус"
              value={filterStatus}
              options={STATUS_OPTIONS}
              onChange={setFilterStatus}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            />
            
            {/* Свитч "Только мои" */}
            {workspace && (
              <div className="ml-auto">
                <OnlyMineToggle
                  checked={onlyMine}
                  onChange={setOnlyMine}
                  disabled={workspaceLoading}
                />
              </div>
            )}
            
            {/* Кнопка сброса фильтров */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-3 py-2 text-[13px] text-[#959595] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Сбросить
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          // Skeleton grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="border border-[#252525] rounded-[16px] p-1">
                <div className="relative aspect-square rounded-[12px] overflow-hidden bg-[#252525] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                  <div className="h-3 w-1/2 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                </div>
              </div>
            ))}
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
                        ) : (generation.output_thumbs?.[0] || generation.output_urls?.[0]) && isValidMediaUrl((generation.output_thumbs?.[0] || generation.output_urls?.[0]) as string) ? (
                          isVideoUrl((generation.output_urls?.[0] || '') as string) ? (
                            <video
                              className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
                              src={(generation.output_urls?.[0] || '') as string}
                              preload="metadata"
                              muted
                              playsInline
                            />
                          ) : (
                            <ImageWithShimmer
                              src={(generation.output_thumbs?.[0] || generation.output_urls?.[0]) as string}
                              alt={generation.prompt || 'Generated'}
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
                        
                        {/* Avatar создателя - показываем когда смотрим все генерации workspace */}
                        {!onlyMine && generation.creator && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-[#181818]/80 backdrop-blur-sm px-2 py-1 rounded-[8px]">
                            {/* Avatar circle with initials */}
                            <div className="w-5 h-5 rounded-full bg-[#6366F1] flex items-center justify-center">
                              <span className="font-inter font-medium text-[10px] text-white uppercase">
                                {generation.creator.name?.substring(0, 2) || '??'}
                              </span>
                            </div>
                            <span className="font-inter font-medium text-[10px] text-[#bbbbbb] max-w-[80px] truncate">
                              {generation.creator.name}
                            </span>
                          </div>
                        )}

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
