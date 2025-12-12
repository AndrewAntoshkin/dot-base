'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { ImagePlus, ArrowRight, Wand2, Plus, RefreshCw, Download, Play, Trash2 } from 'lucide-react';
import Image from 'next/image';

// Типы
interface KeyframePart {
  id: string;
  model: 'hailuo-02' | 'seedance-1-pro';
  startImage: string | null;
  endImage: string | null;
  prompt: string;
}

interface GenerationSegment {
  partId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

interface KeyframeGeneration {
  id: string;
  status: 'idle' | 'generating' | 'merging' | 'completed' | 'failed';
  segments: GenerationSegment[];
  finalVideoUrl?: string;
  mergeGenerationId?: string;
  error?: string;
}

// Компонент загрузки изображения
function ImageUploadBox({
  label,
  imageUrl,
  onUpload,
  onRemove,
}: {
  label: string;
  imageUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const url = result.urls?.[0] || result.url;
        if (url) {
          onUpload(url);
        } else {
          console.error('No URL in response:', result);
        }
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!isFocused || imageUrl) return;
    
    if (e.clipboardData?.items) {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }
    }
  }, [isFocused, imageUrl, uploadFile]);

  // Listen for paste events when focused
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  if (imageUrl) {
    return (
      <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden group">
        <Image
          src={imageUrl}
          alt={label}
          fill
          className="object-cover"
        />
        <button
          onClick={onRemove}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      className="flex-1"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={`w-full flex flex-col items-center gap-1 p-3 bg-[#101010] border border-dashed rounded-lg transition-colors ${
          isFocused ? 'border-white/50' : 'border-[#545454] hover:border-white/30'
        }`}
      >
        <ImagePlus className="w-5 h-5 text-[#959595]" />
        <span className="text-[#959595] text-xs">
          {isUploading ? 'Загрузка...' : label}
        </span>
        <span className="text-[#555] text-[10px]">или ⌘V</span>
      </button>
    </div>
  );
}

// Компонент части (сегмента)
function PartCard({
  part,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  part: KeyframePart;
  index: number;
  onChange: (updated: KeyframePart) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-inter font-medium text-xs text-[#959595] uppercase">
          часть {index + 1}
        </p>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-[#959595] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="border border-[#2f2f2f] rounded-2xl p-4 flex flex-col gap-6">
        {/* Модель */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[#959595]">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 4h8M2 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider">Модель</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ ...part, model: 'hailuo-02' })}
              className={`flex-1 h-10 px-6 rounded-xl text-[13px] text-center transition-colors ${
                part.model === 'hailuo-02'
                  ? 'bg-neutral-900 border border-white text-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Hailuo 02
            </button>
            <button
              onClick={() => onChange({ ...part, model: 'seedance-1-pro' })}
              className={`flex-1 h-10 px-6 rounded-xl text-[13px] text-center transition-colors ${
                part.model === 'seedance-1-pro'
                  ? 'bg-neutral-900 border border-white text-white'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Seedance 1 Pro
            </button>
          </div>
        </div>

        {/* Изображения */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[#959595]">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 4h8M2 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {part.startImage && part.endImage ? 'начало – конец' : 'изображения'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ImageUploadBox
              label="Начало"
              imageUrl={part.startImage}
              onUpload={(url) => onChange({ ...part, startImage: url })}
              onRemove={() => onChange({ ...part, startImage: null })}
            />
            <ArrowRight className="w-4 h-4 text-[#9f9999] shrink-0" />
            <ImageUploadBox
              label="Конец"
              imageUrl={part.endImage}
              onUpload={(url) => onChange({ ...part, endImage: url })}
              onRemove={() => onChange({ ...part, endImage: null })}
            />
          </div>
        </div>

        {/* Промпт */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[#959595]">
            <Wand2 className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Prompt</span>
          </div>
          <textarea
            value={part.prompt}
            onChange={(e) => onChange({ ...part, prompt: e.target.value })}
            placeholder="Напишите запрос"
            className="w-full h-20 min-h-[80px] bg-[#212121] rounded-lg px-3 py-2 text-sm text-white placeholder-[#959595] resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>
    </div>
  );
}

// Timeline компонент
function Timeline({
  parts,
  segments,
}: {
  parts: KeyframePart[];
  segments: GenerationSegment[];
}) {
  const totalDuration = parts.length * 5; // 5 секунд на часть
  
  return (
    <div className="flex flex-col gap-2">
      {/* Временная шкала */}
      <div className="flex items-center h-6 text-[10px] text-[#959595]">
        {Array.from({ length: Math.ceil(totalDuration / 2) + 1 }).map((_, i) => (
          <div key={i} className="flex-1 text-center">
            {i === 0 ? '0' : `0:${String(i * 2).padStart(2, '0')}`}
          </div>
        ))}
      </div>
      
      {/* Сегменты */}
      <div className="flex gap-2">
        {parts.map((part, index) => {
          const segment = segments.find(s => s.partId === part.id);
          const status = segment?.status || 'pending';
          
          return (
            <div key={part.id} className="flex-1 flex flex-col gap-1">
              <div
                className={`h-2 rounded-full transition-colors ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  status === 'failed' ? 'bg-red-500' :
                  'bg-[#2f2f2f]'
                }`}
              />
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white">ЧАСТЬ {index + 1}</span>
                <span className="text-[#959595]">5 секунд</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Пустой Output
function EmptyOutput() {
  return (
    <div className="bg-[#050505] rounded-2xl h-[660px] flex items-center justify-center px-16">
      <div className="flex gap-12">
        <div className="flex flex-col items-start py-2">
          <span className="text-6xl font-light text-[#959595]/30">1</span>
          <p className="text-base font-medium text-white mt-6">
            Выберите действие и модель для начала генерации
          </p>
        </div>
        <div className="flex flex-col items-start py-2">
          <span className="text-6xl font-light text-[#959595]/30">2</span>
          <p className="text-base font-medium text-white mt-6">
            Опишите что вы хотите создать или изменить
          </p>
        </div>
        <div className="flex flex-col items-start py-2">
          <span className="text-6xl font-light text-[#959595]/30">3</span>
          <p className="text-base font-medium text-white mt-6">
            Настройте параметры генерации для лучшего результата
          </p>
        </div>
      </div>
    </div>
  );
}

// Видеоплеер
function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative bg-[#050505] rounded-2xl overflow-hidden h-[660px]">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onEnded={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/50 rounded-full flex items-center justify-center hover:bg-white/70 transition-colors"
        >
          <Play className="w-9 h-9 text-white fill-white ml-1" />
        </button>
      )}
    </div>
  );
}

// Основной компонент
function KeyframesContent() {
  // Состояния
  const [parts, setParts] = useState<KeyframePart[]>([
    {
      id: crypto.randomUUID(),
      model: 'hailuo-02',
      startImage: null,
      endImage: null,
      prompt: '',
    },
  ]);
  
  const [generation, setGeneration] = useState<KeyframeGeneration>({
    id: '',
    status: 'idle',
    segments: [],
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Функции
  const addPart = () => {
    setParts([
      ...parts,
      {
        id: crypto.randomUUID(),
        model: 'hailuo-02',
        startImage: null,
        endImage: null,
        prompt: '',
      },
    ]);
  };

  const removePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const updatePart = (id: string, updated: KeyframePart) => {
    setParts(parts.map(p => p.id === id ? updated : p));
  };

  const reset = () => {
    setParts([
      {
        id: crypto.randomUUID(),
        model: 'hailuo-02',
        startImage: null,
        endImage: null,
        prompt: '',
      },
    ]);
    setGeneration({
      id: '',
      status: 'idle',
      segments: [],
    });
  };

  const canGenerate = parts.every(p => p.startImage && p.endImage && p.prompt.trim());

  const handleGenerate = async () => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    
    // Инициализируем generation
    const newGeneration: KeyframeGeneration = {
      id: '',
      status: 'generating',
      segments: parts.map(p => ({
        partId: p.id,
        status: 'pending',
      })),
    };
    setGeneration(newGeneration);
    
    try {
      const response = await fetch('/api/keyframes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          parts: parts.map(p => ({
            id: p.id,
            model: p.model,
            startImage: p.startImage,
            endImage: p.endImage,
            prompt: p.prompt,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const result = await response.json();
      
      // Update with keyframeGroupId
      setGeneration(prev => ({
        ...prev,
        id: result.keyframeGroupId,
      }));
      
      // Начинаем polling статуса
      pollStatus(result.keyframeGroupId);
      
    } catch (error: any) {
      console.error('Generation error:', error);
      setGeneration(prev => ({
        ...prev,
        status: 'failed',
        error: error.message || 'Ошибка при генерации',
      }));
      setIsGenerating(false);
    }
  };

  const pollStatus = async (keyframeGroupId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/keyframes/status/${keyframeGroupId}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Status check failed');
        }
        
        const status = await response.json();
        
        // Map API segments to our format
        const mappedSegments = status.segments?.map((s: any) => ({
          partId: parts[s.index]?.id || s.id,
          status: s.status,
          videoUrl: s.videoUrl,
          error: s.error,
        })) || [];
        
        setGeneration(prev => ({
          ...prev,
          id: keyframeGroupId,
          status: status.status,
          segments: mappedSegments.length > 0 ? mappedSegments : prev.segments,
          finalVideoUrl: status.finalVideoUrl,
          mergeGenerationId: status.mergeGenerationId,
          error: status.error,
        }));
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsGenerating(false);
          return;
        }
        
        // Продолжаем polling
        setTimeout(poll, 3000);
        
      } catch (error) {
        console.error('Status polling error:', error);
        setIsGenerating(false);
      }
    };
    
    poll();
  };

  const handleDownload = async () => {
    if (!generation.finalVideoUrl) return;
    
    const link = document.createElement('a');
    link.href = generation.finalVideoUrl;
    link.download = `keyframes-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-20 pr-0 relative">
          {/* Top content area */}
          <div className="flex-1 flex flex-col py-8 overflow-y-auto pb-32">
            {/* Header */}
            <div className="mb-6 shrink-0 animate-fade-in-up">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Parts */}
            <div className="flex flex-col gap-6">
              {parts.map((part, index) => (
                <div key={part.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <PartCard
                    part={part}
                    index={index}
                    onChange={(updated) => updatePart(part.id, updated)}
                    onRemove={() => removePart(part.id)}
                    canRemove={parts.length > 1}
                  />
                </div>
              ))}
              
              {/* Добавить часть */}
              <button
                onClick={addPart}
                className="h-12 bg-[#212121] rounded-2xl flex items-center justify-center gap-2 text-[13px] text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить часть
              </button>
            </div>
          </div>

          {/* Sticky buttons at bottom */}
          <div className="sticky bottom-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={isGenerating}
                className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Генерация...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>

        {/* DIVIDER (64px) */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 py-8 pl-0 pr-20 overflow-y-auto flex flex-col gap-6">
          {/* Header + Actions */}
          <div className="flex items-center justify-between animate-fade-in-up">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
            
            {generation.finalVideoUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="p-2 border border-[#2f2f2f] rounded-md hover:bg-[#1f1f1f] transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 border border-[#2f2f2f] rounded-md hover:bg-[#1f1f1f] transition-colors"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Output Content */}
          <div className="animate-fade-in-up animate-delay-200">
            {generation.finalVideoUrl ? (
              <VideoPlayer videoUrl={generation.finalVideoUrl} />
            ) : (
              <EmptyOutput />
            )}
          </div>

          {/* Timeline (показываем когда есть генерация) */}
          {(generation.status !== 'idle' || parts.some(p => p.startImage || p.endImage)) && (
            <div className="animate-fade-in-up animate-delay-300">
              <Timeline parts={parts} segments={generation.segments} />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Layout - упрощённая версия */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-24">
        <p className="text-center text-[#959595] py-8">
          Keyframes генерация пока доступна только на десктопе
        </p>
      </main>
    </div>
  );
}

export default function KeyframesPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <KeyframesContent />
    </Suspense>
  );
}


