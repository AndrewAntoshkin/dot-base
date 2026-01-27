'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '@/lib/flow/store';
import { FlowBlockType } from '@/lib/flow/types';
import { cn } from '@/lib/utils';
import { FileText, Image, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BlockOption {
  type: FlowBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const blockOptions: BlockOption[] = [
  {
    type: 'text',
    label: 'Текст',
    description: 'Создавайте промпты и редактируйте контент',
    icon: <FileText className="w-4 h-4 text-white" />,
  },
  {
    type: 'image',
    label: 'Изображение',
    description: 'Генерируйте и обрабатывайте изображения',
    icon: <Image className="w-4 h-4 text-white" />,
  },
  {
    type: 'video',
    label: 'Видео',
    description: 'Создавайте видео из изображений',
    icon: <Video className="w-4 h-4 text-white" />,
  },
];

export function FlowBlockModal() {
  const { isBlockModalOpen, blockModalPosition, screenPosition, addNode, closeBlockModal } = useFlowStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 360, height: 280 });

  // Adjust position to keep modal in viewport and center on click
  useEffect(() => {
    if (isBlockModalOpen && screenPosition && modalRef.current) {
      const modal = modalRef.current;
      const rect = modal.getBoundingClientRect();
      const padding = 16;
      
      // Store modal size for centering
      setModalSize({ width: rect.width || 360, height: rect.height || 280 });
      
      // Center modal on click position
      let x = screenPosition.x - (rect.width || 360) / 2;
      let y = screenPosition.y - (rect.height || 280) / 2;
      
      // Adjust if modal goes beyond right edge
      if (x + rect.width > window.innerWidth - padding) {
        x = window.innerWidth - rect.width - padding;
      }
      
      // Adjust if modal goes beyond left edge
      if (x < padding) {
        x = padding;
      }
      
      // Adjust if modal goes beyond bottom edge
      if (y + rect.height > window.innerHeight - padding) {
        y = window.innerHeight - rect.height - padding;
      }
      
      // Adjust if modal goes beyond top edge
      if (y < padding) {
        y = padding;
      }
      
      setAdjustedPosition({ x, y });
      
      // Trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
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
          'fixed z-50 rounded-2xl bg-[#171717]',
          'shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)]',
          'transition-all duration-200 ease-out',
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={{
          left: adjustedPosition.x || screenPosition.x - modalSize.width / 2,
          top: adjustedPosition.y || screenPosition.y - modalSize.height / 2,
          transformOrigin: 'center center',
        }}
      >
        {/* Container with padding and gap */}
        <div className="flex flex-col gap-2 p-3 w-[360px]">
          {/* Block options */}
          {blockOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleAddBlock(option.type)}
              className={cn(
                'flex items-center gap-3 p-2 rounded-[10px]',
                'transition-colors hover:bg-[#232323]'
              )}
            >
              {/* Icon container */}
              <div className="flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-[#232323] flex-shrink-0">
                {option.icon}
              </div>
              
              {/* Text content */}
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-sm text-white leading-[1.286em]">
                  {option.label}
                </span>
                <span className="text-xs text-[#959595] leading-[1.5em]">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
          
          {/* Divider */}
          <div className="h-px bg-[#2F2F2F] mx-0" />
          
          {/* Documentation link */}
          <Link
            href="/docs/flow#blocks"
            onClick={closeBlockModal}
            className={cn(
              'flex items-center justify-between gap-3 p-2 rounded-[10px]',
              'transition-colors hover:bg-[#232323]'
            )}
          >
            <span className="text-sm font-medium text-white leading-[1.286em]">
              Как пользоваться FLOW
            </span>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#050505]">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
