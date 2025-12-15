'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

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
  setEmail: (email: string | null) => void;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // Workspaces
  workspaces: UserWorkspace[];
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
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
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string | null>(null);

  // Load workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        const loadedWorkspaces = data.workspaces || [];
        setWorkspaces(loadedWorkspaces);
        
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
    }
  }, []);

  // Set selected workspace and save to localStorage
  const setSelectedWorkspaceId = useCallback((id: string | null) => {
    setSelectedWorkspaceIdState(id);
    if (id && typeof window !== 'undefined') {
      localStorage.setItem('selectedWorkspaceId', id);
    }
  }, []);

  // Load workspaces on mount when user is logged in
  useEffect(() => {
    if (email) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setSelectedWorkspaceIdState(null);
    }
  }, [email, loadWorkspaces]);

  const value = useMemo<UserContextValue>(() => ({
    email,
    role,
    setEmail,
    setRole,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    loadWorkspaces,
  }), [email, role, workspaces, selectedWorkspaceId, setSelectedWorkspaceId, loadWorkspaces]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}


