'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { useGenerations } from '@/contexts/generations-context';

interface GenerationsQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_VISIBLE_GENERATIONS = 5;

// Проверка, является ли action видео действием
const isVideoAction = (action: string): boolean => {
  return action?.startsWith('video_');
};

// Проверка, является ли action текстовым (analyze)
const isTextAction = (action: string): boolean => {
  return action?.startsWith('analyze_');
};

export function GenerationsQueue({ isOpen, onClose }: GenerationsQueueProps) {
  const router = useRouter();
  const { unviewedGenerations, markAsViewed } = useGenerations();

  const handleGenerationClick = async (id: string, action: string) => {
    // Mark as viewed before navigating
    await markAsViewed(id);
    // Navigate to correct page based on action type
    let basePath = '/';
    if (isVideoAction(action)) {
      basePath = '/video';
    } else if (isTextAction(action)) {
      basePath = '/analyze';
    }
    router.push(`${basePath}?generationId=${id}`);
    onClose();
  };

  if (!isOpen) return null;

  const visibleGenerations = unviewedGenerations.slice(0, MAX_VISIBLE_GENERATIONS);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-[240px] bg-[#1a1a1a] border border-[#2f2f2f] rounded-xl shadow-lg z-50 overflow-hidden">
        {unviewedGenerations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="font-inter text-sm text-[#656565]">
              Все просмотрено
            </p>
          </div>
        ) : (
          <div className="py-2">
            {visibleGenerations.map((generation) => (
              <button
                key={generation.id}
                onClick={() => handleGenerationClick(generation.id, generation.action)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2f2f2f] transition-colors"
              >
                <span className="font-inter text-sm text-white truncate">
                  {generation.model_name}
                </span>
                
                {generation.status === 'processing' || generation.status === 'pending' ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin shrink-0 ml-2" />
                ) : generation.status === 'completed' ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0 ml-2" />
                ) : generation.status === 'failed' ? (
                  <X className="h-4 w-4 text-red-500 shrink-0 ml-2" />
                ) : null}
              </button>
            ))}
            
            {/* View all button */}
            <div className="h-px bg-[#2f2f2f] mx-2 my-1" />
            <Link
              href="/profile"
              onClick={onClose}
              className="w-full px-4 py-3 flex items-center justify-center hover:bg-[#2f2f2f] transition-colors"
            >
              <span className="font-inter text-sm text-[#959595] hover:text-white transition-colors">
                Смотреть все
              </span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

