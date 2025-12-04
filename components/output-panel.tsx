'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Download, RotateCcw, Copy, WifiOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { fetchWithTimeout, isOnline, isSlowConnection } from '@/lib/network-utils';

interface OutputPanelProps {
  generationId: string | null;
  onRegenerate?: (prompt: string, settings: Record<string, any>, modelId: string) => void;
  isMobile?: boolean;
}

interface Generation {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  output_urls: string[] | null;
  error_message: string | null;
  prompt: string | null;
  model_id: string;
  model_name: string;
  action: string;
  created_at: string;
  processing_time_ms: number | null;
  settings: Record<string, any>;
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}

function isSvgUrl(url: string): boolean {
  return url.toLowerCase().includes('.svg') || url.includes('image/svg');
}

function isValidMediaUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

/**
 * Проверка, является ли ошибка AbortError (запрос отменён)
 */
function isAbortError(error: any): boolean {
  return error?.name === 'AbortError' || 
         error?.code === 'ABORT_ERR' || 
         error?.message?.includes('aborted') ||
         error?.message?.includes('abort');
}

// Интервалы polling с адаптацией под качество сети
const POLLING_INTERVAL = 5000; // 5 секунд обычно
const POLLING_INTERVAL_SLOW = 10000; // 10 секунд для медленного соединения

export function OutputPanel({ generationId, onRegenerate, isMobile = false }: OutputPanelProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const [copied, setCopied] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const consecutiveErrorsRef = useRef(0);

  useEffect(() => {
    // Флаг для отслеживания актуальности этого эффекта
    let isCurrentEffect = true;
    
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    
    if (!generationId) {
      setGeneration(null);
      setSelectedImageIndex(0);
      setIsLoading(false);
      setNetworkError(null);
      return;
    }

    // Создаём новый AbortController для этого запроса
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setSelectedImageIndex(0);
    setNetworkError(null);
    consecutiveErrorsRef.current = 0;

    const fetchGeneration = async () => {
      // Проверяем что этот эффект ещё актуален
      if (!isCurrentEffect || abortController.signal.aborted) {
        return;
      }
      
      // Пропускаем если офлайн
      if (!isOnline()) {
        if (isCurrentEffect) {
          setNetworkError('Нет подключения к интернету');
          // Продолжаем polling на случай восстановления
          pollTimeoutRef.current = setTimeout(fetchGeneration, POLLING_INTERVAL_SLOW);
        }
        return;
      }
      
      try {
        const response = await fetchWithTimeout(`/api/generations/${generationId}`, {
          timeout: isSlowConnection() ? 20000 : 10000,
          retries: 1,
          credentials: 'include',
          signal: abortController.signal,
        });
        
        // Проверяем ещё раз после await
        if (!isCurrentEffect || abortController.signal.aborted) {
          return;
        }
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Финальная проверка перед обновлением стейта
        if (!isCurrentEffect || abortController.signal.aborted) {
          return;
        }
        
        setGeneration(data);
        setIsLoading(false);
        setNetworkError(null);
        consecutiveErrorsRef.current = 0;

        // Polling если обрабатывается
        if ((data.status === 'processing' || data.status === 'pending') && isCurrentEffect) {
          const interval = isSlowConnection() ? POLLING_INTERVAL_SLOW : POLLING_INTERVAL;
          pollTimeoutRef.current = setTimeout(fetchGeneration, interval);
        }
      } catch (error: any) {
        // Игнорируем AbortError - это нормальная ситуация при отмене запроса
        if (isAbortError(error)) {
          console.log('[OutputPanel] Request aborted (normal during navigation)');
          return;
        }
        
        // Проверяем актуальность перед обновлением стейта
        if (!isCurrentEffect || abortController.signal.aborted) {
          return;
        }
        
        console.error('[OutputPanel] Fetch error:', error);
        consecutiveErrorsRef.current++;
        
        setIsLoading(false);
        
        // Показываем ошибку после нескольких попыток
        if (consecutiveErrorsRef.current >= 3) {
          if (error.code === 'TIMEOUT') {
            setNetworkError('Медленное соединение');
          } else if (error.code === 'OFFLINE') {
            setNetworkError('Нет подключения');
          } else {
            setNetworkError('Ошибка загрузки');
          }
        }
        
        // НЕ продолжаем polling при ошибке - пользователь может обновить вручную
      }
    };

    fetchGeneration();

    return () => {
      isCurrentEffect = false;
      // Отменяем текущий запрос при размонтировании или смене generationId
      abortController.abort();
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [generationId]); // Убрали лишние зависимости

  const handleDownload = async () => {
    const url = generation?.output_urls?.[selectedImageIndex] || generation?.output_urls?.[0];
    if (!url || !generation) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const suffix = generation.output_urls && generation.output_urls.length > 1 
        ? `-${selectedImageIndex + 1}` 
        : '';
      const extension = isVideoUrl(url) ? 'mp4' : isSvgUrl(url) ? 'svg' : 'png';
      link.download = `generation-${generation.id}${suffix}.${extension}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleRegenerate = () => {
    if (!generation || !onRegenerate) return;
    onRegenerate(generation.prompt || '', generation.settings || {}, generation.model_id);
  };

  const handleCopyPrompt = async () => {
    if (!generation?.prompt) return;
    try {
      await navigator.clipboard.writeText(generation.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio > 1.1) setImageAspectRatio('landscape');
    else if (ratio < 0.9) setImageAspectRatio('portrait');
    else setImageAspectRatio('square');
  };

  // Empty states
  if (!generationId && !generation) {
    if (isMobile) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="bg-[#131313] rounded-2xl p-6 w-full text-center">
            <p className="font-inter text-[14px] text-[#656565]">
              Выберите модель и настройте параметры во вкладке Input
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[660px] px-20">
        <div className="flex gap-12 w-full">
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/1.png" alt="1" width={36} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Выбор модели</h3>
              <p className="font-inter text-sm text-[#9c9c9c]">Выберите действие и модель</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/2.png" alt="2" width={55} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Промпт</h3>
              <p className="font-inter text-sm text-[#9c9c9c]">Опишите что хотите создать</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/3.png" alt="3" width={53} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Настройки</h3>
              <p className="font-inter text-sm text-[#9c9c9c]">Настройте параметры</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading && !generation) {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
            <p className="font-inter text-sm text-[#959595]">Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!generation) return null;

  // Processing
  if (generation.status === 'processing' || generation.status === 'pending') {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
            <div className="text-center">
              <p className="font-inter font-medium text-base text-white mb-1">Генерация...</p>
              <p className="font-inter text-sm text-[#959595]">{generation.model_name}</p>
            </div>
            {/* Индикатор сетевых проблем */}
            {networkError && (
              <div className="flex items-center gap-2 text-yellow-500 text-sm">
                <WifiOff className="h-4 w-4" />
                <span>{networkError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Failed
  if (generation.status === 'failed') {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={`text-center max-w-md px-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-6' : ''}`}>
          <p className="font-inter font-medium text-base text-red-500 mb-2">Ошибка</p>
          <p className="font-inter text-sm text-[#959595]">{generation.error_message || 'Неизвестная ошибка'}</p>
        </div>
      </div>
    );
  }

  const currentMediaUrl = generation.output_urls?.[selectedImageIndex] || generation.output_urls?.[0];
  const isVideo = currentMediaUrl ? isVideoUrl(currentMediaUrl) : false;
  const isValidUrl = currentMediaUrl && isValidMediaUrl(currentMediaUrl);

  // Mobile result
  if (isMobile) {
    const isSvgMobile = currentMediaUrl ? isSvgUrl(currentMediaUrl) : false;
    
    return (
      <div className="flex flex-col w-full gap-6">
        {isValidUrl && (
          <div className="relative w-full bg-[#131313] rounded-[12px] overflow-hidden">
            {isVideo ? (
              <video src={currentMediaUrl} controls autoPlay loop muted playsInline className="w-full h-auto" />
            ) : isSvgMobile ? (
              <object
                data={currentMediaUrl}
                type="image/svg+xml"
                className="w-full h-auto"
                onLoad={handleImageLoad}
              >
                <img src={currentMediaUrl} alt="Generated SVG" className="w-full h-auto" onLoad={handleImageLoad} />
              </object>
            ) : (
              <img
                src={currentMediaUrl}
                alt="Generated"
                className="w-full h-auto"
                onLoad={handleImageLoad}
              />
            )}
          </div>
        )}

        {/* Thumbnails */}
        {generation.output_urls && generation.output_urls.filter(isValidMediaUrl).length > 1 && (
          <div className="flex gap-2 items-center">
            {generation.output_urls.filter(isValidMediaUrl).map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all ${
                  selectedImageIndex === index ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                }`}
              >
                {isVideoUrl(url) ? (
                  <div className="w-full h-full bg-[#1f1f1f] flex items-center justify-center">
                    <span className="text-xs">🎬</span>
                  </div>
                ) : (
                  <img src={url} alt={`Output ${index + 1}`} className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button onClick={handleDownload} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3">
          <p className="font-inter text-sm text-[#656565]">{formatDate(generation.created_at)}</p>
          {generation.prompt && (
            <div className="border border-[#2f2f2f] rounded-[16px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-inter text-[14px] text-[#656565]">Prompt</p>
                <button onClick={handleCopyPrompt} className="p-1 hover:opacity-70">
                  {copied ? <span className="text-xs text-green-500">✓</span> : <Copy className="h-4 w-4 text-[#707070]" />}
                </button>
              </div>
              <p className="font-inter text-[15px] text-white">{generation.prompt}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isSvg = currentMediaUrl ? isSvgUrl(currentMediaUrl) : false;

  // Desktop result
  return (
    <div className="flex flex-col w-full">
      {isValidUrl && (
        <div className="relative w-full h-[660px] bg-[#0a0a0a] rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
          {isVideo ? (
            <video src={currentMediaUrl} controls autoPlay loop muted className="max-w-full max-h-[660px]" />
          ) : isSvg ? (
            <object
              data={currentMediaUrl}
              type="image/svg+xml"
              className="max-w-full max-h-[660px]"
              onLoad={handleImageLoad}
            >
              {/* Fallback to img if object fails */}
              <img
                src={currentMediaUrl}
                alt="Generated SVG"
                className={imageAspectRatio === 'landscape' ? 'w-full h-auto' : 'h-[660px] w-auto'}
                onLoad={handleImageLoad}
              />
            </object>
          ) : (
            <img
              src={currentMediaUrl}
              alt="Generated"
              className={imageAspectRatio === 'landscape' ? 'w-full h-auto' : 'h-[660px] w-auto'}
              onLoad={handleImageLoad}
            />
          )}
        </div>
      )}

      {/* Thumbnails */}
      {generation.output_urls && generation.output_urls.filter(isValidMediaUrl).length > 1 && (
        <div className="flex gap-2 items-center mb-4 ml-1 py-1">
          {generation.output_urls.filter(isValidMediaUrl).map((url, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all ${
                selectedImageIndex === index ? 'ring-2 ring-white ring-offset-2 ring-offset-[#101010]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isVideoUrl(url) ? (
                <div className="w-full h-full bg-[#1f1f1f] flex items-center justify-center">
                  <span className="text-xs">🎬</span>
                </div>
              ) : (
                <img src={url} alt={`Output ${index + 1}`} className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Info + Actions */}
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-3 w-[660px]">
          <p className="font-inter text-sm text-[#656565]">{formatDate(generation.created_at)}</p>
          {generation.prompt && (
            <div className="border border-[#2f2f2f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-inter text-base text-[#656565]">Prompt</p>
                <button onClick={handleCopyPrompt} className="hover:opacity-70">
                  {copied ? <span className="text-xs text-green-500">✓</span> : <Copy className="h-4 w-4 text-[#707070]" />}
                </button>
              </div>
              <p className="font-inter text-[15px] text-white">{generation.prompt}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
