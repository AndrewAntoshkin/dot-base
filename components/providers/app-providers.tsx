'use client';

import { ReactNode } from 'react';
import { GenerationsProvider } from '@/contexts/generations-context';
import { UserProvider } from '@/contexts/user-context';

interface AppProvidersProps {
  initialUserEmail: string | null;
  isAuthenticated: boolean;
  children: ReactNode;
}

export function AppProviders({ initialUserEmail, isAuthenticated, children }: AppProvidersProps) {
  return (
    <UserProvider initialEmail={initialUserEmail}>
      <GenerationsProvider isAuthenticated={isAuthenticated}>
        {children}
      </GenerationsProvider>
    </UserProvider>
  );
}

