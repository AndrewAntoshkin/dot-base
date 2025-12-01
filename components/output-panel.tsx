'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, Download, RotateCcw, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  getGenerationPollingInterval,
  getNetworkQuality,
  getImageQuality,
  isPageVisible,
  shouldUseImageProxy,
  getProxiedImageUrl,
  NetworkQuality,
} from '@/lib/network-utils';

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

// Функция определения типа медиа по URL
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
}

// Проверка, является ли строка валидным URL медиа
function isValidMediaUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

// Компонент для изображения с поддержкой прокси
function ProxyImage({ 
  src, 
  alt, 
  className, 
  fill, 
  width, 
  height, 
  priority,
  sizes,
  quality,
  onLoad,
  useProxy 
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  useProxy: boolean;
}) {
  const proxiedSrc = getProxiedImageUrl(src, useProxy);
  const isProxied = proxiedSrc.startsWith('/api/proxy/');
  
  // Если прокси - используем обычный img (Next.js Image не работает с внутренними API routes)
  if (isProxied) {
    return (
      <img
        src={proxiedSrc}
        alt={alt}
        className={className}
        style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } : undefined}
        onLoad={onLoad as any}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }
  
  // Обычный Next.js Image для не-прокси URL
  if (fill) {
    return (
      <Image
        src={proxiedSrc}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
        quality={quality}
        onLoad={onLoad}
      />
    );
  }
  
  return (
    <Image
      src={proxiedSrc}
      alt={alt}
      width={width || 800}
      height={height || 800}
      className={className}
      priority={priority}
      sizes={sizes}
      quality={quality}
      onLoad={onLoad}
    />
  );
}

export function OutputPanel({ generationId, onRegenerate, isMobile = false }: OutputPanelProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const [copied, setCopied] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Refs
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const generationIdRef = useRef(generationId);
  
  // Синхронно определяем настройки (не блокирует рендер!)
  const useProxy = shouldUseImageProxy();
  const networkQuality = getNetworkQuality();
  const imageQuality = getImageQuality(networkQuality);

  // Обновляем ref при изменении generationId
  useEffect(() => {
    generationIdRef.current = generationId;
  }, [generationId]);

  // Функция загрузки генерации
  const fetchGeneration = useCallback(async (id: string) => {
    if (!isPageVisible() || !isMountedRef.current) return;

    try {
      const response = await fetch(`/api/generations/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok || !isMountedRef.current) return;
      
      const data = await response.json();
      
      // Проверяем что ID не изменился пока ждали ответ
      if (generationIdRef.current !== id || !isMountedRef.current) return;
      
      setGeneration(data);
      setIsLoading(false);

      // Если ещё обрабатывается - продолжаем polling
      if (data.status === 'processing' || data.status === 'pending') {
        const interval = getGenerationPollingInterval(getNetworkQuality());
        pollTimeoutRef.current = setTimeout(() => fetchGeneration(id), interval);
      }
    } catch (error) {
      console.error('Error fetching generation:', error);
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // Основной effect для загрузки
  useEffect(() => {
    isMountedRef.current = true;
    
    // Очищаем предыдущий timeout
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    
    if (!generationId) {
      setGeneration(null);
      setSelectedImageIndex(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSelectedImageIndex(0);
    fetchGeneration(generationId);

    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [generationId, fetchGeneration]);

  const handleDownload = async () => {
    const originalUrl = generation?.output_urls?.[selectedImageIndex] || generation?.output_urls?.[0];
    if (!originalUrl || !generation) return;

    try {
      // Всегда скачиваем оригинал, не прокси
      const response = await fetch(originalUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const suffix = generation.output_urls && generation.output_urls.length > 1 
        ? `-${selectedImageIndex + 1}` 
        : '';
      const extension = isVideoUrl(originalUrl) ? 'mp4' : 'png';
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
      console.error('Failed to copy:', err);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const ratio = width / height;

    if (ratio > 1.1) {
      setImageAspectRatio('landscape');
    } else if (ratio < 0.9) {
      setImageAspectRatio('portrait');
    } else {
      setImageAspectRatio('square');
    }
  };

  // Desktop empty state
  if (!generationId && !generation && !isMobile) {
    return (
      <div className="flex items-center justify-center min-h-[660px] px-20">
        <div className="flex gap-12 w-full">
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/1.png" alt="1" width={36} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Выбор модели</h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Выберите действие и модель для начала генерации
              </p>
            </div>
          </div>
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/2.png" alt="2" width={55} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Промпт</h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Опишите что вы хотите создать или изменить
              </p>
            </div>
          </div>
          <div className="flex-1 flex flex-col py-2">
            <img src="/numbers/3.png" alt="3" width={53} height={64} className="mb-0" />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">Настройки</h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Настройте параметры генерации для лучшего результата
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile empty state  
  if (!generationId && !generation && isMobile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center justify-center text-center px-8">
          <div className="bg-[#131313] rounded-2xl p-6 w-full">
            <p className="font-inter text-[14px] text-[#656565]">
              Выберите модель и настройте параметры во вкладке Input для начала генерации
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !generation) {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={`flex flex-col items-center gap-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}`}>
          <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
          <p className="font-inter text-sm text-[#959595]">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!generation) return null;

  // Processing state
  if (generation.status === 'processing' || generation.status === 'pending') {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={`flex flex-col items-center gap-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}`}>
          <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
          <div className="text-center">
            <p className="font-inter font-medium text-base text-white mb-1">Генерация...</p>
            <p className="font-inter text-sm text-[#959595]">Модель: {generation.model_name}</p>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (generation.status === 'failed') {
    const errorMsg = generation.error_message || 'Неизвестная ошибка';
    
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
        <div className={`text-center max-w-md px-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-6 mx-4' : ''}`}>
          <p className="font-inter font-medium text-base text-red-500 mb-2">Ошибка генерации</p>
          <p className="font-inter text-sm text-[#959595]">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // Получаем URL результата
  const rawMediaUrl = generation.output_urls?.[selectedImageIndex] || generation.output_urls?.[0];
  const currentMediaUrl = rawMediaUrl && isValidMediaUrl(rawMediaUrl) ? rawMediaUrl : null;
  const isVideo = currentMediaUrl ? isVideoUrl(currentMediaUrl) : false;

  // Mobile completed state
  if (isMobile) {
    return (
      <div className="flex flex-col w-full gap-6">
        {currentMediaUrl && (
          <div className="relative w-full bg-[#131313] rounded-[12px] overflow-hidden">
            {isVideo ? (
              <video src={currentMediaUrl} controls autoPlay loop muted playsInline className="w-full h-auto" />
            ) : (
              <ProxyImage
                src={currentMediaUrl}
                alt="Generated image"
                width={600}
                height={600}
                className="w-full h-auto"
                onLoad={handleImageLoad}
                priority
                useProxy={useProxy}
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
                  <ProxyImage src={url} alt={`Output ${index + 1}`} fill className="object-cover" useProxy={useProxy} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button onClick={handleDownload} className="p-[10px] rounded-[12px] border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-3">
          <p className="font-inter font-medium text-sm text-[#656565]">
            Сгенерировано за {formatDate(generation.created_at)}
          </p>
          {generation.prompt && (
            <div className="border border-[#2f2f2f] rounded-[16px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-inter font-medium text-[14px] text-[#656565]">Prompt</p>
                <button onClick={handleCopyPrompt} className="p-1 hover:opacity-70" disabled={copied}>
                  {copied ? <span className="text-xs text-green-500">Скопировано</span> : <Copy className="h-4 w-4 text-[#707070]" />}
                </button>
              </div>
              <p className="font-inter text-[15px] text-white leading-[22px]">{generation.prompt}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop completed state
  return (
    <div className="flex flex-col w-full">
      {currentMediaUrl && (
        <div className="relative w-full h-[660px] bg-[#0a0a0a] rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
          {isVideo ? (
            <video src={currentMediaUrl} controls autoPlay loop muted className="max-w-full max-h-[660px] w-auto h-auto" />
          ) : (
            <ProxyImage
              src={currentMediaUrl}
              alt="Generated image"
              width={1200}
              height={660}
              quality={imageQuality}
              className={imageAspectRatio === 'landscape' ? 'w-full h-auto' : 'h-[660px] w-auto'}
              onLoad={handleImageLoad}
              priority
              useProxy={useProxy}
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
                selectedImageIndex === index ? 'ring-2 ring-white ring-offset-2 ring-offset-[#050505]' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isVideoUrl(url) ? (
                <div className="w-full h-full bg-[#1f1f1f] flex items-center justify-center">
                  <span className="text-xs">🎬</span>
                </div>
              ) : (
                <ProxyImage src={url} alt={`Output ${index + 1}`} fill className="object-cover" useProxy={useProxy} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Date and prompt + buttons */}
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-3 w-[660px]">
          <p className="font-inter font-medium text-sm text-[#656565]">
            Сгенерировано за {formatDate(generation.created_at)}
          </p>
          {generation.prompt && (
            <div className="border border-[#2f2f2f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-inter font-medium text-base text-[#656565]">Prompt</p>
                <button onClick={handleCopyPrompt} className="p-0 hover:opacity-70" disabled={copied}>
                  {copied ? <span className="text-xs text-green-500">Скопировано</span> : <Copy className="h-4 w-4 text-[#707070]" />}
                </button>
              </div>
              <p className="font-inter text-[15px] text-white leading-[22px]">{generation.prompt}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
