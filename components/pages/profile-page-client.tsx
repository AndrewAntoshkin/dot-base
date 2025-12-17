'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Loader2, Download, Play, Trash2, Type, RefreshCw, ChevronDown, X, Camera, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';

// Types
interface Generation {
  id: string;
  user_id: string;
  action: string;
  model_name: string;
  status: string;
  output_urls: string[] | null;
  prompt: string | null;
  created_at: string;
  is_favorite: boolean;
  error_message?: string | null;
}

interface FilterOption {
  value: string;
  label: string;
}

interface TabCounts {
  all: number;
  processing: number;
  favorites: number;
  failed: number;
}

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: string;
  created_at: string;
}

type TabType = 'all' | 'processing' | 'favorites' | 'failed';

const TABS: { id: TabType; label: string }[] = [
  { id: 'all', label: 'Все генерации' },
  { id: 'processing', label: 'В работе' },
  { id: 'favorites', label: 'Избранные' },
  { id: 'failed', label: 'Ошибки' },
];

// Filter options
const DATE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Все время' },
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'week', label: 'Последняя неделя' },
  { value: 'month', label: 'Последний месяц' },
];

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

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Все статусы' },
  { value: 'succeeded', label: 'Успешные' },
  { value: 'processing', label: 'В процессе' },
  { value: 'pending', label: 'Ожидание' },
  { value: 'failed', label: 'Ошибка' },
];

// Helpers
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

function formatDateCustom(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} / ${hours}:${minutes}`;
}

function getInitials(email: string | null, name: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'U';
}

// Icons
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

// Filter Dropdown Component
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

// Workspace Dropdown Component
interface WorkspaceDropdownProps {
  workspaces: { id: string; name: string; slug: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function WorkspaceDropdown({ workspaces, selectedId, onSelect, isOpen, onToggle }: WorkspaceDropdownProps) {
  const selected = workspaces.find(w => w.id === selectedId);
  
  if (workspaces.length <= 1) return null;
  
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-normal bg-[#2c2c2c] text-white transition-colors hover:bg-[#3a3a3a]"
      >
        <span className="whitespace-nowrap">{selected?.name || 'Пространство'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-[10px] shadow-lg z-50 py-1 max-h-[300px] overflow-y-auto">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(workspace.id);
                onToggle();
              }}
              className={`
                w-full text-left px-3 py-2 text-[13px] transition-colors
                ${workspace.id === selectedId 
                  ? 'bg-[#2c2c2c] text-white' 
                  : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                }
              `}
            >
              {workspace.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Profile Edit Modal
interface ProfileEditModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: { display_name?: string; avatar_url?: string; cover_url?: string }) => Promise<void>;
}

function ProfileEditModal({ profile, onClose, onSave }: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ display_name: displayName || undefined });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a1a1a] rounded-3xl p-6 z-50">
        <h2 className="font-inter font-semibold text-xl text-white mb-6">Редактировать профиль</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block font-inter text-sm text-[#959595] mb-2">Имя</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={profile.email || 'Ваше имя'}
              className="w-full px-4 py-3 bg-[#252525] border border-[#3a3a3a] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#535353]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#252525] rounded-xl font-inter font-medium text-sm text-white hover:bg-[#2f2f2f] transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-white rounded-xl font-inter font-medium text-sm text-black hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </>
  );
}

// Main Component
export default function ProfilePageClient({ userEmail }: { userEmail: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabaseRef = useRef(createClient());
  
  const { email, setEmail, workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useUser();
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Generations state
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [counts, setCounts] = useState<TabCounts>({ all: 0, processing: 0, favorites: 0, failed: 0 });
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  
  // Filter states
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<FilterOption[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Fetch generations
  const fetchGenerations = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        tab: activeTab,
        onlyMine: 'true',
      });
      
      if (selectedWorkspaceId) params.set('workspaceId', selectedWorkspaceId);
      if (filterDate) params.set('dateRange', filterDate);
      if (filterModel) params.set('modelName', filterModel);
      if (filterType) params.set('actionType', filterType);
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/generations/list?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setTotalPages(data.totalPages || 1);
        if (data.counts) setCounts(data.counts);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [page, activeTab, selectedWorkspaceId, filterDate, filterModel, filterType, filterStatus]);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    if (!selectedWorkspaceId) return;
    try {
      const response = await fetch(`/api/generations/filter-options?workspaceId=${selectedWorkspaceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          setAvailableModels([
            { value: '', label: 'Все модели' },
            ...data.models.map((m: string) => ({ value: m, label: m }))
          ]);
        }
      }
    } catch (error) {
      console.error('Filter options error:', error);
    }
  }, [selectedWorkspaceId]);

  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);
  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);
  useEffect(() => { setPage(1); }, [activeTab, filterDate, filterModel, filterType, filterStatus]);
  
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setEmail(null);
      router.push('/login');
      router.refresh();
    }
  };

  const handleProfileUpdate = async (data: { display_name?: string; avatar_url?: string; cover_url?: string }) => {
    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      const result = await response.json();
      setProfile(result.profile);
    }
  };

  const handleImageUpload = async (file: File, type: 'avatar' | 'cover') => {
    const setUploading = type === 'avatar' ? setIsUploadingAvatar : setIsUploadingCover;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('files', file);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) throw new Error('Upload failed');
      
      const { urls } = await uploadResponse.json();
      if (urls && urls[0]) {
        await handleProfileUpdate(type === 'avatar' ? { avatar_url: urls[0] } : { cover_url: urls[0] });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

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
        setGenerations(prev => prev.map(g => g.id === id ? { ...g, is_favorite: data.is_favorite } : g));
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
        setGenerations(prev => prev.map(g => g.id === id ? { ...g, status: 'processing', error_message: null } : g));
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

  const resetFilters = () => {
    setFilterDate('');
    setFilterModel('');
    setFilterType('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterDate || filterModel || filterType || filterStatus;
  const displayName = profile?.display_name || profile?.email || userEmail || 'Пользователь';
  const displayEmail = profile?.email || userEmail || '';
  const initials = getInitials(displayEmail, profile?.display_name || null);

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1">
        {/* Profile Header Section */}
        <div className="relative">
          {/* Cover Image */}
          <div className="relative h-[320px] mx-4 lg:mx-20 mt-4 rounded-3xl overflow-hidden bg-[#1a1a1a] group">
            {profile?.cover_url ? (
              <img 
                src={profile.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]" />
            )}
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200" />
            
            {/* Edit Cover Button */}
            <label className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'cover');
                }}
                disabled={isUploadingCover}
              />
              <div className="flex items-center gap-2 px-3 py-2 bg-[#1f1f1f] rounded-xl text-white font-inter font-medium text-xs hover:bg-[#2a2a2a] transition-colors">
                {isUploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Pencil className="w-4 h-4" />
                )}
                <span>Редактировать</span>
              </div>
            </label>
          </div>

          {/* Avatar */}
          <div className="absolute left-4 lg:left-[136px] bottom-0 translate-y-1/2">
            <div className="relative">
              <div 
                className="w-[160px] h-[160px] rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                style={{ border: '8px solid #101010' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-5xl font-semibold">{initials}</span>
                )}
              </div>
              
              {/* Edit Avatar Button */}
              <label className="absolute bottom-2 right-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'avatar');
                  }}
                  disabled={isUploadingAvatar}
                />
                <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center hover:bg-[#2a2a2a] transition-colors border-2 border-[#101010]">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="px-4 lg:px-20 mt-[100px]">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Name and Email */}
            <div className="flex flex-col gap-1">
              <h1 className="font-inter font-semibold text-[28px] leading-[36px] tracking-[-0.02em] text-white">
                {displayName}
              </h1>
              <div className="flex items-center gap-3 text-[#8c8c8c] font-inter text-sm">
                <span>{displayEmail}</span>
                <span>•</span>
                <span>Корпоративный аккаунт</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-2 h-8 bg-[#1f1f1f] rounded-xl flex items-center justify-center font-inter font-medium text-xs text-white hover:bg-[#2a2a2a] transition-colors"
              >
                Редактировать
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 h-8 bg-[#1f1f1f] rounded-xl flex items-center justify-center font-inter font-medium text-xs text-white hover:bg-[#2a2a2a] transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="px-4 lg:px-20 py-6">
          {/* Tabs and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Tabs */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide border-b border-[#2e2e2e] pb-0">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                const count = counts[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-[10px] px-0 shrink-0 ${isActive ? 'border-b-2 border-white' : 'border-b-2 border-transparent'}`}
                  >
                    <div className="flex items-center gap-2 py-1">
                      <span className={`font-inter text-[14px] leading-[20px] whitespace-nowrap ${isActive ? 'font-medium text-white' : 'font-normal text-[#959595]'}`}>
                        {tab.label}
                      </span>
                      <div className="bg-[#2c2c2c] min-w-[20px] h-[20px] rounded-[6px] flex items-center justify-center px-1.5">
                        <span className="font-inter font-medium text-[10px] text-white leading-[20px]">{count}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Workspace Selector */}
              <WorkspaceDropdown
                workspaces={workspaces}
                selectedId={selectedWorkspaceId}
                onSelect={setSelectedWorkspaceId}
                isOpen={openDropdown === 'workspace'}
                onToggle={() => setOpenDropdown(openDropdown === 'workspace' ? null : 'workspace')}
              />
              
              <FilterDropdown
                label="Дата создания"
                value={filterDate}
                options={DATE_OPTIONS}
                onChange={setFilterDate}
                isOpen={openDropdown === 'date'}
                onToggle={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
              />
              
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
              
              <FilterDropdown
                label="Тип"
                value={filterType}
                options={TYPE_OPTIONS}
                onChange={setFilterType}
                isOpen={openDropdown === 'type'}
                onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
              />
              
              <FilterDropdown
                label="Статус"
                value={filterStatus}
                options={STATUS_OPTIONS}
                onChange={setFilterStatus}
                isOpen={openDropdown === 'status'}
                onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              />
              
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

          {/* Generations Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="border border-[#252525] rounded-[16px] p-1">
                  <div className="relative aspect-square rounded-[12px] overflow-hidden bg-[#252525] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#3a3a3a] before:to-transparent" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 w-3/4 bg-[#252525] rounded" />
                    <div className="h-3 w-1/2 bg-[#252525] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="font-inter text-base text-[#8c8c8c] mb-6">
                  {activeTab === 'all' ? 'У вас пока нет генераций' :
                   activeTab === 'processing' ? 'Нет активных генераций' :
                   activeTab === 'favorites' ? 'Нет избранных генераций' : 'Нет ошибок'}
                </p>
                {activeTab === 'all' && (
                  <Link href="/" className="inline-block bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white">
                    Создать первую генерацию
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {generations.map((generation) => {
                  const isFailed = generation.status === 'failed';
                  const isRetrying = retryingIds.has(generation.id);
                  
                  return (
                    <div
                      key={generation.id}
                      className={`border rounded-[16px] cursor-pointer transition-colors ${isFailed ? 'border-[#ff4949] hover:border-[#ff6666]' : 'border-[#252525] hover:border-[#3a3a3a]'}`}
                      onClick={() => handleClick(generation)}
                    >
                      <div className="p-1 flex flex-col">
                        <div className="relative aspect-square rounded-[12px] overflow-hidden bg-[#151515]">
                          {isFailed ? (
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
                                {generation.status === 'processing' || generation.status === 'pending' ? 'Генерация...' : 'Нет изображения'}
                              </span>
                            </div>
                          )}
                          
                          <div className="absolute bottom-2 sm:bottom-auto sm:top-2 left-2 bg-[#181818] px-1.5 py-1 rounded-[8px]">
                            <span className="font-inter font-medium text-[10px] text-[#bbbbbb] uppercase tracking-[-0.2px] leading-4">{generation.model_name}</span>
                          </div>

                          {!isFailed && (
                            <button
                              onClick={(e) => handleToggleFavorite(e, generation.id)}
                              className="absolute top-2 right-2 bg-[#181818] border border-[#2f2f2f] p-2 rounded-[8px] hover:bg-[#252525] transition-colors"
                            >
                              {generation.is_favorite ? <HeartFilledIcon /> : <HeartOutlineIcon />}
                            </button>
                          )}
                        </div>

                        <div className="p-2 lg:p-3 flex flex-col gap-2 lg:gap-3">
                          <p className="font-inter font-normal text-[11px] lg:text-[12px] text-[#8c8c8c] leading-4 line-clamp-3">
                            {generation.prompt || 'Без промпта'}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                            <span className="font-inter font-medium text-[10px] lg:text-[12px] text-[#4d4d4d] leading-5 whitespace-nowrap">
                              {formatDateCustom(generation.created_at)}
                            </span>
                            <div className="flex items-center gap-1 self-end sm:self-auto">
                              <button
                                onClick={(e) => handleDelete(e, generation.id)}
                                className="p-1.5 lg:p-2 rounded-[6px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </button>
                              
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

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="font-inter text-sm text-[#8c8c8c]">{page} / {totalPages}</span>
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
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && profile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleProfileUpdate}
        />
      )}
    </div>
  );
}

