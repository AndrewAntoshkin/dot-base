'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Download, RotateCcw, Copy } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface OutputPanelProps {
  generationId: string | null;
  onRegenerate?: (prompt: string, settings: Record<string, any>, modelId: string) => void;
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

export function OutputPanel({ generationId, onRegenerate }: OutputPanelProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const [copied, setCopied] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (!generationId) {
      setGeneration(null);
      setSelectedImageIndex(0);
      return;
    }

    setIsLoading(true);
    setSelectedImageIndex(0); // Сбрасываем выбор при смене генерации

    const fetchGeneration = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setGeneration(data);

          // Poll for updates if still processing
          if (data.status === 'processing' || data.status === 'pending') {
            setTimeout(fetchGeneration, 2000);
          }
        }
      } catch (error) {
        console.error('Error fetching generation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeneration();
  }, [generationId]);

  const handleDownload = async () => {
    const url = generation?.output_urls?.[selectedImageIndex] || generation?.output_urls?.[0];
    if (!url || !generation) return;

    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    // Добавляем индекс если несколько файлов
    const suffix = generation.output_urls && generation.output_urls.length > 1 
      ? `-${selectedImageIndex + 1}` 
      : '';
    // Определяем расширение по типу контента
    const extension = isVideoUrl(url) ? 'mp4' : 'png';
    link.download = `generation-${generation.id}${suffix}.${extension}`;
    link.click();

    URL.revokeObjectURL(blobUrl);
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
      setImageAspectRatio('landscape'); // Горизонтальная - по ширине
    } else if (ratio < 0.9) {
      setImageAspectRatio('portrait'); // Вертикальная - по высоте
    } else {
      setImageAspectRatio('square'); // Квадратная - по высоте
    }
  };

  if (!generationId && !generation) {
    return (
      <div className="flex items-center justify-center min-h-[660px] px-20">
        <div className="flex gap-12 w-full">
          {/* Step 1 - Выбор модели */}
          <div className="flex-1 flex flex-col py-2">
            <Image
              src="/numbers/1.png"
              alt="1"
              width={36}
              height={64}
              className="mb-0"
            />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">
                Выбор модели
              </h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Выберите действие и модель для начала генерации
              </p>
            </div>
          </div>

          {/* Step 2 - Промпт */}
          <div className="flex-1 flex flex-col py-2">
            <Image
              src="/numbers/2.png"
              alt="2"
              width={55}
              height={64}
              className="mb-0"
            />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">
                Промпт
              </h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Опишите что вы хотите создать или изменить
              </p>
            </div>
          </div>

          {/* Step 3 - Настройки */}
          <div className="flex-1 flex flex-col py-2">
            <Image
              src="/numbers/3.png"
              alt="3"
              width={53}
              height={64}
              className="mb-0"
            />
            <div className="flex flex-col gap-2 py-6">
              <h3 className="font-inter font-semibold text-xl text-white">
                Настройки
              </h3>
              <p className="font-inter text-sm text-[#9c9c9c] leading-5">
                Настройте параметры генерации для лучшего результата
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!generation) return null;

  // Processing state - loader and text centered
  if (generation.status === 'processing' || generation.status === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-[660px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <div className="text-center">
            <p className="font-inter font-medium text-base text-white mb-1">
              Генерация...
            </p>
            <p className="font-inter text-sm text-[#959595]">
              Модель: {generation.model_name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (generation.status === 'failed') {
    // Определяем тип ошибки для понятного feedback
    const errorMsg = generation.error_message || 'Неизвестная ошибка';
    const isRetryError = errorMsg.toLowerCase().includes('retry') || errorMsg.toLowerCase().includes('multiple');
    const isSafetyError = errorMsg.toLowerCase().includes('safety') || errorMsg.toLowerCase().includes('blocked') || errorMsg.toLowerCase().includes('flagged');
    
    let suggestion = '';
    if (isRetryError) {
      suggestion = 'Попробуйте: упростить промпт, использовать другое изображение или изменить настройки.';
    } else if (isSafetyError) {
      suggestion = 'Контент заблокирован фильтром безопасности. Измените промпт или изображение.';
    }
    
    return (
      <div className="flex items-center justify-center min-h-[660px]">
        <div className="text-center max-w-md px-4">
          <p className="font-inter font-medium text-base text-red-500 mb-2">
            Ошибка генерации
          </p>
          <p className="font-inter text-sm text-[#959595] mb-3">
            {errorMsg}
          </p>
          {suggestion && (
            <p className="font-inter text-xs text-[#656565]">
              💡 {suggestion}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Получаем URL текущего выбранного результата
  const currentMediaUrl = generation.output_urls?.[selectedImageIndex] || generation.output_urls?.[0];
  const isVideo = currentMediaUrl ? isVideoUrl(currentMediaUrl) : false;

  // Completed state - result with image/video in gray area (660px height)
  return (
    <div className="flex flex-col w-full">
      {/* Gray area 660px - media container */}
      {currentMediaUrl && (
        <div className="relative w-full h-[660px] bg-[#0a0a0a] rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
          {isVideo ? (
            <video
              src={currentMediaUrl}
              controls
              autoPlay
              loop
              muted
              className="max-w-full max-h-[660px] w-auto h-auto"
            />
          ) : (
            <Image
              src={currentMediaUrl}
              alt="Generated image"
              width={1200}
              height={660}
              className={
                imageAspectRatio === 'landscape'
                  ? 'w-full h-auto' // Горизонтальная - по ширине в края
                  : 'h-[660px] w-auto' // Вертикальная или квадрат - по высоте полностью
              }
              onLoad={handleImageLoad}
              priority
            />
          )}
        </div>
      )}

      {/* Thumbnails row - 40x40px with gap 8px - КЛИКАБЕЛЬНЫЕ с белой обводкой */}
      {generation.output_urls && generation.output_urls.length > 1 && (
        <div className="flex gap-2 items-center mb-4 ml-1 py-1">
          {generation.output_urls.map((url, index) => {
            const isThumbVideo = isVideoUrl(url);
            return (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`
                  relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all
                  ${selectedImageIndex === index 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#050505]' 
                    : 'opacity-70 hover:opacity-100'
                  }
                `}
              >
                {isThumbVideo ? (
                  <div className="w-full h-full bg-[#1f1f1f] flex items-center justify-center">
                    <span className="text-xs">🎬</span>
                  </div>
                ) : (
                  <Image
                    src={url}
                    alt={`Output ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Date and prompt block + action buttons */}
      <div className="flex items-start justify-between w-full">
        {/* Left side - date + prompt (660px) */}
        <div className="flex flex-col gap-3 w-[660px]">
          {/* Date */}
          <p className="font-inter font-medium text-sm text-[#656565]">
            Сгенерировано за {formatDate(generation.created_at)}
          </p>

          {/* Prompt block with border */}
          {generation.prompt && (
            <div className="border border-[#2f2f2f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-inter font-medium text-base text-[#656565]">
                  Prompt
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="p-0 hover:opacity-70 transition-opacity flex items-center gap-1"
                  title="Копировать промпт"
                  disabled={copied}
                >
                  {copied ? (
                    <span className="font-inter text-xs text-green-500">Скопировано</span>
                  ) : (
                    <Copy className="h-4 w-4 text-[#707070]" />
                  )}
                </button>
              </div>
              <p className="font-inter text-[15px] text-white leading-[22px]">
                {generation.prompt}
              </p>
            </div>
          )}
        </div>

        {/* Right side - action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleRegenerate}
            className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
            title="Переделать"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
            title="Скачать"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

