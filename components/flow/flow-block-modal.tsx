'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '@/lib/flow/store';
import { FlowBlockType } from '@/lib/flow/types';
import { cn } from '@/lib/utils';
import { FileText, Image, Video } from 'lucide-react';

interface BlockOption {
  type: FlowBlockType;
  label: string;
  icon: React.ReactNode;
}

const blockOptions: BlockOption[] = [
  {
    type: 'text',
    label: 'Текст',
    icon: <FileText className="w-6 h-6 text-white" />,
  },
  {
    type: 'image',
    label: 'Изображение',
    icon: <Image className="w-6 h-6 text-white" />,
  },
  {
    type: 'video',
    label: 'Видео',
    icon: <Video className="w-6 h-6 text-white" />,
  },
];

export function FlowBlockModal() {
  const { isBlockModalOpen, blockModalPosition, screenPosition, addNode, closeBlockModal } = useFlowStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  // Adjust position to keep modal in viewport
  useEffect(() => {
    if (isBlockModalOpen && screenPosition && modalRef.current) {
      const modal = modalRef.current;
      const rect = modal.getBoundingClientRect();
      const padding = 16;
      
      let x = screenPosition.x;
      let y = screenPosition.y;
      
      // Adjust if modal goes beyond right edge
      if (x + rect.width > window.innerWidth - padding) {
        x = window.innerWidth - rect.width - padding;
      }
      
      // Adjust if modal goes beyond bottom edge
      if (y + rect.height > window.innerHeight - padding) {
        y = window.innerHeight - rect.height - padding;
      }
      
      // Ensure minimum position
      x = Math.max(padding, x);
      y = Math.max(padding, y);
      
      setAdjustedPosition({ x, y });
    }
  }, [isBlockModalOpen, screenPosition]);

  const handleAddBlock = useCallback((type: FlowBlockType) => {
    if (blockModalPosition) {
      addNode(type, blockModalPosition);
      closeBlockModal();
    }
  }, [addNode, blockModalPosition, closeBlockModal]);

  if (!isBlockModalOpen || !blockModalPosition || !screenPosition) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={closeBlockModal}
      />

      {/* Modal at click position - Figma design */}
      <div
        ref={modalRef}
        className={cn(
          'fixed z-50 rounded-3xl bg-[#1A1A1A]',
          'shadow-[0px_12px_24px_0px_rgba(0,0,0,0.8)]'
        )}
        style={{
          left: adjustedPosition.x || screenPosition.x,
          top: adjustedPosition.y || screenPosition.y,
        }}
      >
        {/* Container with padding and gap */}
        <div className="flex flex-col gap-5 p-5">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-[10px] font-medium leading-[1.4em] tracking-[0.015em] uppercase text-[#959595]">
              создать блок
            </h3>
            
            {/* Options row */}
            <div className="flex gap-2">
              {blockOptions.map((option, index) => (
                <button
                  key={option.type}
                  onClick={() => handleAddBlock(option.type)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-3',
                    'w-[160px] h-[160px] rounded-[20px]',
                    'bg-[#101010] transition-colors',
                    'hover:bg-[#1a1a1a]',
                    index === 0 && 'border border-white'
                  )}
                >
                  <div className="flex items-center justify-center">
                    {option.icon}
                  </div>
                  <span className="text-xs font-normal leading-[1.5em] uppercase text-white">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
