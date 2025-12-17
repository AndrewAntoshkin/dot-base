'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical } from 'lucide-react';
import { WorkspaceCreateModal } from '@/components/workspace-create-modal';
import { WorkspaceEditModal } from '@/components/workspace-edit-modal';

interface WorkspaceMember {
  id: string;
  name: string;
  color?: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  member_role: string;
  member_count: number;
  generations_count?: number;
  members?: WorkspaceMember[];
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

interface WorkspacesContentProps {
  showHeader?: boolean;
  onCreateClick?: () => void;
  isCreateModalControlled?: boolean;
}

export default function WorkspacesContent({ 
  showHeader = true,
  onCreateClick,
  isCreateModalControlled = false,
}: WorkspacesContentProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [userRole, setUserRole] = useState<string>('user');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const canCreateWorkspace = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
        setUserRole(data.user_role || 'user');
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch workspaces error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = (workspace: Workspace) => {
    setWorkspaces(prev => [...prev, workspace]);
    setIsCreateModalOpen(false);
  };

  const handleEditSuccess = (updatedWorkspace: Workspace) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === updatedWorkspace.id ? { ...ws, ...updatedWorkspace } : ws
    ));
    setEditingWorkspace(null);
  };

  const handleOpenCreateModal = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  // Пустое состояние для не-админов
  if (!isLoading && !canCreateWorkspace && workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4">
            <svg width="68" height="64" viewBox="0 0 68 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
              <rect x="10" y="10" width="48" height="44" rx="8" stroke="#6D6D6D" strokeWidth="2"/>
              <path d="M22 30L34 42L46 30" stroke="#6D6D6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="font-inter text-[14px] text-[#6D6D6D] mb-4">
            Вы ещё не добавлены ни в одно пространство
          </p>
          <p className="font-inter text-[12px] text-[#4D4D4D]">
            Обратитесь к администратору для получения доступа
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Заголовок (опционально) */}
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            Пространства
          </h1>
          
          {canCreateWorkspace && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors"
            >
              Новое пространство
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        // Skeleton cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#101010] border border-[#2e2e2e] rounded-[20px] p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                  <div className="h-4 w-24 bg-[#252525] rounded relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                </div>
                <div className="h-8 w-8 bg-[#252525] rounded-lg relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-8 h-8 bg-[#252525] rounded-full relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        // Пустое состояние для админов
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="mb-4">
            <svg width="68" height="64" viewBox="0 0 68 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="10" width="48" height="44" rx="8" stroke="#6D6D6D" strokeWidth="2"/>
              <path d="M34 24V40M26 32H42" stroke="#6D6D6D" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-inter text-[14px] text-[#6D6D6D] mb-4">
            Здесь пока пусто – пора создавать
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Новое пространство
          </button>
        </div>
      ) : (
        // Список пространств - сетка 4 колонки
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {workspaces.map((workspace, wsIndex) => {
            const generationsCount = workspace.generations_count || 0;
            const displayMembers = workspace.members?.slice(0, 3) || [];
            const remainingCount = workspace.member_count - displayMembers.length;
            
            return (
              <div
                key={workspace.id}
                className="bg-[#101010] border border-[#2e2e2e] rounded-[20px] p-5 hover:border-[#3a3a3a] transition-colors cursor-pointer"
                onClick={() => router.push(`/workspaces/${workspace.slug}`)}
              >
                {/* Верхняя часть: название + проекты + меню */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-inter font-semibold text-[16px] text-white mb-0.5 truncate">
                      {workspace.name}
                    </h3>
                    <p className="font-inter text-[13px] text-[#6d6d6d]">
                      {generationsCount} генераци{generationsCount === 1 ? 'я' : generationsCount < 5 ? 'и' : 'й'}
                    </p>
                  </div>
                  
                  {/* Иконка меню (три точки) */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === workspace.id ? null : workspace.id);
                      }}
                      className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-[#6d6d6d]" />
                    </button>
                    
                    {/* Dropdown меню */}
                    {menuOpen === workspace.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            router.push(`/workspaces/${workspace.slug}`);
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-[#252525]"
                        >
                          Пользователи
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            router.push(`/history?workspaceId=${workspace.id}&onlyMine=false`);
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-[#252525]"
                        >
                          Все генерации
                        </button>
                        {['owner', 'admin'].includes(workspace.member_role) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(null);
                              setEditingWorkspace(workspace);
                            }}
                            className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-[#252525]"
                          >
                            Редактировать
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Avatar group участников */}
                <div className="flex items-center -space-x-2">
                  {/* Показываем первых 3 участников */}
                  {displayMembers.length > 0 ? (
                    displayMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#101010]"
                        style={{ backgroundColor: member.color || getAvatarColor(idx) }}
                      >
                        <span className="font-inter font-semibold text-[10px] text-white">
                          {getInitials(member.name)}
                        </span>
                      </div>
                    ))
                  ) : (
                    // Fallback: показываем placeholder аватары
                    Array.from({ length: Math.min(workspace.member_count, 3) }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#101010]"
                        style={{ backgroundColor: getAvatarColor(wsIndex * 3 + idx) }}
                      >
                        <span className="font-inter font-semibold text-[10px] text-white">
                          ??
                        </span>
                      </div>
                    ))
                  )}
                  
                  {/* Счётчик остальных участников */}
                  {remainingCount > 0 && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#101010] bg-[#2a2a2a]">
                      <span className="font-inter font-semibold text-[10px] text-[#8c8c8c]">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка создания */}
      {!isCreateModalControlled && isCreateModalOpen && (
        <WorkspaceCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Модалка редактирования */}
      {editingWorkspace && (
        <WorkspaceEditModal
          workspace={editingWorkspace}
          onClose={() => setEditingWorkspace(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}

