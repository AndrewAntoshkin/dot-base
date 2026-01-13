'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Download, RotateCcw, Copy, WifiOff, Maximize2, Check } from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { QuickActions } from '@/components/quick-actions';
import { formatDate } from '@/lib/utils';
import { fetchWithTimeout, isOnline, isSlowConnection } from '@/lib/network-utils';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { RecentGenerations, SessionGeneration } from '@/components/recent-generations';

interface OutputPanelProps {
  generationId: string | null;
  onRegenerate?: (prompt: string, settings: Record<string, any>, modelId: string) => void;
  isMobile?: boolean;
  sessionGenerations?: SessionGeneration[];
  onSelectGeneration?: (id: string) => void;
  onGenerationUpdate?: (id: string, updates: Partial<SessionGeneration>) => void;
  /** Cached generation from session (for instant preview while loading full data) */
  cachedGeneration?: SessionGeneration | null;
  /** Callback для открытия режима слоёв */
  onOpenLayers?: (imageUrl: string) => void;
}

interface Creator {
  id: string;
  email: string;
  name: string;
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
  settings: Record<string, any> & { auto_retry_count?: number };
  is_owner?: boolean;
  creator?: Creator | null;
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

// Компонент badge создателя
function CreatorBadge({ creator }: { creator: Creator }) {
  const initials = creator.name?.substring(0, 2).toUpperCase() || '??';
  
  return (
    <div className="inline-flex items-center gap-2 bg-[#1a1a1a] rounded-full px-3 py-1.5">
      <div className="w-6 h-6 rounded-full bg-[#6366F1] flex items-center justify-center">
        <span className="font-inter font-semibold text-[10px] text-white">
          {initials}
        </span>
      </div>
      <span className="font-inter text-[13px] text-white">
        {creator.email || creator.name}
      </span>
    </div>
  );
}

// Компонент кнопки копирования с тултипом
interface CopyButtonProps {
  onClick: () => void;
  copied: boolean;
  size?: 'sm' | 'md';
}

function CopyImageButton({ onClick, copied, size = 'md' }: CopyButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const padding = size === 'sm' ? 'p-2' : 'p-[10px]';
  const borderRadius = size === 'sm' ? 'rounded-md' : 'rounded-[12px]';
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        onClick={onClick} 
        className={`${padding} ${borderRadius} border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors`}
      >
        {copied ? <Check className={`${iconSize} text-green-500`} /> : <Copy className={iconSize} />}
      </button>
      
      {/* Tooltip */}
      <div 
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-all duration-200 pointer-events-none ${
          isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'
        }`}
        style={{ zIndex: 9999 }}
      >
        <div 
          className="p-3 bg-[#1A1A1A] rounded-xl whitespace-nowrap"
          style={{ boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.8)' }}
        >
          <p className="font-inter font-medium text-[13px] text-white">Скопировать изображение</p>
          <p className="font-inter text-[11px] text-[#959595]">Cmd+V в Figma, Photoshop и др.</p>
        </div>
        {/* Arrow */}
        <div className="flex justify-center -mt-[1px]">
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#1A1A1A]" />
        </div>
      </div>
    </div>
  );
}

export function OutputPanel({ 
  generationId, 
  onRegenerate, 
  isMobile = false,
  sessionGenerations = [],
  onSelectGeneration,
  onGenerationUpdate,
  cachedGeneration,
  onOpenLayers,
}: OutputPanelProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isFullscreenViewerOpen, setIsFullscreenViewerOpen] = useState(false);
  
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
          timeout: isSlowConnection() ? 45000 : 30000, // Увеличили: Replicate API может долго отвечать
          retries: 2,
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
        
        // Обновляем сессионную генерацию
        if (onGenerationUpdate && generationId) {
          onGenerationUpdate(generationId, {
            status: data.status,
            output_urls: data.output_urls,
          });
        }

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

  // Скачивание одного файла
  const downloadSingleFile = async (url: string, index: number, total: number) => {
    if (!generation) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      const suffix = total > 1 ? `-${index + 1}` : '';
      
      // Для видео и SVG - скачиваем как есть
      if (isVideoUrl(url)) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `generation-${generation.id}${suffix}.mp4`;
        link.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }
      
      if (isSvgUrl(url)) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `generation-${generation.id}${suffix}.svg`;
        link.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }
      
      // Для изображений - конвертируем в реальный PNG через canvas
      const imageBitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imageBitmap, 0, 0);
      
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create PNG blob'));
        }, 'image/png');
      });
      
      const blobUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${generation.id}${suffix}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error for file', index, error);
    }
  };

  const handleDownload = async () => {
    if (!generation?.output_urls?.length) return;
    
    const urls = generation.output_urls;
    
    // Скачиваем все файлы с небольшой задержкой между ними
    for (let i = 0; i < urls.length; i++) {
      await downloadSingleFile(urls[i], i, urls.length);
      // Небольшая задержка чтобы браузер успел обработать
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
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

  const handleCopyImage = async () => {
    const url = generation?.output_urls?.[selectedImageIndex] || generation?.output_urls?.[0];
    if (!url || !generation) return;

    try {
      // ClipboardItem может принимать Promise - это сохраняет user gesture
      // Создаём Promise который резолвится в PNG blob
      const pngBlobPromise = (async () => {
        const response = await fetch(url);
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

  // Loading - but show cached preview if available
  if (isLoading && !generation) {
    // If we have a cached completed generation with output, show it immediately
    const hasCachedPreview = cachedGeneration?.status === 'completed' && 
                             cachedGeneration?.output_urls && 
                             cachedGeneration.output_urls.length > 0;
    
    if (hasCachedPreview && cachedGeneration) {
      const previewUrl = cachedGeneration.output_urls![0];
      const isPreviewVideo = isVideoUrl(previewUrl);
      
      return (
        <div className="flex flex-col w-full">
          {/* Cached preview - instant display */}
          <div className={`relative w-full ${isMobile ? '' : 'h-[660px]'} bg-[#0a0a0a] rounded-2xl overflow-hidden mb-4 flex items-center justify-center`}>
            {isPreviewVideo ? (
              <video 
                src={previewUrl} 
                controls 
                loop 
                muted 
                preload="metadata"
                className="max-w-full max-h-[660px]"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Generated"
                className="max-w-full max-h-[660px] object-contain"
              />
            )}
            {/* Loading indicator overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span className="font-inter text-xs text-white">Загрузка...</span>
            </div>
          </div>

          {/* Recent Generations */}
          {sessionGenerations.length > 0 && onSelectGeneration && (
            <div className="mt-4">
              <RecentGenerations
                generations={sessionGenerations}
                currentGenerationId={generationId}
                onSelect={onSelectGeneration}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      );
    }
    
    // No cached preview - show loading spinner
    return (
      <div className="flex flex-col w-full">
        {/* Loading area - fixed 660px height on desktop */}
        <div className={`flex items-center justify-center ${isMobile ? 'min-h-[400px]' : 'h-[660px]'} bg-[#0a0a0a] rounded-2xl mb-4`}>
          <div className={isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}>
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
              <p className="font-inter text-sm text-[#959595]">Загрузка...</p>
            </div>
          </div>
        </div>

        {/* Recent Generations - visible during loading */}
        {sessionGenerations.length > 0 && onSelectGeneration && (
          <div className="mt-4">
            <RecentGenerations
              generations={sessionGenerations}
              currentGenerationId={generationId}
              onSelect={onSelectGeneration}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    );
  }

  if (!generation) return null;

  // Processing
  if (generation.status === 'processing' || generation.status === 'pending') {
    const retryCount = generation.settings?.auto_retry_count || 0;
    const maxRetries = 3;
    
    return (
      <div className="flex flex-col w-full">
        {/* Loading area - fixed 660px height on desktop */}
        <div className={`flex items-center justify-center ${isMobile ? 'min-h-[400px]' : 'h-[660px]'} bg-[#0a0a0a] rounded-2xl mb-4`}>
          <div className={isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}>
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
              <div className="text-center">
                <p className="font-inter font-medium text-base text-white mb-1">
                  {retryCount > 0 ? `Повторная попытка ${retryCount}/${maxRetries}...` : 'Генерация...'}
                </p>
                <p className="font-inter text-sm text-[#959595]">{generation.model_name}</p>
                {retryCount > 0 && (
                  <p className="font-inter text-xs text-[#6366F1] mt-1">Автоматическая повторная попытка</p>
                )}
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

        {/* Recent Generations - visible during processing */}
        {sessionGenerations.length > 0 && onSelectGeneration && (
          <div className="mt-4">
            <RecentGenerations
              generations={sessionGenerations}
              currentGenerationId={generationId}
              onSelect={onSelectGeneration}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    );
  }

  // Failed - используем красивый ErrorState компонент
  if (generation.status === 'failed') {
    const retryCount = generation.settings?.auto_retry_count || 0;
    
    return (
      <div className="flex flex-col w-full">
        <ErrorState
          errorMessage={generation.error_message || 'Неизвестная ошибка'}
          retryCount={retryCount}
          onRetry={onRegenerate ? handleRegenerate : undefined}
          isMobile={isMobile}
        />

        {/* Recent Generations - visible on error */}
        {sessionGenerations.length > 0 && onSelectGeneration && (
          <div className="mt-8">
            <RecentGenerations
              generations={sessionGenerations}
              currentGenerationId={generationId}
              onSelect={onSelectGeneration}
              isMobile={isMobile}
            />
          </div>
        )}
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
          <div className="relative w-full bg-[#131313] rounded-[12px] overflow-hidden group">
            {isVideo ? (
              <video 
                src={currentMediaUrl} 
                controls 
                loop 
                muted 
                playsInline 
                preload="metadata"
                className="w-full h-auto"
              />
            ) : isSvgMobile ? (
              <object
                data={currentMediaUrl}
                type="image/svg+xml"
                className="w-full h-auto"
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
            {/* Fullscreen button - top right corner */}
            {!isVideo && (
              <button
                onClick={() => setIsFullscreenViewerOpen(true)}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-opacity opacity-0 group-hover:opacity-100 z-10"
                title="Открыть на весь экран"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
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

        {/* Quick Actions - быстрые действия с результатом */}
        {currentMediaUrl && isValidUrl && (
          <QuickActions
            mediaUrl={currentMediaUrl}
            mediaType={isVideo ? 'video' : 'image'}
            compact
            onOpenLayers={!isVideo ? onOpenLayers : undefined}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]" title="Повторить">
            <RotateCcw className="h-5 w-5" />
          </button>
          {!isVideo && (
            <CopyImageButton onClick={handleCopyImage} copied={copiedImage} size="md" />
          )}
          <button onClick={handleDownload} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]" title="Скачать">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Creator badge - показываем для чужих генераций */}
        {!generation.is_owner && generation.creator && (
          <div className="mb-3">
            <CreatorBadge creator={generation.creator} />
          </div>
        )}

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

        {/* Recent Generations - Mobile */}
        {sessionGenerations.length > 0 && onSelectGeneration && (
          <div className="mt-6">
            <RecentGenerations
              generations={sessionGenerations}
              currentGenerationId={generationId}
              onSelect={onSelectGeneration}
              isMobile
            />
          </div>
        )}
      </div>
    );
  }

  const isSvg = currentMediaUrl ? isSvgUrl(currentMediaUrl) : false;

  // Desktop result
  return (
    <div className="flex flex-col w-full">
      {isValidUrl && (
        <div className="relative w-full h-[660px] bg-[#0a0a0a] rounded-2xl overflow-hidden mb-4 flex items-center justify-center group">
          {isVideo ? (
            <video 
              src={currentMediaUrl} 
              controls 
              loop 
              muted 
              preload="metadata"
              className="max-w-full max-h-[660px]"
            />
          ) : isSvg ? (
            <object
              data={currentMediaUrl}
              type="image/svg+xml"
              className="max-w-full max-h-[660px]"
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
          {/* Fullscreen button - top right corner */}
          {!isVideo && (
            <button
              onClick={() => setIsFullscreenViewerOpen(true)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-opacity opacity-0 group-hover:opacity-100 z-10"
              title="Открыть на весь экран"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
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

      {/* Quick Actions - быстрые действия с результатом */}
      {currentMediaUrl && isValidUrl && (
        <div className="mb-4">
          <QuickActions
            mediaUrl={currentMediaUrl}
            mediaType={isVideo ? 'video' : 'image'}
            onOpenLayers={!isVideo ? onOpenLayers : undefined}
          />
        </div>
      )}

      {/* Creator badge - показываем для чужих генераций */}
      {!generation.is_owner && generation.creator && (
        <div className="mb-4">
          <CreatorBadge creator={generation.creator} />
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
          <button onClick={handleRegenerate} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]" title="Повторить">
            <RotateCcw className="h-4 w-4" />
          </button>
          {!isVideo && (
            <CopyImageButton onClick={handleCopyImage} copied={copiedImage} size="sm" />
          )}
          <button onClick={handleDownload} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]" title="Скачать">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Fullscreen Image Viewer */}
      {currentMediaUrl && !isVideo && isValidUrl && (
        <ImageFullscreenViewer
          imageUrl={currentMediaUrl}
          isOpen={isFullscreenViewerOpen}
          onClose={() => setIsFullscreenViewerOpen(false)}
          alt={`Generated by ${generation.model_name}`}
        />
      )}

      {/* Recent Generations - Desktop */}
      {sessionGenerations.length > 0 && onSelectGeneration && (
        <div className="mt-8">
          <RecentGenerations
            generations={sessionGenerations}
            currentGenerationId={generationId}
            onSelect={onSelectGeneration}
          />
        </div>
      )}
    </div>
  );
}
