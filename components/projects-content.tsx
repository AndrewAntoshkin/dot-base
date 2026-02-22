'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, Image as ImageIcon, Film, Workflow } from 'lucide-react';
import { ProjectCreateModal } from '@/components/project-create-modal';
import { useUser } from '@/contexts/user-context';

interface ProjectMember {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  created_at: string;
  member_count: number;
  images_count: number;
  videos_count: number;
  flows_count: number;
  members: ProjectMember[];
}

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

interface ProjectsContentProps {
  workspaceId?: string;
  showHeader?: boolean;
}

export default function ProjectsContent({
  workspaceId,
  showHeader = true,
}: ProjectsContentProps) {
  const router = useRouter();
  const { workspaces } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  const fetchProjects = async () => {
    try {
      const url = workspaceId
        ? `/api/projects?workspace_id=${workspaceId}`
        : '/api/projects';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Fetch projects error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = (project: any) => {
    setProjects(prev => [project, ...prev]);
    setIsCreateModalOpen(false);
  };

  if (!isLoading && projects.length === 0) {
    return (
      <>
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
              Проекты
            </h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors"
            >
              Новый проект
            </button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="mb-4">
            <svg width="68" height="64" viewBox="0 0 68 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="10" width="48" height="44" rx="8" stroke="#6D6D6D" strokeWidth="2"/>
              <path d="M34 24V40M26 32H42" stroke="#6D6D6D" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="font-inter text-[14px] text-[#6D6D6D] mb-4">
            Здесь пока нет проектов
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Новый проект
          </button>
        </div>

        {isCreateModalOpen && (
          <ProjectCreateModal
            workspaceId={workspaceId}
            workspaces={workspaces}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </>
    );
  }

  return (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
            Проекты
          </h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors"
          >
            Новый проект
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#101010] border border-[#2e2e2e] rounded-[20px] overflow-hidden">
              <div className="h-[140px] bg-[#1a1a1a] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-32 bg-[#252525] rounded animate-pulse" />
                <div className="h-4 w-24 bg-[#252525] rounded animate-pulse" />
                <div className="flex items-center gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="w-7 h-7 bg-[#252525] rounded-full animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project, index) => {
            const totalContent = project.images_count + project.videos_count + project.flows_count;
            const displayMembers = project.members?.slice(0, 3) || [];
            const remainingCount = project.member_count - displayMembers.length;

            return (
              <div
                key={project.id}
                className="bg-[#101010] border border-[#2e2e2e] rounded-[20px] overflow-hidden hover:border-[#3a3a3a] transition-colors cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                {/* Cover */}
                <div className="h-[140px] bg-[#1a1a1a] relative">
                  {project.cover_url ? (
                    <img
                      src={project.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex items-center gap-4 text-[#4d4d4d]">
                        <ImageIcon className="w-5 h-5" />
                        <Film className="w-5 h-5" />
                        <Workflow className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  {/* Menu */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === project.id ? null : project.id);
                      }}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-white" />
                    </button>

                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            router.push(`/projects/${project.id}`);
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-[#252525]"
                        >
                          Открыть
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-inter font-semibold text-[15px] text-white mb-1 truncate">
                    {project.name}
                  </h3>

                  {!workspaceId && (
                    <p className="font-inter text-[12px] text-[#6d6d6d] mb-3 truncate">
                      {project.workspace_name}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[12px] text-[#6d6d6d] mb-3">
                    {project.images_count > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {project.images_count}
                      </span>
                    )}
                    {project.videos_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" />
                        {project.videos_count}
                      </span>
                    )}
                    {project.flows_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5" />
                        {project.flows_count}
                      </span>
                    )}
                    {totalContent === 0 && (
                      <span>Пока пусто</span>
                    )}
                  </div>

                  {/* Avatars */}
                  <div className="flex items-center -space-x-2">
                    {displayMembers.map((member, idx) => (
                      <div
                        key={member.id}
                        className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#101010]"
                        style={{ backgroundColor: getAvatarColor(idx) }}
                      >
                        <span className="font-inter font-semibold text-[9px] text-white">
                          {getInitials(member.name)}
                        </span>
                      </div>
                    ))}
                    {remainingCount > 0 && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#101010] bg-[#2a2a2a]">
                        <span className="font-inter font-semibold text-[9px] text-[#8c8c8c]">
                          +{remainingCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCreateModalOpen && (
        <ProjectCreateModal
          workspaceId={workspaceId}
          workspaces={workspaces}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
