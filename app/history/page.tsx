'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { formatDate } from '@/lib/utils';
import { Loader2, Download, Play, Trash2 } from 'lucide-react';

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

// Проверка, является ли action видео действием
function isVideoAction(action: string): boolean {
  return action.startsWith('video_');
}

// Простой компонент для отображения видео-плейсхолдера
function VideoPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#151515]">
      <div className="flex flex-col items-center gap-2">
        <Play className="h-8 w-8 lg:h-10 lg:w-10 text-[#656565]" />
        <span className="font-inter text-xs lg:text-sm text-[#656565]">Видео</span>
      </div>
    </div>
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Удалить эту генерацию?')) return;
    
    try {
      const response = await fetch(`/api/generations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Удаляем из локального состояния
        setGenerations(prev => prev.filter(g => g.id !== id));
      } else {
        console.error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <Header />

      <main className="flex-1 px-4 lg:px-20 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="font-inter font-medium text-xl lg:text-2xl text-white mb-1 lg:mb-2">
            История генераций
          </h1>
          <p className="font-inter text-xs lg:text-sm text-[#959595]">
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
            {/* Grid - 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="group cursor-pointer"
                  onClick={() => {
                    // Направляем на правильную страницу в зависимости от типа генерации
                    const basePath = isVideoAction(generation.action) ? '/video' : '/';
                    router.push(`${basePath}?generationId=${generation.id}`);
                  }}
                >
                  <div className="bg-[#101010] rounded-xl lg:rounded-2xl overflow-hidden hover:bg-[#1a1a1a] transition-colors">
                    {/* Image/Video with badge - square 1:1 */}
                    <div className="relative aspect-square bg-[#151515] rounded-lg lg:rounded-xl overflow-hidden">
                      {generation.output_urls?.[0] ? (
                        isVideoUrl(generation.output_urls[0]) ? (
                          <VideoPlaceholder />
                        ) : (
                          <Image
                            src={generation.output_urls[0]}
                            alt={generation.prompt || 'Generated image'}
                            fill
                            className="object-cover"
                            loading="lazy"
                            sizes="(max-width: 1024px) 50vw, 25vw"
                          />
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-inter text-xs lg:text-sm text-[#656565]">
                            {generation.status === 'processing'
                              ? 'Генерация...'
                              : 'Нет изображения'}
                          </span>
                        </div>
                      )}
                      
                      {/* Model badge - top right */}
                      <div className="absolute top-2 right-2 lg:top-3 lg:right-3 bg-black/60 backdrop-blur-sm rounded-md lg:rounded-lg px-1.5 py-1 lg:px-2.5 lg:py-1.5">
                        <span className="font-inter text-[10px] lg:text-xs text-white">
                          {generation.model_name}
                        </span>
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="p-3 lg:p-4">
                      {/* Prompt - multiline with ellipsis */}
                      <p className="font-inter text-xs lg:text-sm text-[#959595] leading-relaxed line-clamp-2 lg:line-clamp-3 mb-2 lg:mb-3">
                        {generation.prompt || 'Без промпта'}
                      </p>

                      {/* Date and action buttons */}
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-[10px] lg:text-xs text-[#656565]">
                          {formatDate(generation.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(e, generation.id)}
                            className="p-1.5 lg:p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] hover:border-red-500/50 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDownload(e, generation.output_urls?.[0] || '', generation.id)}
                            className="p-1.5 lg:p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f] transition-colors"
                            title="Скачать"
                          >
                            <Download className="h-3 w-3 lg:h-4 lg:w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 lg:gap-4 mt-6 lg:mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 lg:h-10 px-3 lg:px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-xs lg:text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="font-inter text-xs lg:text-sm text-[#959595]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 lg:h-10 px-3 lg:px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-xs lg:text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
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
