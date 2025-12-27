'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';

// Роли пользователей - синхронизированы с БД
export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
}

interface UserContextValue {
  email: string | null;
  role: UserRole;
  avatarUrl: string | null;
  displayName: string | null;
  setEmail: (email: string | null) => void;
  setRole: (role: UserRole) => void;
  setAvatarUrl: (url: string | null) => void;
  setDisplayName: (name: string | null) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Workspaces
  workspaces: UserWorkspace[];
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  isLoadingWorkspaces: boolean;
  // Profile
  loadProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  initialEmail: string | null;
  initialRole?: UserRole;
  children: ReactNode;
}

export function UserProvider({ initialEmail, initialRole = 'user', children }: UserProviderProps) {
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  
  // Предотвращаем повторную загрузку
  const hasLoadedWorkspaces = useRef(false);
  const hasLoadedProfile = useRef(false);
  const previousEmail = useRef<string | null>(null);

  // Load workspaces - оптимизировано для отложенной загрузки
  const loadWorkspaces = useCallback(async () => {
    // Предотвращаем дублирование запросов
    if (isLoadingWorkspaces || hasLoadedWorkspaces.current) {
      return;
    }
    
    setIsLoadingWorkspaces(true);
    
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        const loadedWorkspaces = data.workspaces || [];
        setWorkspaces(loadedWorkspaces);
        hasLoadedWorkspaces.current = true;
        
        // Auto-select workspace
        if (loadedWorkspaces.length > 0) {
          // Try to get from localStorage
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('selectedWorkspaceId') : null;
          if (savedId && loadedWorkspaces.some((w: UserWorkspace) => w.id === savedId)) {
            setSelectedWorkspaceIdState(savedId);
          } else {
            // Auto-select first (or only) workspace
            setSelectedWorkspaceIdState(loadedWorkspaces[0].id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('selectedWorkspaceId', loadedWorkspaces[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [isLoadingWorkspaces]);

  // Set selected workspace and save to localStorage
  const setSelectedWorkspaceId = useCallback((id: string | null) => {
    setSelectedWorkspaceIdState(id);
    if (id && typeof window !== 'undefined') {
      localStorage.setItem('selectedWorkspaceId', id);
    }
  }, []);

  // Load user profile (avatar, display name)
  const loadProfile = useCallback(async () => {
    if (hasLoadedProfile.current) return;
    
    try {
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setAvatarUrl(data.profile.avatar_url || null);
          setDisplayName(data.profile.display_name || null);
          hasLoadedProfile.current = true;
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  // ОПТИМИЗАЦИЯ: Отложенная загрузка workspaces и профиля
  // Загружаем через 100ms после монтирования, чтобы не блокировать начальный рендер
  useEffect(() => {
    // Проверяем, изменился ли пользователь
    const emailChanged = previousEmail.current !== null && previousEmail.current !== email;
    
    // Если пользователь изменился — сбрасываем всё
    if (emailChanged) {
      setWorkspaces([]);
      setSelectedWorkspaceIdState(null);
      setAvatarUrl(null);
      setDisplayName(null);
      hasLoadedWorkspaces.current = false;
      hasLoadedProfile.current = false;
    }
    
    previousEmail.current = email;
    
    if (email && !hasLoadedWorkspaces.current) {
      const timer = setTimeout(() => {
        loadWorkspaces();
        loadProfile(); // Загружаем профиль параллельно с workspaces
      }, 100); // Небольшая задержка для приоритета основного контента
      
      return () => clearTimeout(timer);
    } else if (!email) {
      setWorkspaces([]);
      setSelectedWorkspaceIdState(null);
      setAvatarUrl(null);
      setDisplayName(null);
      hasLoadedWorkspaces.current = false;
      hasLoadedProfile.current = false;
    }
  }, [email, loadWorkspaces, loadProfile]);

  const value = useMemo<UserContextValue>(() => ({
    email,
    role,
    avatarUrl,
    displayName,
    setEmail,
    setRole,
    setAvatarUrl,
    setDisplayName,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    loadWorkspaces,
    isLoadingWorkspaces,
    loadProfile,
  }), [email, role, avatarUrl, displayName, workspaces, selectedWorkspaceId, setSelectedWorkspaceId, loadWorkspaces, isLoadingWorkspaces, loadProfile]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}


