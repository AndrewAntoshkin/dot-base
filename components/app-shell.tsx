'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';

/**
 * AppShell — wraps the sidebar + top navbar + content.
 * Replaces the old full-width Header-only layout.
 *
 * Usage in page components:
 *   <AppShell>
 *     <main>…</main>
 *   </AppShell>
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex bg-[#101010] overflow-hidden">
      {/* Sidebar — desktop only, 8px offset from edges */}
      <div className="hidden lg:block p-2 pr-0 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main column: navbar + content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
