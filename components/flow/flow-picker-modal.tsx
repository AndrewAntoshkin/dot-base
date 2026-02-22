'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_template: boolean;
}

interface FlowPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
}

export function FlowPickerModal({
  isOpen,
  onClose,
  onCreateNew,
}: FlowPickerModalProps) {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch flows when modal opens
  const fetchFlows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/flow?limit=50');
      if (!response.ok) throw new Error('Failed to fetch flows');
      const data = await response.json();
      setFlows(data.flows || []);
    } catch (err) {
      console.error('Error fetching flows:', err);
      setError('Не удалось загрузить флоу');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFlows();
      // Focus search input
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      // Reset state when closing
      setSearch('');
      setError(null);
    }
  }, [isOpen, fetchFlows]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectFlow = useCallback(
    (flowId: string) => {
      onClose();
      router.push(`/flow?id=${flowId}`);
    },
    [onClose, router]
  );

  const handleCreateNew = useCallback(() => {
    onClose();
    onCreateNew();
  }, [onClose, onCreateNew]);

  const handleDeleteFlow = useCallback(
    async (e: React.MouseEvent, flowId: string) => {
      e.stopPropagation();
      try {
        const response = await fetch(`/api/flow/${flowId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete flow');
        setFlows((prev) => prev.filter((f) => f.id !== flowId));
      } catch (err) {
        console.error('Error deleting flow:', err);
      }
    },
    []
  );

  // Filter flows by search
  const filteredFlows = flows.filter((flow) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      flow.name.toLowerCase().includes(q) ||
      (flow.description && flow.description.toLowerCase().includes(q))
    );
  });

  // Format relative date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex items-start gap-2">
        <div className="bg-[#101010] rounded-[32px] p-6 w-[520px] max-w-[90vw] flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Flow</h2>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#959595]" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти флоу..."
              className={cn(
                'w-full pl-10 pr-3 py-2.5 rounded-xl',
                'bg-[#101010] border border-[#2F2F2F]',
                'text-sm text-white placeholder:text-[#959595]',
                'focus:outline-none focus:border-white/30',
                'transition-colors'
              )}
            />
          </div>

          {/* Create new button */}
          <button
            onClick={handleCreateNew}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-xl',
              'border border-dashed border-[#2F2F2F]',
              'text-[#959595] hover:text-white hover:border-[#505050]',
              'transition-colors group'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center',
                'group-hover:bg-[#232323] transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Создать новый флоу</span>
          </button>

          {/* Flows list */}
          <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <span className="text-sm text-red-400">{error}</span>
                <button
                  onClick={fetchFlows}
                  className="text-xs text-[#959595] hover:text-white transition-colors underline"
                >
                  Повторить
                </button>
              </div>
            ) : filteredFlows.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-[#959595]">
                  {search.trim()
                    ? 'Ничего не найдено'
                    : 'У вас пока нет флоу'}
                </span>
              </div>
            ) : (
              filteredFlows.map((flow) => (
                <button
                  key={flow.id}
                  onClick={() => handleSelectFlow(flow.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-left',
                    'hover:bg-[#1A1A1A] transition-colors group'
                  )}
                >
                  {/* Flow icon */}
                  <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] group-hover:bg-[#232323] flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 2.66667V6.66667M4 6.66667C5.10457 6.66667 6 7.5621 6 8.66667V9.33333C6 10.4379 6.89543 11.3333 8 11.3333M4 6.66667C2.89543 6.66667 2 7.5621 2 8.66667V9.33333C2 10.4379 2.89543 11.3333 4 11.3333M8 11.3333C8 12.0697 8.59695 12.6667 9.33333 12.6667H10.6667C11.403 12.6667 12 12.0697 12 11.3333C12 10.597 11.403 10 10.6667 10H9.33333C8.59695 10 8 10.597 8 11.3333ZM4 11.3333C4 12.0697 4.59695 12.6667 5.33333 12.6667H5.33333C6.06971 12.6667 6.66667 12.0697 6.66667 11.3333C6.66667 10.597 6.06971 10 5.33333 10H5.33333C4.59695 10 4 10.597 4 11.3333ZM4 2.66667C4.73638 2.66667 5.33333 3.26362 5.33333 4C5.33333 4.73638 4.73638 5.33333 4 5.33333C3.26362 5.33333 2.66667 4.73638 2.66667 4C2.66667 3.26362 3.26362 2.66667 4 2.66667Z"
                        stroke="#6E6E6E"
                        strokeWidth="1.33"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {/* Flow info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {flow.name}
                    </div>
                    {flow.description && (
                      <div className="text-xs text-[#6E6E6E] truncate mt-0.5">
                        {flow.description}
                      </div>
                    )}
                  </div>
                  {/* Delete + Date */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleDeleteFlow(e, flow.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#6E6E6E] hover:text-red-400 hover:bg-white/5 transition-all"
                      aria-label="Удалить флоу"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-[#6E6E6E]">
                      {formatDate(flow.updated_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'w-8 h-8 rounded-full bg-white flex items-center justify-center',
            'hover:bg-white/90 transition-colors',
            'mt-3'
          )}
        >
          <X className="w-4 h-4 text-black" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
