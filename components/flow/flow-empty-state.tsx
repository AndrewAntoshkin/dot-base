'use client';

import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';

export function FlowEmptyState() {
  const { nodes, viewport, openBlockModal } = useFlowStore();

  // Не показываем empty state если есть узлы
  if (nodes.length > 0) {
    return null;
  }

  const handleCreate = () => {
    // Вычисляем центр видимой области в координатах канваса
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    // Screen position - center of screen
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    openBlockModal({ x: centerX, y: centerY }, { x: screenCenterX, y: screenCenterY });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="flex flex-col items-center gap-4">
        {/* Plus circle decorations */}
        <div className="flex items-center gap-1.5">
          <div className="w-[11px] h-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          
          {/* Center decorative box */}
          <div 
            className="w-[168px] h-[12px] rounded-lg bg-[#1C1C1C]"
            style={{ boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.16)' }}
          />
          
          <div className="w-[11px] h-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-sm text-[#6D6D6D] text-center max-w-[368px]">
          Нажмите на кнопку ниже для создания первого блока или кликните два раза в любом месте
        </p>

        {/* Create button */}
        <button
          onClick={handleCreate}
          className={cn(
            'pointer-events-auto',
            'flex items-center justify-center gap-2 px-4 h-10 rounded-xl',
            'bg-white text-black font-medium text-sm',
            'hover:bg-white/90 transition-colors'
          )}
        >
          Создать
        </button>
      </div>
    </div>
  );
}
