'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import type { Layer } from './layers-panel';

interface LayerPreviewProps {
  originalImageUrl: string;
  layers: Layer[];
  selectedLayerId: string | null;
  onApplyEdit: (layerId: string, prompt: string) => Promise<void>;
  isProcessing?: boolean;
}

export function LayerPreview({
  originalImageUrl,
  layers,
  selectedLayerId,
  onApplyEdit,
  isProcessing = false,
}: LayerPreviewProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Определяем aspect ratio изображения
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio > 1.1) setImageAspectRatio('landscape');
    else if (ratio < 0.9) setImageAspectRatio('portrait');
    else setImageAspectRatio('square');
  };

  // Обработка применения изменений
  const handleApply = async () => {
    if (!selectedLayerId || !editPrompt.trim()) return;
    await onApplyEdit(selectedLayerId, editPrompt.trim());
    setEditPrompt('');
  };

  // Определение placeholder текста
  const getPlaceholder = () => {
    if (!selectedLayer) return 'Выберите слой для редактирования...';
    if (selectedLayer.name === 'background') {
      return 'Опишите новый фон на английском...';
    }
    return 'Опишите изменения для этого объекта на английском...';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 shrink-0 animate-fade-in-up">
        <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
          PREVIEW
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Основное превью */}
        <div className="animate-fade-in-up animate-delay-100">
          <div className="relative w-full h-[660px] bg-[#0a0a0a] rounded-2xl overflow-hidden flex items-center justify-center">
            {/* Основное изображение */}
            <img
              src={originalImageUrl}
              alt="Original"
              className={imageAspectRatio === 'landscape' ? 'w-full h-auto' : 'h-[660px] w-auto'}
              onLoad={handleImageLoad}
            />

            {/* Overlay подсветки выбранного слоя */}
            {selectedLayer && selectedLayer.is_visible !== false && (
              <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'rgba(255, 230, 0, 0.15)',
                  maskImage: `url(${selectedLayer.mask_url})`,
                  WebkitMaskImage: `url(${selectedLayer.mask_url})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            )}

            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <span className="font-inter text-sm text-white">Обработка...</span>
                </div>
              </div>
            )}
          </div>

          {/* Подсказка */}
          {selectedLayer && (
            <p className="font-inter text-xs text-[#656565] mt-3">
              Выбран слой: <span className="text-white">{selectedLayer.name === 'background' ? 'Фон' : selectedLayer.name}</span>
            </p>
          )}
        </div>

        {/* Редактирование слоя */}
        {selectedLayer && (
          <div className="mt-6 animate-fade-in-up animate-delay-200">
            <div className="border border-[#252525] rounded-[16px] p-4">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px] mb-3">
                <Wand2 className="w-3 h-3" />
                Редактировать слой
              </label>

              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder={getPlaceholder()}
                rows={3}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2f2f2f] rounded-xl text-white placeholder:text-[#666] font-inter text-sm resize-none focus:outline-none focus:border-white transition-colors disabled:opacity-50"
              />

              <button
                onClick={handleApply}
                disabled={!editPrompt.trim() || isProcessing}
                className="mt-3 w-full h-10 rounded-xl bg-white text-black font-inter font-medium text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Применяю...
                  </span>
                ) : (
                  'Применить к слою'
                )}
              </button>

              <p className="font-inter text-xs text-[#656565] mt-3 text-center">
                Изменения применятся только к выбранному слою
              </p>
            </div>
          </div>
        )}

        {/* Empty state когда слой не выбран */}
        {!selectedLayer && layers.length > 0 && (
          <div className="mt-6 animate-fade-in-up animate-delay-200">
            <div className="border border-[#252525] rounded-[16px] p-6 text-center">
              <p className="font-inter text-sm text-[#656565]">
                Выберите слой слева для редактирования
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

