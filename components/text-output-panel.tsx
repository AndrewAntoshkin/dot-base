'use client';

import { useEffect, useState } from 'react';
import { Loader2, Copy, Download, RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface TextOutputPanelProps {
  generationId: string | null;
  onRegenerate?: (prompt: string, settings: Record<string, any>, modelId: string) => void;
  isMobile?: boolean;
}

interface Generation {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  output_urls: string[] | null;
  output_text: string | null;
  error_message: string | null;
  prompt: string | null;
  model_id: string;
  model_name: string;
  action: string;
  created_at: string;
  processing_time_ms: number | null;
  settings: Record<string, any>;
}

export function TextOutputPanel({ generationId, onRegenerate, isMobile = false }: TextOutputPanelProps) {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!generationId) {
      setGeneration(null);
      return;
    }

    setIsLoading(true);
    let isMounted = true;
    let pollTimeoutId: NodeJS.Timeout | null = null;

    const fetchGeneration = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}`, {
          credentials: 'include',
        });
        if (response.ok && isMounted) {
          const data = await response.json();
          setGeneration(data);

          // Poll for updates if still processing
          if ((data.status === 'processing' || data.status === 'pending') && isMounted) {
            pollTimeoutId = setTimeout(fetchGeneration, 3000);
          }
        }
      } catch (error) {
        console.error('Error fetching generation:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGeneration();

    return () => {
      isMounted = false;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
    };
  }, [generationId]);

  // Получаем текстовый результат
  const getOutputText = (): string | null => {
    if (!generation) return null;
    
    // Сначала проверяем output_text
    if (generation.output_text) {
      return generation.output_text;
    }
    
    // Для некоторых моделей результат может быть в output_urls[0] как текст
    if (generation.output_urls && generation.output_urls.length > 0) {
      const firstOutput = generation.output_urls[0];
      // Если это не URL изображения - значит это текст
      if (!firstOutput.startsWith('http') && !firstOutput.startsWith('data:')) {
        return firstOutput;
      }
    }
    
    return null;
  };

  const handleCopyText = async () => {
    const text = getOutputText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const text = getOutputText();
    if (!text || !generation) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generation.action}-${generation.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    if (!generation || !onRegenerate) return;
    onRegenerate(generation.prompt || '', generation.settings || {}, generation.model_id);
  };

  // Empty state - такой же как на Image/Video страницах
  if (!generationId && !generation) {
    // Mobile version
    if (isMobile) {
      return (
        <div className="flex-1 min-h-[400px] flex items-center justify-center">
          <div className="bg-[#131313] rounded-2xl p-8 w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#1f1f1f] flex items-center justify-center">
                <span className="text-3xl">🔍</span>
              </div>
              <div className="text-center">
                <p className="font-inter font-medium text-base text-white mb-2">
                  Анализ изображений
                </p>
                <p className="font-inter text-sm text-[#959595] max-w-[300px]">
                  Загрузите изображение и выберите тип анализа
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Desktop version - 3 шага как на Image/Video
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

  if (!generation) return null;

  // Processing state
  if (generation.status === 'processing' || generation.status === 'pending') {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[400px]'}`}>
        <div className={`flex flex-col items-center gap-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-8 w-full' : ''}`}>
          <Loader2 className="h-8 w-8 lg:h-12 lg:w-12 animate-spin text-white" />
          <div className="text-center">
            <p className="font-inter font-medium text-base text-white mb-1">
              Анализируем...
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
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[400px]'}`}>
        <div className={`text-center max-w-md px-4 ${isMobile ? 'bg-[#131313] rounded-2xl p-6 mx-4' : ''}`}>
          <p className="font-inter font-medium text-base text-red-500 mb-2">
            Ошибка анализа
          </p>
          <p className="font-inter text-sm text-[#959595]">
            {generation.error_message || 'Неизвестная ошибка'}
          </p>
        </div>
      </div>
    );
  }

  const outputText = getOutputText();

  // Completed state
  return (
    <div className={`flex flex-col w-full ${isMobile ? 'gap-4' : 'gap-6'}`}>
      {/* Result text block */}
      <div className={`relative bg-[#0f0f0f] border border-[#2f2f2f] rounded-2xl ${isMobile ? 'p-4' : 'p-6'}`}>
        {/* Header with copy/download buttons */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-inter font-medium text-sm text-[#656565]">
            Результат
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopyText}
              className="p-2 rounded-lg border border-[#2f2f2f] text-[#959595] hover:text-white hover:bg-[#1f1f1f] transition-colors"
              title="Копировать"
            >
              {copied ? (
                <span className="text-green-500 text-xs px-1">✓</span>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg border border-[#2f2f2f] text-[#959595] hover:text-white hover:bg-[#1f1f1f] transition-colors"
              title="Скачать как TXT"
            >
              <Download className="h-4 w-4" />
            </button>
            {onRegenerate && (
              <button
                onClick={handleRegenerate}
                className="p-2 rounded-lg border border-[#2f2f2f] text-[#959595] hover:text-white hover:bg-[#1f1f1f] transition-colors"
                title="Повторить"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Text content */}
        <div className={`font-mono text-sm text-white leading-relaxed whitespace-pre-wrap overflow-auto ${isMobile ? 'max-h-[400px]' : 'max-h-[500px]'}`}>
          {outputText || 'Результат пуст'}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-col gap-2">
        <p className="font-inter text-sm text-[#656565]">
          Модель: <span className="text-[#959595]">{generation.model_name}</span>
        </p>
        <p className="font-inter text-sm text-[#656565]">
          {formatDate(generation.created_at)}
        </p>
      </div>

      {/* Input image preview (if available) */}
      {generation.settings?.image && generation.settings.image.startsWith('http') && (
        <div className="flex flex-col gap-2">
          <p className="font-inter font-medium text-sm text-[#656565]">
            Исходное изображение
          </p>
          <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-[#131313]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generation.settings.image}
              alt="Input image"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}


