'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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

function isVideoUrl(url: string): boolean {
  return ['.mp4', '.webm', '.mov', '.avi', '.mkv'].some(ext => url.toLowerCase().includes(ext));
}

function isVideoAction(action: string): boolean {
  return action.startsWith('video_');
}

function isTextAction(action: string): boolean {
  return action.startsWith('analyze_');
}

function isValidMediaUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

export default function HistoryPage() {
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchGenerations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/generations/list?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const handleDownload = async (e: React.MouseEvent, url: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${id}.${isVideoUrl(url) ? 'mp4' : 'png'}`;
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
      const response = await fetch(`/api/generations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setGenerations(prev => prev.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleClick = (generation: Generation) => {
    let basePath = '/';
    if (isVideoAction(generation.action)) basePath = '/video';
    else if (isTextAction(generation.action)) basePath = '/analyze';
    router.push(`${basePath}?generationId=${generation.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      <main className="flex-1 px-4 lg:px-20 py-6 lg:py-8">
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
                className="inline-block bg-[#f0f0f5] rounded-xl px-4 py-3 font-inter font-medium text-base text-[#141414] hover:bg-white"
              >
                Создать первую генерацию
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {generations.map((generation) => (
                <div
                  key={generation.id}
                  className="group cursor-pointer"
                  onClick={() => handleClick(generation)}
                >
                  <div className="bg-[#101010] rounded-xl lg:rounded-2xl overflow-hidden hover:bg-[#1a1a1a]">
                    <div className="relative aspect-square bg-[#151515] rounded-lg lg:rounded-xl overflow-hidden">
                      {generation.output_urls?.[0] && isValidMediaUrl(generation.output_urls[0]) ? (
                        isVideoUrl(generation.output_urls[0]) ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-8 w-8 lg:h-10 lg:w-10 text-[#656565]" />
                          </div>
                        ) : (
                          <img
                            src={generation.output_urls[0]}
                            alt={generation.prompt || 'Generated'}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        )
                      ) : isTextAction(generation.action) ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl">📝</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-inter text-xs lg:text-sm text-[#656565]">
                            {generation.status === 'processing' ? 'Генерация...' : 'Нет изображения'}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2 lg:top-3 lg:right-3 bg-black/60 backdrop-blur-sm rounded-md lg:rounded-lg px-1.5 py-1 lg:px-2.5 lg:py-1.5">
                        <span className="font-inter text-[10px] lg:text-xs text-white">
                          {generation.model_name}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 lg:p-4">
                      <p className="font-inter text-xs lg:text-sm text-[#959595] line-clamp-2 lg:line-clamp-3 mb-2 lg:mb-3">
                        {generation.prompt || 'Без промпта'}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-inter text-[10px] lg:text-xs text-[#656565]">
                          {formatDate(generation.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDelete(e, generation.id)}
                            className="p-1.5 lg:p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]"
                          >
                            <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                          </button>
                          {generation.output_urls?.[0] && (
                            <button
                              onClick={(e) => handleDownload(e, generation.output_urls![0], generation.id)}
                              className="p-1.5 lg:p-2 rounded-md border border-[#2f2f2f] text-white hover:bg-[#1f1f1f]"
                            >
                              <Download className="h-3 w-3 lg:h-4 lg:w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 lg:gap-4 mt-6 lg:mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 lg:h-10 px-3 lg:px-4 rounded-xl border border-[#2f2f2f] font-inter text-xs lg:text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                  Назад
                </button>
                <span className="font-inter text-xs lg:text-sm text-[#959595]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 lg:h-10 px-3 lg:px-4 rounded-xl border border-[#2f2f2f] font-inter text-xs lg:text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50"
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
