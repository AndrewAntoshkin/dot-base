'use client';

import { Header } from '@/components/header';
import WorkspacesContent from '@/components/workspaces-content';

export default function WorkspacesPageClient() {
  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1 px-4 lg:px-[80px] py-6">
        <WorkspacesContent showHeader={true} />
      </main>
    </div>
  );
}
