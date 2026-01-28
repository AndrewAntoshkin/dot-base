'use client';

import { ReactNode } from 'react';
import { GenerationsProvider } from '@/contexts/generations-context';
import { UserProvider, UserRole } from '@/contexts/user-context';
import { GenerationToastContainer } from '@/components/generation-toast';
import { LimitToastProvider } from '@/components/limit-toast';
import { SupportButton } from '@/components/support-button';

interface AppProvidersProps {
  initialUserEmail: string | null;
  initialUserRole?: UserRole;
  isAuthenticated: boolean;
  children: ReactNode;
}

export function AppProviders({ 
  initialUserEmail, 
  initialUserRole = 'user',
  isAuthenticated, 
  children 
}: AppProvidersProps) {
  return (
    <UserProvider initialEmail={initialUserEmail} initialRole={initialUserRole}>
      <GenerationsProvider isAuthenticated={isAuthenticated}>
        <LimitToastProvider>
          {children}
          {/* Generation status notifications */}
          <GenerationToastContainer />
          {/* Support button - shows on all pages */}
          <SupportButton />
        </LimitToastProvider>
      </GenerationsProvider>
    </UserProvider>
  );
}

