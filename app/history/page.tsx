import { Suspense } from 'react';
import HistoryPageClient from '@/components/pages/history-page-client';

export const dynamic = 'force-dynamic';

function HistoryLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryLoading />}>
      <HistoryPageClient />
    </Suspense>
  );
}
