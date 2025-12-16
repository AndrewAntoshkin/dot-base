'use client';

import { useEffect, useState, useMemo, useCallback, memo, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { ChevronRight, Search } from 'lucide-react';

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
  onUserClick 
}: { 
  user: WorkspaceUser; 
  index: number; 
  onUserClick: (userId: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = user.email.split('@')[0].substring(0, 2).toUpperCase();

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
                <img
                  src={user.previews[0]}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Колонка справа */}
            <div className="flex flex-col gap-2 w-[calc(50%-4px)]">
              <div className="flex-1 relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
                {isVisible && user.previews[1] && (
                  <img
                    src={user.previews[1]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              
              <div className="flex-1 relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
                {isVisible && user.previews[2] && (
                  <img
                    src={user.previews[2]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
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
          <div className="h-[170px] bg-[#1a1a1a] rounded-[12px] flex items-center justify-center">
            <span className="font-inter text-[13px] text-[#4d4d4d]">
              Нет генераций
            </span>
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

export default function WorkspaceUsersPageClient({ workspaceId }: WorkspaceUsersPageClientProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchUsers();
  }, [workspaceId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/users`);
      if (response.ok) {
        const data = await response.json();
        setWorkspace(data.workspace);
        setUsers(data.users || []);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = useCallback((userId: string) => {
    // Переходим в историю с предустановленным фильтром по пользователю
    router.push(`/history?workspaceId=${workspaceId}&creatorId=${userId}&onlyMine=false`);
  }, [router, workspaceId]);

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
        {/* Header row: Breadcrumb + Title | Search */}
        <div className="flex items-start justify-between mb-6">
          {/* Left: Breadcrumb + Title */}
          <div className="flex flex-col gap-3">
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
              Пользователи
            </h1>
          </div>

          {/* Right: Search field - isolated component */}
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
      </main>
    </div>
  );
}
