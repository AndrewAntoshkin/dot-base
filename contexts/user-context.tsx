'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface UserContextValue {
  email: string | null;
  setEmail: (email: string | null) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

interface UserProviderProps {
  initialEmail: string | null;
  children: ReactNode;
}

export function UserProvider({ initialEmail, children }: UserProviderProps) {
  const [email, setEmail] = useState<string | null>(initialEmail);

  const value = useMemo<UserContextValue>(() => ({ email, setEmail }), [email]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}


