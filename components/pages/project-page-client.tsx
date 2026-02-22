'use client';

import { useEffect, useState, useCallback, memo, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { ChevronRight, Search, Plus, Trash2, Image as ImageIcon, Film, Workflow, UserPlus } from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import type { FlowCard } from '@/lib/flow/types';

type TabType = 'images' | 'video' | 'flow' | 'members';

const AVATAR_COLORS = [
  '#7357FF', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#06B6D4',
];

interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  created_at: string;
  updated_at: string;
  member_count: number;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
  name: string;
  global_role: string;
}

interface AvailableMember {
  id: string;
  email: string;
  name: string;
}

interface Generation {
  id: string;
  action: string;
  model_name: string;
  prompt: string | null;
  status: string;
  output_urls: string[] | null;
  output_thumbs: string[] | null;
  created_at: string;
}

interface ProjectPageClientProps {
  projectId: string;
}

// ---- Generation Card ----
const GenerationCard = memo(function GenerationCard({
  gen,
  onClick,
}: {
  gen: Generation;
  onClick: () => void;
}) {
  const thumbUrl = gen.output_thumbs?.[0] || gen.output_urls?.[0];
  const isVideo = gen.action.startsWith('video_');

  return (
    <div
      onClick={onClick}
      className="relative bg-[#1a1a1a] rounded-[12px] overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all group aspect-square"
    >
      {thumbUrl ? (
        isVideo ? (
          <video
            src={thumbUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        ) : (
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#4d4d4d]">
          {isVideo ? <Film className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
        </div>
      )}

      {isVideo && thumbUrl && (
        <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5">
          <Film className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
});

// ---- Member Card ----
const MemberCard = memo(function MemberCard({
  member,
  index,
  canManage,
  onRemove,
}: {
  member: ProjectMember;
  index: number;
  canManage: boolean;
  onRemove: (userId: string) => void;
}) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = (member.name || member.email?.split('@')[0] || '??').substring(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1f1f1f] last:border-b-0">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: color }}
        >
          <span className="font-semibold text-[12px] text-white">{initials}</span>
        </div>
        <div>
          <p className="font-inter text-[14px] text-white">{member.name || member.email}</p>
          <p className="font-inter text-[12px] text-[#717171]">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-[#2c2c2c] rounded-md font-inter text-[11px] text-[#959595]">
          {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Админ' : 'Участник'}
        </span>
        {canManage && member.role !== 'owner' && (
          <button
            onClick={() => onRemove(member.user_id)}
            className="p-1.5 rounded-lg hover:bg-[#252525] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#717171]" />
          </button>
        )}
      </div>
    </div>
  );
});

export default function ProjectPageClient({ projectId }: ProjectPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useUser();

  const tabParam = searchParams.get('tab');
  const initialTab: TabType = (tabParam as TabType) || 'images';

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Content state
  const [images, setImages] = useState<Generation[]>([]);
  const [videos, setVideos] = useState<Generation[]>([]);
  const [flows, setFlows] = useState<FlowCard[]>([]);
  const [imagesTotalCount, setImagesTotalCount] = useState(0);
  const [videosTotalCount, setVideosTotalCount] = useState(0);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Description sheet state
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  // Adding member
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // Fetch project details
  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setMembers(data.members);
        setCanManage(data.current_user.can_manage);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Fetch project error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Fetch content based on active tab
  const fetchImages = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generations?type=image&limit=60`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.generations || []);
        setImagesTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Fetch images error:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  const fetchVideos = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generations?type=video&limit=60`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.generations || []);
        setVideosTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Fetch videos error:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  const fetchFlows = useCallback(async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/flows`);
      if (res.ok) {
        const data = await res.json();
        setFlows(data.flows || []);
      }
    } catch (error) {
      console.error('Fetch flows error:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, [projectId]);

  const fetchMembersData = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setAvailableMembers(data.available_members || []);
        setCanManage(data.can_manage);
      }
    } catch (error) {
      console.error('Fetch members error:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'images') fetchImages();
    else if (activeTab === 'video') fetchVideos();
    else if (activeTab === 'flow') fetchFlows();
    else if (activeTab === 'members') fetchMembersData();
  }, [activeTab, fetchImages, fetchVideos, fetchFlows, fetchMembersData]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'images') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleAddMember = useCallback(async (userId: string) => {
    setAddingMemberId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        fetchMembersData();
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Add member error:', error);
    } finally {
      setAddingMemberId(null);
    }
  }, [projectId, fetchMembersData]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembersData();
      }
    } catch (error) {
      console.error('Remove member error:', error);
    }
  }, [projectId, fetchMembersData]);

  const handleGenerationClick = useCallback((gen: Generation) => {
    if (gen.action.startsWith('video_')) {
      router.push(`/video?generationId=${gen.id}`);
    } else {
      router.push(`/?generationId=${gen.id}`);
    }
  }, [router]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="flex-1 px-4 lg:px-[80px] py-6">
          <div className="flex flex-col gap-3 mb-5">
            <div className="h-5 w-40 bg-[#252525] rounded animate-pulse" />
            <div className="h-7 w-56 bg-[#252525] rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-[#252525] rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-[#1a1a1a] rounded-[12px] animate-pulse" />
            ))}
          </div>
        </main>
      </AppShell>
    );
  }

  if (!project) return null;

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'images', label: 'Изображения', count: imagesTotalCount },
    { id: 'video', label: 'Видео', count: videosTotalCount },
    { id: 'flow', label: 'Flow', count: flows.length },
  ];

  if (isAdmin) {
    tabs.push({ id: 'members', label: 'Участники', count: members.length });
  }

  return (
    <AppShell>
      <main className="flex-1 px-4 lg:px-[80px] py-6">
        {/* Header: Breadcrumb + Project name */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/workspaces" className="text-[#717171] hover:text-white transition-colors">
              Пространства
            </Link>
            <ChevronRight className="w-4 h-4 text-[#4d4d4d]" />
            <Link
              href={`/workspaces/${project.workspace_slug}`}
              className="text-[#717171] hover:text-white transition-colors"
            >
              {project.workspace_name}
            </Link>
            <ChevronRight className="w-4 h-4 text-[#4d4d4d]" />
            <span className="text-white font-medium">{project.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-inter font-semibold text-[20px] text-white tracking-[-0.4px] leading-[28px]">
                {project.name}
              </h1>
              <button
                onClick={() => setIsDescriptionOpen(true)}
                className="font-inter text-[13px] text-[#717171] hover:text-white transition-colors mt-1"
              >
                Описание
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[56px] z-40 bg-[#101010] -mx-4 lg:-mx-[80px] px-4 lg:px-[80px] pt-2 pb-4 mb-2">
          <div className="flex items-end gap-3 border-b border-[#2e2e2e]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-0 pb-[10px] font-inter text-[14px] transition-colors relative ${
                  activeTab === tab.id
                    ? 'font-medium text-white'
                    : 'font-normal text-[#959595] hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="h-5 px-[6px] bg-[#2c2c2c] rounded-md flex items-center justify-center font-inter font-medium text-[10px] text-white">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'images' && (
          <div>
            {isLoadingContent ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[#1a1a1a] rounded-[12px] animate-pulse" />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <ImageIcon className="w-12 h-12 text-[#4d4d4d] mb-4" />
                <p className="font-inter text-[14px] text-[#6d6d6d]">
                  В этом проекте пока нет изображений
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {images.map(gen => (
                  <GenerationCard
                    key={gen.id}
                    gen={gen}
                    onClick={() => handleGenerationClick(gen)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div>
            {isLoadingContent ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[#1a1a1a] rounded-[12px] animate-pulse" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <Film className="w-12 h-12 text-[#4d4d4d] mb-4" />
                <p className="font-inter text-[14px] text-[#6d6d6d]">
                  В этом проекте пока нет видео
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {videos.map(gen => (
                  <GenerationCard
                    key={gen.id}
                    gen={gen}
                    onClick={() => handleGenerationClick(gen)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'flow' && (
          <div>
            {isLoadingContent ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[120px] bg-[#1a1a1a] rounded-[16px] animate-pulse" />
                ))}
              </div>
            ) : flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <Workflow className="w-12 h-12 text-[#4d4d4d] mb-4" />
                <p className="font-inter text-[14px] text-[#6d6d6d]">
                  В этом проекте пока нет Flow
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flows.map(flow => (
                  <div
                    key={flow.id}
                    onClick={() => router.push(`/flow?id=${flow.id}`)}
                    className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-[16px] p-4 hover:border-[#3a3a3a] cursor-pointer transition-colors"
                  >
                    <h3 className="font-inter font-medium text-[15px] text-white mb-1 truncate">
                      {flow.name}
                    </h3>
                    {flow.description && (
                      <p className="font-inter text-[13px] text-[#717171] mb-3 line-clamp-2">
                        {flow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[12px] text-[#6d6d6d]">
                      <span>{flow.node_count || 0} блоков</span>
                      <span>{flow.members?.length || 0} участников</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && isAdmin && (
          <div>
            {/* Add member button */}
            {canManage && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center gap-2 px-4 h-10 rounded-xl border border-[#2f2f2f] font-inter font-medium text-[14px] text-white hover:bg-[#1f1f1f] transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Добавить участника
                </button>

                {showAddMember && (
                  <div className="mt-3 bg-[#1a1a1a] border border-[#2e2e2e] rounded-[16px] p-4 max-h-[300px] overflow-y-auto">
                    {availableMembers.length === 0 ? (
                      <p className="font-inter text-[13px] text-[#6d6d6d]">
                        Все участники пространства уже добавлены в проект
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {availableMembers.map((user, idx) => (
                          <button
                            key={user.id}
                            onClick={() => handleAddMember(user.id)}
                            disabled={addingMemberId === user.id}
                            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[#252525] transition-colors text-left disabled:opacity-50"
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                            >
                              <span className="font-semibold text-[11px] text-white">
                                {(user.name || user.email).substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-inter text-[14px] text-white truncate">{user.name}</p>
                              <p className="font-inter text-[12px] text-[#717171] truncate">{user.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoadingMembers ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 bg-[#252525] rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-[#252525] rounded animate-pulse mb-1" />
                      <div className="h-3 w-48 bg-[#252525] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <p className="font-inter text-[14px] text-[#6d6d6d]">Нет участников</p>
              </div>
            ) : (
              <div className="max-w-[600px]">
                {members.map((member, idx) => (
                  <MemberCard
                    key={member.user_id}
                    member={member}
                    index={idx}
                    canManage={canManage}
                    onRemove={handleRemoveMember}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Description Side Sheet */}
      {isDescriptionOpen && project && (
        <ProjectDescriptionSheetLazy
          projectId={project.id}
          initialName={project.name}
          initialDescription={project.description}
          initialCoverUrl={project.cover_url}
          onClose={() => setIsDescriptionOpen(false)}
          onUpdate={(updates) => {
            setProject(prev => prev ? { ...prev, ...updates } : prev);
          }}
        />
      )}
    </AppShell>
  );
}

// Lazy-loaded description sheet to avoid circular import
function ProjectDescriptionSheetLazy(props: {
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialCoverUrl: string | null;
  onClose: () => void;
  onUpdate: (updates: Partial<ProjectDetail>) => void;
}) {
  const [Sheet, setSheet] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('@/components/project-description-sheet').then(mod => {
      setSheet(() => mod.ProjectDescriptionSheet);
    });
  }, []);

  if (!Sheet) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50" onClick={props.onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-[#101010] border-l border-[#2e2e2e] flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  return <Sheet {...props} />;
}
