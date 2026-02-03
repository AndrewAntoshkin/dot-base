'use client';

import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { ChevronRight, Search } from 'lucide-react';
import { WorkspaceFlowsKanban } from '@/components/workspace-flows-kanban';
import type { FlowCard, FlowWorkspaceStatus } from '@/lib/flow/types';

interface WorkspaceUser {
  id: string;
  email: string;
  name: string;
  generations_count: number;
  previews: string[];
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceUsersPageClientProps {
  workspaceId: string;
}

// Цвета для аватаров (как в Figma - color/primary/500)
const AVATAR_COLORS = [
  '#7357FF', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', 
  '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#06B6D4',
];

// Изолированный компонент поиска - не вызывает перерисовку родителя
const SearchInput = memo(function SearchInput({ 
  onSearch 
}: { 
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(newValue), 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="w-[232px] h-10 bg-[#212121] rounded-lg flex items-center gap-1 px-3">
      <Search className="w-4 h-4 text-[#717171] shrink-0" />
      <input
        type="text"
        placeholder="Поиск"
        value={value}
        onChange={handleChange}
        className="flex-1 bg-transparent text-white font-medium text-[12px] placeholder:text-[#717171] outline-none"
      />
    </div>
  );
});

// Карточка с ленивой загрузкой изображений
const UserCard = memo(function UserCard({ 
  user, 
  index, 
  onUserClick,
  onImportGenerations,
  isImporting,
}: { 
  user: WorkspaceUser; 
  index: number; 
  onUserClick: (userId: string) => void;
  onImportGenerations?: (userId: string) => void;
  isImporting?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = user.email.split('@')[0].substring(0, 2).toUpperCase();
  
  // Показываем кнопку импорта если:
  // - Нет превью (генераций в этом пространстве)
  // - Но есть генерации всего (в других пространствах)
  const canImportGenerations = user.previews.length === 0 && user.generations_count > 0;

  // Lazy load: показываем изображения только когда карточка видна
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Загружаем чуть раньше чем появится в viewport
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  
  const handleClick = useCallback(() => {
    onUserClick(user.id);
  }, [onUserClick, user.id]);

  const isVideo = (url?: string) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('.mp4') || u.includes('.webm') || u.includes('.mov');
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className="bg-[#101010] border border-[#353535] rounded-[20px] p-4 hover:border-[#454545] cursor-pointer"
    >
      {/* Превью генераций */}
      <div className="mb-4">
        {user.previews.length > 0 ? (
          <div className="flex gap-2 h-[170px]">
            {/* Большое превью слева */}
            <div className="flex-1 relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
              {isVisible && (
                isVideo(user.previews[0]) ? (
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    src={user.previews[0]}
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={user.previews[0]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )
              )}
            </div>
            
            {/* Колонка справа */}
            <div className="flex flex-col gap-2 w-[calc(50%-4px)]">
              <div className="flex-1 relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
                {isVisible && user.previews[1] && (
                  isVideo(user.previews[1]) ? (
                    <video
                      className="absolute inset-0 w-full h-full object-cover"
                      src={user.previews[1]}
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={user.previews[1]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )
                )}
              </div>
              
              <div className="flex-1 relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
                {isVisible && user.previews[2] && (
                  isVideo(user.previews[2]) ? (
                    <video
                      className="absolute inset-0 w-full h-full object-cover"
                      src={user.previews[2]}
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={user.previews[2]}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )
                )}
                {/* Оверлей */}
                {user.generations_count > 3 && (
                  <div className="absolute inset-0 bg-[#212121]/90 flex items-center justify-center">
                    <span className="font-inter font-normal text-[16px] text-[#DFDFDF]">
                      +{user.generations_count - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[170px] bg-[#1a1a1a] rounded-[12px] flex flex-col items-center justify-center gap-3">
            <span className="font-inter text-[13px] text-[#4d4d4d]">
              {canImportGenerations ? 'Генерации в другом пространстве' : 'Нет генераций'}
            </span>
            {canImportGenerations && onImportGenerations && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImportGenerations(user.id);
                }}
                disabled={isImporting}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[12px] text-white font-medium transition-colors disabled:opacity-50"
              >
                {isImporting ? 'Перенос...' : `Перенести ${user.generations_count} генераций`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Информация о пользователе */}
      <div className="flex items-center gap-[10px]">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          <span className="font-semibold text-[12px] text-white">
            {initials}
          </span>
        </div>
        
        <div className="min-w-0 flex flex-col gap-1">
          <p className="font-medium text-[14px] text-white truncate">
            {user.email}
          </p>
          <p className="font-medium text-[12px] text-[#717171]">
            {user.generations_count} генераций
          </p>
        </div>
      </div>
    </div>
  );
});

// Скелетон карточки для постепенной загрузки
const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="bg-[#101010] border border-[#353535] rounded-[20px] p-4">
      <div className="flex gap-2 h-[170px] mb-4">
        <div className="flex-1 bg-[#1a1a1a] rounded-[12px] animate-pulse" />
        <div className="flex flex-col gap-2 w-[calc(50%-4px)]">
          <div className="flex-1 bg-[#1a1a1a] rounded-[12px] animate-pulse" />
          <div className="flex-1 bg-[#1a1a1a] rounded-[12px] animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-[10px]">
        <div className="w-8 h-8 rounded-full bg-[#252525] animate-pulse" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-4 w-3/4 bg-[#252525] rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-[#252525] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
});

// Количество карточек в одной порции
const BATCH_SIZE = 8;

// Типы табов
type TabType = 'participants' | 'flows';

interface WorkspaceMember {
  id: string;
  email: string;
  name?: string;
}

export default function WorkspaceUsersPageClient({ workspaceId }: WorkspaceUsersPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'flows' ? 'flows' : 'participants';
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // Flows state
  const [flows, setFlows] = useState<Record<FlowWorkspaceStatus, FlowCard[]>>({
    in_progress: [],
    review: [],
    done: [],
    archived: [],
  });
  const [flowCounts, setFlowCounts] = useState<Record<FlowWorkspaceStatus, number>>({
    in_progress: 0,
    review: 0,
    done: 0,
    archived: 0,
  });
  const [isLoadingFlows, setIsLoadingFlows] = useState(false);
  
  // Import generations state
  const [importingUserId, setImportingUserId] = useState<string | null>(null);

  // Callback для поиска - стабильная ссылка
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setVisibleCount(BATCH_SIZE); // Сбрасываем при поиске
  }, []);

  // Фильтруем пользователей
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      user.name.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Видимые пользователи (загруженные порциями)
  const visibleUsers = useMemo(() => {
    return filteredUsers.slice(0, visibleCount);
  }, [filteredUsers, visibleCount]);

  // Количество скелетонов для показа
  const skeletonCount = useMemo(() => {
    const remaining = filteredUsers.length - visibleCount;
    return Math.min(Math.max(0, remaining), BATCH_SIZE);
  }, [filteredUsers.length, visibleCount]);

  // IntersectionObserver для подгрузки следующей порции
  useEffect(() => {
    if (visibleCount >= filteredUsers.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Загружаем следующую порцию с небольшой задержкой для плавности
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + BATCH_SIZE, filteredUsers.length));
          }, 100);
        }
      },
      { rootMargin: '200px' }
    );

    const current = loadMoreRef.current;
    if (current) observer.observe(current);

    return () => observer.disconnect();
  }, [visibleCount, filteredUsers.length]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/users`);
      if (response.ok) {
        const data = await response.json();
        setWorkspace(data.workspace);
        setUsers(data.users || []);
        // Формируем список участников для флоу-модалки
        const members = (data.users || []).map((u: WorkspaceUser) => ({
          id: u.id,
          email: u.email,
          name: u.name,
        }));
        setWorkspaceMembers(members);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, router]);

  const fetchFlows = useCallback(async () => {
    setIsLoadingFlows(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/flows`);
      if (response.ok) {
        const data = await response.json();
        setFlows(data.flows);
        setFlowCounts(data.counts);
      }
    } catch (error) {
      console.error('Fetch flows error:', error);
    } finally {
      setIsLoadingFlows(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Подгружаем флоу при переключении на таб
  useEffect(() => {
    if (activeTab === 'flows') {
      fetchFlows();
    }
  }, [activeTab, fetchFlows]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Обновляем URL без перезагрузки страницы
    const url = new URL(window.location.href);
    if (tab === 'flows') {
      url.searchParams.set('tab', 'flows');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleUserClick = useCallback((userId: string) => {
    // Переходим в историю с предустановленным фильтром по пользователю
    router.push(`/history?workspaceId=${workspaceId}&creatorId=${userId}&onlyMine=false`);
  }, [router, workspaceId]);

  // Импорт генераций пользователя в это пространство
  const handleImportGenerations = useCallback(async (userId: string) => {
    if (importingUserId) return;
    
    setImportingUserId(userId);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/import-user-generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Imported ${data.importedCount} generations`);
        // Перезагружаем список пользователей чтобы обновить превью
        fetchUsers();
      } else {
        const data = await response.json();
        console.error('Import failed:', data.error);
        alert(data.error || 'Ошибка импорта генераций');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Ошибка сети');
    } finally {
      setImportingUserId(null);
    }
  }, [workspaceId, importingUserId, fetchUsers]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#101010]">
        <Header />
        <main className="flex-1 px-4 lg:px-[80px] py-6">
          {/* Skeleton header row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex flex-col gap-3">
              <div className="h-5 w-40 bg-[#252525] rounded animate-pulse" />
              <div className="h-7 w-32 bg-[#252525] rounded animate-pulse" />
            </div>
            {/* Skeleton search */}
            <div className="h-10 w-[232px] bg-[#252525] rounded-lg animate-pulse" />
          </div>
          
          {/* Skeleton cards grid - gap 24px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#101010] border border-[#353535] rounded-[20px] p-4">
                {/* Skeleton preview */}
                <div className="flex gap-2 h-[170px] mb-4">
                  <div className="flex-1 bg-[#252525] rounded-[12px] animate-pulse" />
                  <div className="flex flex-col gap-2 w-[calc(50%-4px)]">
                    <div className="flex-1 bg-[#252525] rounded-[12px] animate-pulse" />
                    <div className="flex-1 bg-[#252525] rounded-[12px] animate-pulse" />
                  </div>
                </div>
                {/* Skeleton user info */}
                <div className="flex items-center gap-[10px]">
                  <div className="w-8 h-8 rounded-full bg-[#252525] animate-pulse" />
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-4 w-3/4 bg-[#252525] rounded animate-pulse" />
                    <div className="h-4 w-1/3 bg-[#252525] rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1 px-4 lg:px-[80px] py-6">
        {/* Header row: Breadcrumb + Title */}
        <div className="flex flex-col gap-3 mb-5">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[14px]">
            <Link 
              href="/workspaces" 
              className="text-[#717171] hover:text-white transition-colors"
            >
              Пространства
            </Link>
            <ChevronRight className="w-4 h-4 text-[#4d4d4d]" />
            <span className="text-white font-medium">{workspace?.name || 'Загрузка...'}</span>
          </div>
          
          {/* Заголовок */}
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            {workspace?.name || 'Загрузка...'}
          </h1>
        </div>

        {/* Tabs: Участники / Флоу (с подчёркиванием как в Figma) - Sticky */}
        <div className="sticky top-[56px] z-40 bg-[#101010] -mx-4 lg:-mx-[80px] px-4 lg:px-[80px] pt-2 pb-4 mb-2">
        <div className="flex items-end gap-3 border-b border-[#2e2e2e]">
          <button
            onClick={() => handleTabChange('participants')}
            className={`flex items-center gap-2 px-0 pb-[10px] font-inter text-[14px] transition-colors relative ${
              activeTab === 'participants'
                ? 'font-medium text-white'
                : 'font-normal text-[#959595] hover:text-white'
            }`}
          >
            <span>Участники</span>
            <span className="h-5 px-[6px] bg-[#2c2c2c] rounded-md flex items-center justify-center font-inter font-medium text-[10px] text-white">
              {users.length}
            </span>
            {activeTab === 'participants' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('flows')}
            className={`flex items-center gap-2 px-0 pb-[10px] font-inter text-[14px] transition-colors relative ${
              activeTab === 'flows'
                ? 'font-medium text-white'
                : 'font-normal text-[#959595] hover:text-white'
            }`}
          >
            <span>Флоу</span>
            <span className="h-5 px-[6px] bg-[#2c2c2c] rounded-md flex items-center justify-center font-inter font-medium text-[10px] text-white">
              {Object.values(flowCounts).reduce((a, b) => a + b, 0)}
            </span>
            {activeTab === 'flows' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
            )}
          </button>
        </div>
        </div>

        {/* Контент в зависимости от активного таба */}
        {activeTab === 'participants' ? (
          <>
            {/* Поиск для участников */}
            <div className="flex items-center justify-between mb-4">
              <SearchInput onSearch={handleSearch} />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="font-inter text-[14px] text-[#6D6D6D]">
                  {searchQuery 
                    ? 'Пользователи не найдены' 
                    : 'В этом пространстве пока нет участников с генерациями'}
                </p>
              </div>
            ) : (
              /* Grid карточек пользователей - 4 колонки, gap 24px как в Figma */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Загруженные карточки */}
                {visibleUsers.map((user, index) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    index={index}
                    onUserClick={handleUserClick}
                    onImportGenerations={handleImportGenerations}
                    isImporting={importingUserId === user.id}
                  />
                ))}
                
                {/* Скелетоны для ещё не загруженных */}
                {skeletonCount > 0 && (
                  <>
                    {Array.from({ length: skeletonCount }).map((_, i) => (
                      <CardSkeleton key={`skeleton-${i}`} />
                    ))}
                    {/* Триггер для подгрузки следующей порции */}
                    <div ref={loadMoreRef} className="col-span-full h-1" />
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          /* Kanban-доска для флоу */
          isLoadingFlows ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
          ) : (
            <WorkspaceFlowsKanban
              workspaceId={workspaceId}
              flows={flows}
              counts={flowCounts}
              workspaceMembers={workspaceMembers}
              onRefresh={fetchFlows}
            />
          )
        )}
      </main>
    </div>
  );
}
