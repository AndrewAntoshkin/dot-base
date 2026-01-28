'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlowStore } from '@/lib/flow/store';
import { FlowBlockType } from '@/lib/flow/types';
import { cn } from '@/lib/utils';
import { FileText, Image, Video, ExternalLink, Search } from 'lucide-react';
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

// Image models
const imageModels = [
  { id: 'imagen-4-ultra', name: 'Imagen 4' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'flux-2-max', name: 'FLUX 2 Max' },
  { id: 'flux-2-pro', name: 'FLUX 2 Pro' },
  { id: 'ideogram-v3-turbo', name: 'Ideogram V3' },
  { id: 'recraft-v3', name: 'Recraft V3' },
];

// Video models (T2V)
const videoModels = [
  { id: 'seedance-1.5-pro-t2v', name: 'Seedance 1.5 Pro' },
  { id: 'kling-v2.5-turbo-pro-t2v', name: 'Kling 2.5 Pro' },
  { id: 'kling-v2.1-master-t2v', name: 'Kling 2.1 Master' },
  { id: 'hailuo-2.3-t2v', name: 'Hailuo 2.3' },
  { id: 'hailuo-02-t2v', name: 'Hailuo 02' },
  { id: 'wan-2.5-t2v', name: 'Wan 2.5' },
  { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast' },
];

export function FlowBlockModal() {
  const { isBlockModalOpen, blockModalPosition, screenPosition, addNode, closeBlockModal } = useFlowStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredType, setHoveredType] = useState<FlowBlockType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Get models based on hovered type
  const getModels = () => {
    if (hoveredType === 'image') return imageModels;
    if (hoveredType === 'video') return videoModels;
    return [];
  };

  const filteredModels = getModels().filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Adjust position to keep modal in viewport and center on click
  useEffect(() => {
    if (isBlockModalOpen && screenPosition && modalRef.current) {
      const modal = modalRef.current;
      const rect = modal.getBoundingClientRect();
      const padding = 16;
      
      // Base width is 360px (left panel only), right panel is absolutely positioned
      const baseWidth = 360;
      const height = rect.height || 280;
      
      // Center modal on click position
      let x = screenPosition.x - baseWidth / 2;
      let y = screenPosition.y - height / 2;
      
      // Adjust if modal goes beyond right edge (account for potential model panel)
      if (x + baseWidth + 340 > window.innerWidth - padding) {
        x = window.innerWidth - baseWidth - 340 - padding;
      }
      
      // Adjust if modal goes beyond left edge
      if (x < padding) {
        x = padding;
      }
      
      // Adjust if modal goes beyond bottom edge
      if (y + height > window.innerHeight - padding) {
        y = window.innerHeight - height - padding;
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
      setHoveredType(null);
      setSearchQuery('');
      setSelectedModel(null);
    }
  }, [isBlockModalOpen, screenPosition]);

  const handleAddBlock = useCallback((type: FlowBlockType, modelId?: string) => {
    if (blockModalPosition) {
      addNode(type, blockModalPosition, modelId);
      closeBlockModal();
    }
  }, [addNode, blockModalPosition, closeBlockModal]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    if (hoveredType) {
      handleAddBlock(hoveredType, modelId);
    }
  }, [hoveredType, handleAddBlock]);

  if (!isBlockModalOpen || !blockModalPosition || !screenPosition) {
    return null;
  }

  const showModelPanel = hoveredType === 'image' || hoveredType === 'video';

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
          'fixed z-50',
          'transition-all duration-200 ease-out',
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={{
          left: adjustedPosition.x || screenPosition.x - 180,
          top: adjustedPosition.y || screenPosition.y - 140,
          transformOrigin: 'center center',
        }}
      >
        {/* Left panel - Block types */}
        <div className="relative rounded-2xl bg-[#171717] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)]">
          <div className="flex flex-col gap-2 p-3 w-[360px]">
            {/* Block options */}
            {blockOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleAddBlock(option.type)}
                onMouseEnter={() => setHoveredType(option.type)}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-[10px]',
                  'transition-colors',
                  hoveredType === option.type ? 'bg-[#0C0C0C]' : 'hover:bg-[#232323]'
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
              onMouseEnter={() => setHoveredType(null)}
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

        {/* Right panel - Model selector (only for image/video) - positioned absolutely */}
        {showModelPanel && (
          <div 
            className={cn(
              "absolute left-full top-0 ml-2 rounded-2xl bg-[#171717] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)]",
              "transition-all duration-200 ease-out",
              "animate-in slide-in-from-left-2 fade-in"
            )}
          >
            <div className="flex flex-col gap-2 p-3 w-[320px] h-[400px]">
              {/* Search input */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-[#2B2B2B]">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder:text-[#959595] outline-none"
                  />
                </div>
                <Search className="w-5 h-5 text-white flex-shrink-0" />
              </div>

              {/* Models list */}
              <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
                {filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-[10px] text-left',
                      'transition-colors hover:bg-[#232323]',
                      selectedModel === model.id && 'bg-[#0C0C0C]'
                    )}
                  >
                    <span className="text-sm text-white leading-[1.286em]">
                      {model.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
