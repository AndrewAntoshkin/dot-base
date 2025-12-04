'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

// Роли пользователей - синхронизированы с БД
export type UserRole = 'user' | 'admin' | 'super_admin';

interface UserContextValue {
  email: string | null;
  role: UserRole;
  setEmail: (email: string | null) => void;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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

  const value = useMemo<UserContextValue>(() => ({
    email,
    role,
    setEmail,
    setRole,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
  }), [email, role]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}


