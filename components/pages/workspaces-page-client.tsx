'use client';

import { AppShell } from '@/components/app-shell';
import WorkspacesContent from '@/components/workspaces-content';

export default function WorkspacesPageClient() {
  return (
    <AppShell>
      <main className="flex-1 px-4 lg:px-[80px] py-6">
        <WorkspacesContent showHeader={true} />
      </main>
    </AppShell>
  );
}
