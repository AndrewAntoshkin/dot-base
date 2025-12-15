'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Loader2, ChevronRight } from 'lucide-react';

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

// Цвета для аватаров
const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

export default function WorkspaceUsersPageClient({ workspaceId }: WorkspaceUsersPageClientProps) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleUserClick = (userId: string) => {
    // Переходим в историю с предустановленным фильтром по пользователю
    router.push(`/history?workspaceId=${workspaceId}&creatorId=${userId}&onlyMine=false`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#101010]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1 px-4 lg:px-[80px] py-6">
        {/* Breadcrumb + заголовок */}
        <div className="flex flex-col gap-1 mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[14px]">
            <Link 
              href="/workspaces" 
              className="text-[#717171] hover:text-white transition-colors"
            >
              Пространства
            </Link>
            <ChevronRight className="w-4 h-4 text-[#4d4d4d]" />
            <span className="text-white">{workspace?.name || 'Загрузка...'}</span>
          </div>
          
          {/* Заголовок */}
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            Пользователи
          </h1>
        </div>

        {users.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="font-inter text-[14px] text-[#6D6D6D]">
              В этом пространстве пока нет участников с генерациями
            </p>
          </div>
        ) : (
          /* Grid карточек пользователей */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user, index) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user.id)}
                className="bg-[#101010] border border-[#2e2e2e] rounded-[20px] p-4 hover:border-[#3a3a3a] transition-colors cursor-pointer"
              >
                {/* Grid превью генераций */}
                <div className="relative mb-4">
                  {user.previews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5 aspect-square">
                      {/* Первые 3 превью */}
                      {user.previews.slice(0, 3).map((url, idx) => (
                        <div
                          key={idx}
                          className="relative bg-[#1a1a1a] rounded-[12px] overflow-hidden"
                        >
                          <img
                            src={url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      
                      {/* 4я ячейка - либо превью, либо +N */}
                      <div className="relative bg-[#1a1a1a] rounded-[12px] overflow-hidden">
                        {user.previews.length >= 4 ? (
                          <>
                            <img
                              src={user.previews[3]}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                            />
                            {/* Оверлей с +N если генераций больше 4 */}
                            {user.generations_count > 4 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="font-inter font-semibold text-[14px] text-white">
                                  +{user.generations_count - 4}
                                </span>
                              </div>
                            )}
                          </>
                        ) : user.previews.length === 3 ? (
                          // Пустая ячейка если только 3 превью
                          <div className="absolute inset-0 bg-[#1a1a1a]" />
                        ) : (
                          <div className="absolute inset-0 bg-[#1a1a1a]" />
                        )}
                      </div>
                      
                      {/* Заполняем пустые ячейки если меньше 3 превью */}
                      {user.previews.length < 3 && 
                        Array.from({ length: 3 - user.previews.length }).map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="relative bg-[#1a1a1a] rounded-[12px]"
                          />
                        ))
                      }
                    </div>
                  ) : (
                    // Пустое состояние - нет генераций
                    <div className="aspect-square bg-[#1a1a1a] rounded-[12px] flex items-center justify-center">
                      <span className="font-inter text-[13px] text-[#4d4d4d]">
                        Нет генераций
                      </span>
                    </div>
                  )}
                </div>

                {/* Информация о пользователе */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: getAvatarColor(index) }}
                  >
                    <span className="font-inter font-semibold text-[12px] text-white">
                      {getInitials(user.name)}
                    </span>
                  </div>
                  
                  {/* Имя и количество генераций */}
                  <div className="min-w-0">
                    <p className="font-inter font-medium text-[14px] text-white truncate">
                      {user.email}
                    </p>
                    <p className="font-inter text-[13px] text-[#6d6d6d]">
                      {user.generations_count} генераци{user.generations_count === 1 ? 'я' : user.generations_count < 5 ? 'и' : 'й'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
