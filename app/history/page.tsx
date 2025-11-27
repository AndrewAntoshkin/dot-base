'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { formatDate } from '@/lib/utils';
import { Loader2, Download, Play } from 'lucide-react';

interface Generation {
  id: string;
  action: string;
  model_name: string;
  status: string;
  output_urls: string[] | null;
  prompt: string | null;
  created_at: string;
}

// Функция определения типа медиа по URL
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const lowercaseUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowercaseUrl.includes(ext));
}

// Компонент для отображения превью видео (первый кадр)
function VideoThumbnail({ src, alt }: { src: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Устанавливаем размер canvas равным видео
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Рисуем первый кадр
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Конвертируем в data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnailUrl(dataUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Error capturing video frame:', err);
      setError(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      // Переходим к первому кадру
      video.currentTime = 0.1; // Немного вперёд для надёжности
    };

    const handleSeeked = () => {
      captureFrame();
    };

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [captureFrame]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
        <div className="flex flex-col items-center gap-2">
          <Play className="h-8 w-8 text-[#656565]" />
          <span className="font-inter text-xs text-[#656565]">Видео</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Скрытый video элемент для захвата кадра */}
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
          <Loader2 className="h-6 w-6 animate-spin text-[#656565]" />
        </div>
      )}
      
      {thumbnailUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Иконка Play поверх превью */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchGenerations();
  }, [page]);

  const fetchGenerations = async () => {
    try {
      const response = await fetch(`/api/generations/list?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      // Определяем расширение по типу файла
      const extension = isVideoUrl(url) ? 'mp4' : 'png';
      link.download = `generation-${id}.${extension}`;
      link.click();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <Header />

      <main className="flex-1 px-20 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-inter font-medium text-2xl text-white mb-2">
            История генераций
          </h1>
          <p className="font-inter text-sm text-[#959595]">
            Все ваши созданные изображения и видео
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="font-inter text-base text-[#959595] mb-6">
                У вас пока нет генераций
              </p>
              <Link
                href="/"
                className="inline-block bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white transition-colors"
              >
                Создать первую генерацию
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Grid - 4 columns */}
            <div className="grid grid-cols-4 gap-4">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/?generationId=${generation.id}`)}
                >
                  <div className="bg-[#101010] rounded-2xl overflow-hidden hover:bg-[#1a1a1a] transition-colors">
                    {/* Image/Video with badge - square 1:1 */}
                    <div className="relative aspect-square bg-[#151515]">
                      {generation.output_urls?.[0] ? (
                        isVideoUrl(generation.output_urls[0]) ? (
                          <VideoThumbnail
                            src={generation.output_urls[0]}
                            alt={generation.prompt || 'Generated video'}
                          />
                        ) : (
                          <Image
                            src={generation.output_urls[0]}
                            alt={generation.prompt || 'Generated image'}
                            fill
                            className="object-cover"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-inter text-sm text-[#656565]">
                            {generation.status === 'processing'
                              ? 'Генерация...'
                              : 'Нет изображения'}
                          </span>
                        </div>
                      )}
                      
                      {/* Model badge - top right */}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                        <span className="font-inter text-xs text-white">
                          {generation.model_name}
                        </span>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-4">
                      {/* Prompt - multiline with ellipsis */}
                      <p className="font-inter text-sm text-[#959595] leading-relaxed line-clamp-3 mb-3">
                        {generation.prompt || 'Без промпта'}
                      </p>

                      {/* Date and download button */}
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-[#656565]">
                          {formatDate(generation.created_at)}
                        </span>
                        <button
                          onClick={(e) => handleDownload(e, generation.output_urls?.[0] || '', generation.id)}
                          className="p-2 rounded-lg border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                          title="Скачать"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="font-inter text-sm text-[#959595]">
                  Страница {page} из {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Вперед
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

