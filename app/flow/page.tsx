import { Suspense } from 'react';
import { FlowPageClient } from '@/components/pages/flow-page-client';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Flow - Визуальный конструктор AI-пайплайнов',
  description: 'Создавайте цепочки AI-генераций с помощью визуального редактора',
};

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
        <span className="text-sm text-[#6D6D6D]">Загрузка редактора...</span>
      </div>
    </div>
  );
}

export default function FlowPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FlowPageClient />
    </Suspense>
  );
}
