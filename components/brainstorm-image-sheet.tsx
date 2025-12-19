'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, 
  Pencil, 
  Sparkles, 
  Eraser, 
  PaintBucket, 
  Maximize2,
  Download,
  Copy,
  Check
} from 'lucide-react';
import type { BrainstormGeneration } from './pages/brainstorm-page-client';

interface BrainstormImageSheetProps {
  generation: BrainstormGeneration | null;
  allGenerations: BrainstormGeneration[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (generation: BrainstormGeneration) => void;
  onScrollToGeneration?: (generation: BrainstormGeneration) => void;
}

// Close circle icon from Figma
const CloseCircleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18.25" stroke="#7E7E7E" strokeWidth="3"/>
    <path d="M15.875 24.125L24.125 15.875M24.125 24.125L15.875 15.875" stroke="#7E7E7E" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

// Arrow icons from Figma
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 8H2M2 8L8 14M2 8L8 2" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8H14M14 8L8 2M14 8L8 14" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function BrainstormImageSheet({
  generation,
  allGenerations,
  isOpen,
  onClose,
  onNavigate,
  onScrollToGeneration,
}: BrainstormImageSheetProps) {
  const router = useRouter();
  const [copiedImage, setCopiedImage] = useState(false);

  // Get all generations (including current) for navigation
  // Only filter by having resultUrl, don't filter by status to include processing ones
  const navigableGenerations = allGenerations.filter(g => g.resultUrl);
  const currentIndex = generation ? navigableGenerations.findIndex(g => g.id === generation.id) : -1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex >= 0 && currentIndex < navigableGenerations.length - 1;

  // Handle navigation
  const handlePrevious = useCallback(() => {
    if (canNavigatePrev && currentIndex > 0) {
      const prevGen = navigableGenerations[currentIndex - 1];
      onNavigate(prevGen);
      if (onScrollToGeneration) {
        onScrollToGeneration(prevGen);
      }
    }
  }, [canNavigatePrev, currentIndex, navigableGenerations, onNavigate, onScrollToGeneration]);

  const handleNext = useCallback(() => {
    if (canNavigateNext && currentIndex < navigableGenerations.length - 1) {
      const nextGen = navigableGenerations[currentIndex + 1];
      onNavigate(nextGen);
      if (onScrollToGeneration) {
        onScrollToGeneration(nextGen);
      }
    }
  }, [canNavigateNext, currentIndex, navigableGenerations, onNavigate, onScrollToGeneration]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrevious, handleNext]);

  // Download image
  const handleDownload = useCallback(async () => {
    if (!generation?.resultUrl) return;

    try {
      const response = await fetch(generation.resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brainstorm-${generation.modelName}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [generation]);

  // Copy image to clipboard (same method as in output-panel)
  const handleCopyImage = useCallback(async () => {
    if (!generation?.resultUrl) return;

    try {
      // Создаём Promise для blob (асинхронно)
      const pngBlobPromise = (async () => {
        const response = await fetch(generation.resultUrl);
        const blob = await response.blob();
        
        // Конвертируем в PNG через canvas
        const imageBitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas context not available');
        }
        
        ctx.drawImage(imageBitmap, 0, 0);
        
        // toBlob через Promise
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          }, 'image/png');
        });
      })();
      
      // Передаём Promise напрямую в ClipboardItem - браузер сам дождётся
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlobPromise })
      ]);
      
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (error) {
      console.error('Copy image error:', error);
    }
  }, [generation]);

  // Open in fullscreen
  const handleOpenFullscreen = useCallback(() => {
    if (!generation?.resultUrl) return;
    window.open(generation.resultUrl, '_blank');
  }, [generation]);

  // Quick actions
  const handleAnimate = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/video?action=video_i2v&imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  const handleEdit = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/?action=edit&imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  const handleUpscale = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/?action=upscale&imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  const handleRemoveBg = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/?action=remove_bg&imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  const handleInpaint = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/inpaint?imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  const handleOutpaint = useCallback(() => {
    if (!generation?.resultUrl) return;
    router.push(`/expand?imageUrl=${encodeURIComponent(generation.resultUrl)}`);
  }, [generation, router]);

  // Don't render anything if not open or no generation
  if (!isOpen || !generation) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Container for close button and sheet */}
      <div className="fixed top-0 right-0 bottom-0 z-50 flex items-start gap-2 pt-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity mt-3"
          aria-label="Close"
        >
          <CloseCircleIcon />
        </button>

        {/* Sheet */}
        <div
          className="w-[660px] h-full bg-[#151515] shadow-[0_4px_64px_rgba(0,0,0,0.8)] animate-slide-in-right flex flex-col rounded-l-[20px] p-5 gap-6"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-end gap-6">
          {/* Model name */}
          <h2 className="flex-1 text-white text-2xl font-medium leading-[1.33] font-inter">
            {generation.modelName}
          </h2>

          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevious}
              disabled={!canNavigatePrev}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2F2F2F] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous image"
            >
              <ArrowLeftIcon />
            </button>
            <button
              onClick={handleNext}
              disabled={!canNavigateNext}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2F2F2F] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next image"
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Image container */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Image */}
            <div className="relative flex-1 rounded-xl overflow-hidden bg-[#101010] flex items-center justify-center">
              <img
                src={generation.resultUrl}
                alt={generation.modelName}
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Hover overlay with fullscreen button */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group">
                <button
                  onClick={handleOpenFullscreen}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 p-3 rounded-lg"
                  aria-label="Open in fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAnimate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Анимировать</span>
            </button>
            <button
              onClick={handleEdit}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Редактировать</span>
            </button>
            <button
              onClick={handleUpscale}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Улучшить</span>
            </button>
            <button
              onClick={handleRemoveBg}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Удалить фон</span>
            </button>
            <button
              onClick={handleInpaint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <span>Inpaint</span>
            </button>
            <button
              onClick={handleOutpaint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white hover:bg-[#1f1f1f] hover:border-[#666] transition-colors whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Outpaint</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-[#2F2F2F]" />

            {/* Action buttons: Copy, Download */}
            <button
              onClick={handleCopyImage}
              className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-[#4D4D4D] hover:bg-[#1f1f1f] hover:border-[#666] transition-colors"
              aria-label="Copy image"
            >
              {copiedImage ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-[#4D4D4D] hover:bg-[#1f1f1f] hover:border-[#666] transition-colors"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
