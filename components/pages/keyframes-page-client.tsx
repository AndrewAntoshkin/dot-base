'use client';

import { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { ImagePlus, Wand2, Plus, RefreshCw, Download, Play, Pause, Trash2, ChevronDown, Film, ArrowLeftRight } from 'lucide-react';
import Image from 'next/image';

// Модели для режима "Начало – Конец" (I2V с первым и последним кадром)
const I2V_MODELS = {
  'hailuo-02': {
    name: 'Hailuo 02',
    durations: [6, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultDuration: 6,
    defaultAspectRatio: '16:9',
  },
  'seedance-1-pro': {
    name: 'Seedance 1 Pro',
    durations: [5, 8, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultDuration: 5,
    defaultAspectRatio: '16:9',
  },
  'veo-3.1-fast': {
    name: 'Veo 3.1 Fast',
    durations: [4, 6, 8],
    aspectRatios: ['16:9', '9:16'],
    defaultDuration: 8,
    defaultAspectRatio: '16:9',
  },
} as const;

// Модели для режима "Без картинок" (T2V - text to video)
const T2V_MODELS = {
  'veo-3.1-fast-t2v': {
    name: 'Veo 3.1 Fast',
    durations: [4, 6, 8],
    aspectRatios: ['16:9', '9:16'],
    defaultDuration: 8,
    defaultAspectRatio: '16:9',
  },
  'kling-v2.5-turbo-pro': {
    name: 'Kling v2.5 Turbo Pro',
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultDuration: 5,
    defaultAspectRatio: '16:9',
  },
  'hailuo-2.3': {
    name: 'Hailuo 2.3',
    durations: [6, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    defaultDuration: 6,
    defaultAspectRatio: '16:9',
  },
  'wan-2.5-t2v': {
    name: 'Wan 2.5 T2V',
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16'],
    defaultDuration: 5,
    defaultAspectRatio: '16:9',
  },
} as const;

type I2VModelId = keyof typeof I2V_MODELS;
type T2VModelId = keyof typeof T2V_MODELS;
type PartMode = 'i2v' | 't2v';

// Общий тип для конфигурации модели
interface ModelConfig {
  name: string;
  durations: readonly number[];
  aspectRatios: readonly string[];
  defaultDuration: number;
  defaultAspectRatio: string;
}

// Типы
interface KeyframePart {
  id: string;
  mode: PartMode;
  i2vModel: I2VModelId;
  t2vModel: T2VModelId;
  startImage: string | null;
  endImage: string | null;
  prompt: string;
  duration: number;
  aspectRatio: string;
  isCollapsed: boolean;
}

interface GenerationSegment {
  partId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbUrl?: string;
  duration?: number;
  error?: string;
}

interface KeyframeGeneration {
  id: string;
  status: 'idle' | 'generating' | 'merging' | 'completed' | 'failed';
  segments: GenerationSegment[];
  finalVideoUrl?: string;
  mergeGenerationId?: string;
  error?: string;
  progress?: {
    completed: number;
    total: number;
    percent: number;
    isMerging: boolean;
  };
  currentSegmentIndex?: number;
}

// Компонент загрузки изображения (компактный)
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
        if (url) onUpload(url);
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

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  if (imageUrl) {
    return (
      <div className="relative flex-1 h-[72px] rounded-lg overflow-hidden group bg-[#101010] border border-[#2f2f2f]">
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
        className={`w-full h-[72px] flex flex-col items-center justify-center gap-1 bg-[#101010] border border-dashed rounded-lg transition-colors ${
          isFocused ? 'border-white/50' : 'border-[#2f2f2f] hover:border-white/30'
        }`}
      >
        <ImagePlus className="w-5 h-5 text-[#959595]" />
        <span className="text-[#959595] text-xs">
          {isUploading ? 'Загрузка...' : label}
        </span>
      </button>
    </div>
  );
}

// Компонент части (сворачиваемый)
function PartCard({
  part,
  index,
  onChange,
  onRemove,
  canRemove,
  segment,
}: {
  part: KeyframePart;
  index: number;
  onChange: (updated: KeyframePart) => void;
  onRemove: () => void;
  canRemove: boolean;
  segment?: GenerationSegment;
}) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Получаем конфиг текущей модели в зависимости от режима
  const modelConfig: ModelConfig = part.mode === 'i2v'
    ? I2V_MODELS[part.i2vModel]
    : T2V_MODELS[part.t2vModel];
  const currentModelId = part.mode === 'i2v' ? part.i2vModel : part.t2vModel;
  const currentModels: Record<string, ModelConfig> = part.mode === 'i2v' ? I2V_MODELS : T2V_MODELS;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModeChange = (newMode: PartMode) => {
    const newConfig: ModelConfig = newMode === 'i2v' ? I2V_MODELS[part.i2vModel] : T2V_MODELS[part.t2vModel];
    onChange({
      ...part,
      mode: newMode,
      duration: newConfig.defaultDuration,
      aspectRatio: newConfig.defaultAspectRatio,
    });
  };

  const handleModelChange = (newModelId: string) => {
    let newDuration = part.duration;
    let newAspectRatio = part.aspectRatio;
    
    if (part.mode === 'i2v') {
      const newConfig = I2V_MODELS[newModelId as I2VModelId];
      if (newConfig) {
        newDuration = (newConfig.durations as readonly number[]).includes(part.duration)
          ? part.duration
          : newConfig.defaultDuration;
        newAspectRatio = (newConfig.aspectRatios as readonly string[]).includes(part.aspectRatio)
          ? part.aspectRatio
          : newConfig.defaultAspectRatio;
      }
    } else {
      const newConfig = T2V_MODELS[newModelId as T2VModelId];
      if (newConfig) {
        newDuration = (newConfig.durations as readonly number[]).includes(part.duration)
          ? part.duration
          : newConfig.defaultDuration;
        newAspectRatio = (newConfig.aspectRatios as readonly string[]).includes(part.aspectRatio)
          ? part.aspectRatio
          : newConfig.defaultAspectRatio;
      }
    }

    onChange({
      ...part,
      ...(part.mode === 'i2v'
        ? { i2vModel: newModelId as I2VModelId }
        : { t2vModel: newModelId as T2VModelId }),
      duration: newDuration,
      aspectRatio: newAspectRatio,
    });
    setIsModelDropdownOpen(false);
  };

  const toggleCollapse = () => {
    onChange({ ...part, isCollapsed: !part.isCollapsed });
  };

  const swapImages = () => {
    onChange({ ...part, startImage: part.endImage, endImage: part.startImage });
  };

  return (
    <div className="border border-[#2f2f2f] rounded-2xl overflow-hidden">
      {/* Header - всегда видим */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between gap-2 p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-white" />
          <span className="text-xs font-medium text-[#959595] uppercase">
            часть {index + 1}
          </span>
          {segment && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              segment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
              segment.status === 'processing' ? 'bg-yellow-500/20 text-yellow-500' :
              segment.status === 'failed' ? 'bg-red-500/20 text-red-500' :
              'bg-white/10 text-white/50'
            }`}>
              {segment.status === 'completed' ? '✓' :
               segment.status === 'processing' ? '⏳' :
               segment.status === 'failed' ? '✗' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canRemove && !part.isCollapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1 text-[#959595] hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-5 h-5 text-white transition-transform ${part.isCollapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {/* Content - видим только если не свёрнут */}
      {!part.isCollapsed && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Mode Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange('i2v')}
              className={`flex-1 h-[42px] px-4 rounded-2xl text-[13px] transition-colors ${
                part.mode === 'i2v'
                  ? 'bg-[#171717] border border-white text-white'
                  : 'bg-[#171717] text-white/70 hover:text-white'
              }`}
            >
              Начало – Конец
            </button>
            <button
              onClick={() => handleModeChange('t2v')}
              className={`flex-1 h-[42px] px-4 rounded-2xl text-[13px] transition-colors ${
                part.mode === 't2v'
                  ? 'bg-[#171717] border border-white text-white'
                  : 'bg-[#171717] text-white/70 hover:text-white'
              }`}
            >
              Без изображений
            </button>
          </div>

          {/* Модель */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-[#959595]">
              <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none">
                <path d="M1.5 2.5h9M1.5 7.5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider">Модель</span>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="w-full h-10 px-3 bg-[#171717] rounded-lg flex items-center justify-between text-sm text-white hover:bg-[#1f1f1f] transition-colors"
              >
                <span>{modelConfig.name}</span>
                <ChevronDown className={`w-5 h-5 text-white transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#171717] border border-[#2f2f2f] rounded-lg overflow-hidden z-20 shadow-xl">
                  {Object.keys(currentModels).map((modelId) => (
                    <button
                      key={modelId}
                      onClick={() => handleModelChange(modelId)}
                      className={`w-full h-10 px-3 text-left text-sm transition-colors flex items-center justify-between ${
                        currentModelId === modelId
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{currentModels[modelId as keyof typeof currentModels].name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Изображения - только для режима i2v */}
          {part.mode === 'i2v' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 text-[#959595]">
                <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none">
                  <path d="M1.5 2.5h9M1.5 7.5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span className="text-[10px] font-medium uppercase tracking-wider">Изображения</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageUploadBox
                  label="Начало"
                  imageUrl={part.startImage}
                  onUpload={(url) => onChange({ ...part, startImage: url })}
                  onRemove={() => onChange({ ...part, startImage: null })}
                />
                <button
                  onClick={swapImages}
                  className="shrink-0 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <ImageUploadBox
                  label="Конец"
                  imageUrl={part.endImage}
                  onUpload={(url) => onChange({ ...part, endImage: url })}
                  onRemove={() => onChange({ ...part, endImage: null })}
                />
              </div>
            </div>
          )}

          {/* Промпт */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-[#959595]">
              <Wand2 className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Prompt</span>
            </div>
            <textarea
              value={part.prompt}
              onChange={(e) => onChange({ ...part, prompt: e.target.value })}
              placeholder="Опишите что должно происходить в этой части видео"
              className="w-full h-24 min-h-[96px] bg-[#171717] rounded-lg px-3 py-2 text-sm text-white placeholder-[#959595] resize-y focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Длительность */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-[#959595]">
              <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none">
                <path d="M1.5 2.5h9M1.5 7.5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider">Длительность</span>
            </div>
            <div className="flex gap-2">
              {modelConfig.durations.map((dur) => (
                <button
                  key={dur}
                  onClick={() => onChange({ ...part, duration: dur })}
                  className={`h-9 px-4 rounded-lg text-[13px] transition-colors ${
                    part.duration === dur
                      ? 'bg-[#171717] border border-white text-white'
                      : 'bg-[#171717] text-white/70 hover:text-white'
                  }`}
                >
                  {dur} сек
                </button>
              ))}
            </div>
          </div>

          {/* Соотношение сторон */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-[#959595]">
              <svg className="w-3 h-3" viewBox="0 0 12 10" fill="none">
                <path d="M1.5 2.5h9M1.5 7.5h9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider">Соотношение</span>
            </div>
            <div className="flex gap-2">
              {modelConfig.aspectRatios.map((ar) => (
                <button
                  key={ar}
                  onClick={() => onChange({ ...part, aspectRatio: ar })}
                  className={`h-9 px-4 rounded-lg text-[13px] transition-colors ${
                    part.aspectRatio === ar
                      ? 'bg-[#171717] border border-white text-white'
                      : 'bg-[#171717] text-white/70 hover:text-white'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline компонент - по дизайну Figma
function VideoTimeline({
  parts,
  segments,
  totalDuration,
}: {
  parts: KeyframePart[];
  segments: GenerationSegment[];
  totalDuration: number;
}) {
  // Пиксели на секунду для пропорциональной ширины
  const PIXELS_PER_SECOND = 40;
  
  // Рассчитываем накопленное время для каждой части
  const partPositions = parts.reduce((acc, part, index) => {
    const startTime = index === 0 ? 0 : acc[index - 1].endTime;
    const endTime = startTime + part.duration;
    acc.push({ part, startTime, endTime, index });
    return acc;
  }, [] as { part: KeyframePart; startTime: number; endTime: number; index: number }[]);

  // Генерируем временные метки каждые 5 секунд до общей длительности
  const maxTime = Math.max(totalDuration, 10);
  const timeMarks: number[] = [];
  for (let t = 0; t <= maxTime; t += 5) {
    timeMarks.push(t);
  }
  // Добавляем конечную метку если она не кратна 5
  if (timeMarks[timeMarks.length - 1] < maxTime) {
    timeMarks.push(maxTime);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Статус бейджа
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="px-1.5 py-0.5 rounded-md bg-[#72FC44]">
            <span className="text-[8px] font-medium text-[#020617]">Готово</span>
          </div>
        );
      case 'processing':
        return (
          <div className="px-1.5 py-0.5 rounded-md bg-[#FCB944]">
            <span className="text-[8px] font-medium text-[#020617]">В работе</span>
          </div>
        );
      case 'failed':
        return (
          <div className="px-1.5 py-0.5 rounded-md bg-red-500">
            <span className="text-[8px] font-medium text-white">Ошибка</span>
          </div>
        );
      default:
        return (
          <div className="px-1.5 py-0.5 rounded-md bg-[#303030]">
            <span className="text-[8px] font-medium text-[#959595]">Очередь</span>
          </div>
        );
    }
  };

  // Общая ширина таймлайна
  const timelineWidth = maxTime * PIXELS_PER_SECOND;

  return (
    <div className="bg-[#191919] rounded-2xl p-4 flex flex-col gap-2">
      {/* Time marks - горизонтальная шкала */}
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex items-center" style={{ width: timelineWidth }}>
          {timeMarks.map((time, i) => {
            const nextTime = timeMarks[i + 1];
            const gapWidth = nextTime !== undefined ? (nextTime - time) * PIXELS_PER_SECOND : 0;
            
            return (
              <div key={i} className="flex items-center shrink-0">
                <span className="text-[8px] text-[#b1b1b1] font-normal whitespace-nowrap">{formatTime(time)}</span>
                {i < timeMarks.length - 1 && (
                  <div 
                    className="h-0 border-t-2 border-dashed border-[#717171] mx-2" 
                    style={{ width: Math.max(gapWidth - 40, 20) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Segments - горизонтально скроллящийся контейнер с пропорциональными ширинами */}
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex gap-1" style={{ width: timelineWidth }}>
          {partPositions.map(({ part, index }) => {
            const segment = segments.find(s => s.partId === part.id);
            const status = segment?.status || 'pending';
            // Ширина пропорциональна длительности
            const partWidth = part.duration * PIXELS_PER_SECOND - 4; // -4 для gap

            return (
              <div
                key={part.id}
                className="shrink-0 bg-[#070707] rounded-xl p-1.5 flex flex-col gap-2"
                style={{ width: Math.max(partWidth, 120) }}
              >
                {/* Заголовок + статус */}
                <div className="bg-[#171717] rounded-lg px-2 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {status === 'processing' && (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-[10px] font-medium text-[#717171] uppercase">
                      Часть {index + 1}
                    </span>
                  </div>
                  {getStatusBadge(status)}
                </div>

                {/* Промпт текст */}
                <div className="bg-[#151515] rounded-lg p-2 flex-1 min-h-[32px]">
                  <p className="text-[8px] text-[#a59e9e] line-clamp-3">
                    {part.prompt || 'Промпт не задан'}
                  </p>
                </div>

                {/* Превью изображений (если есть и режим i2v) */}
                {part.mode === 'i2v' && (part.startImage || part.endImage) && (
                  <div className="flex gap-1">
                    {part.startImage && (
                      <div className="relative w-1/2 h-10 bg-[#101010] rounded overflow-hidden">
                        <Image
                          src={part.startImage}
                          alt="Start"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    {part.endImage && (
                      <div className="relative w-1/2 h-10 bg-[#101010] rounded overflow-hidden">
                        <Image
                          src={part.endImage}
                          alt="End"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Кнопка добавления части - пунктирная граница */}
          <div
            className="w-[60px] shrink-0 bg-[#191919] rounded-lg border border-dashed border-[#545454] flex items-center justify-center cursor-pointer hover:border-[#717171] transition-colors self-stretch"
          >
            <Plus className="w-5 h-5 text-[#959595]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Video Player Controls
function VideoControls({
  videoRef,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#191919] rounded-xl px-3 py-2 flex items-center gap-3">
      <button
        onClick={onPlayPause}
        className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white ml-0.5" />
        )}
      </button>
      
      <div className="flex items-center gap-2 text-xs text-[#959595]">
        <span className="font-mono">{formatTime(currentTime)}</span>
        <span>/</span>
        <span className="font-mono">{formatTime(duration)}</span>
      </div>

      <div
        className="flex-1 h-1.5 bg-[#2f2f2f] rounded-full cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Видеоплеер
function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
    <div className="flex flex-col gap-3">
      <div className="relative bg-[#050505] rounded-2xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          preload="metadata"
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
          >
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </button>
        )}
      </div>
      
      <VideoControls
        videoRef={videoRef}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onPlayPause={togglePlay}
      />
    </div>
  );
}

// Generating Output
function GeneratingOutput({
  status,
  progress,
  error,
}: {
  status: string;
  progress?: { completed: number; total: number; percent: number; isMerging: boolean };
  error?: string;
}) {
  if (status === 'failed') {
    return (
      <div className="bg-[#050505] rounded-2xl aspect-video flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">✕</span>
          </div>
          <p className="text-xl font-medium text-white">Генерация не удалась</p>
          <p className="text-sm text-[#959595] max-w-md">{error || 'Произошла ошибка. Попробуйте снова.'}</p>
        </div>
      </div>
    );
  }

  const isMerging = status === 'merging' || progress?.isMerging;
  
  return (
    <div className="bg-[#050505] rounded-2xl aspect-video flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-[#2f2f2f]" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {progress?.percent || 0}%
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <p className="text-lg font-medium text-white">
            {isMerging 
              ? 'Объединение видео...' 
              : progress 
                ? `Генерация части ${progress.completed + 1} из ${progress.total}` 
                : 'Подготовка...'}
          </p>
          <p className="text-sm text-[#959595]">
            {isMerging 
              ? 'Склеиваем все части вместе' 
              : 'Это может занять несколько минут'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Пустой Output
function EmptyOutput() {
  return (
    <div className="bg-[#050505] rounded-2xl aspect-video flex items-center justify-center px-16">
      <div className="flex gap-12">
        <div className="flex flex-col items-start py-2">
          <span className="text-5xl font-light text-[#4c4c4c]">1</span>
          <p className="text-sm font-medium text-white mt-4 max-w-[180px]">
            Выберите модель для начала генерации
          </p>
        </div>
        <div className="flex flex-col items-start py-2">
          <span className="text-5xl font-light text-[#4c4c4c]">2</span>
          <p className="text-sm font-medium text-white mt-4 max-w-[180px]">
            Опишите что хотите создать
          </p>
        </div>
        <div className="flex flex-col items-start py-2">
          <span className="text-5xl font-light text-[#4c4c4c]">3</span>
          <p className="text-sm font-medium text-white mt-4 max-w-[180px]">
            Настройте параметры генерации
          </p>
        </div>
      </div>
    </div>
  );
}

// Основной компонент
function KeyframesContent() {
  const [parts, setParts] = useState<KeyframePart[]>([
    {
      id: crypto.randomUUID(),
      mode: 'i2v',
      i2vModel: 'hailuo-02',
      t2vModel: 'veo-3.1-fast-t2v',
      startImage: null,
      endImage: null,
      prompt: '',
      duration: I2V_MODELS['hailuo-02'].defaultDuration,
      aspectRatio: I2V_MODELS['hailuo-02'].defaultAspectRatio,
      isCollapsed: false,
    },
  ]);
  
  const [generation, setGeneration] = useState<KeyframeGeneration>({
    id: '',
    status: 'idle',
    segments: [],
  });
  
  const [isGenerating, setIsGenerating] = useState(false);

  const totalDuration = parts.reduce((sum, p) => sum + p.duration, 0);

  const addPart = () => {
    // Сворачиваем все существующие части
    setParts(prev => [
      ...prev.map(p => ({ ...p, isCollapsed: true })),
      {
        id: crypto.randomUUID(),
        mode: 'i2v' as PartMode,
        i2vModel: 'hailuo-02' as I2VModelId,
        t2vModel: 'veo-3.1-fast-t2v' as T2VModelId,
        startImage: null,
        endImage: null,
        prompt: '',
        duration: I2V_MODELS['hailuo-02'].defaultDuration,
        aspectRatio: I2V_MODELS['hailuo-02'].defaultAspectRatio,
        isCollapsed: false,
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
        mode: 'i2v',
        i2vModel: 'hailuo-02',
        t2vModel: 'veo-3.1-fast-t2v',
        startImage: null,
        endImage: null,
        prompt: '',
        duration: I2V_MODELS['hailuo-02'].defaultDuration,
        aspectRatio: I2V_MODELS['hailuo-02'].defaultAspectRatio,
        isCollapsed: false,
      },
    ]);
    setGeneration({
      id: '',
      status: 'idle',
      segments: [],
    });
  };

  // Проверка готовности к генерации
  const canGenerate = parts.every(p => {
    if (p.mode === 'i2v') {
      // I2V режим требует начальное и конечное изображение + промпт
      return p.startImage && p.endImage && p.prompt.trim();
    }
    // T2V режим требует только промпт
    return p.prompt.trim();
  });

  const handleGenerate = async () => {
    if (!canGenerate) return;
    
    setIsGenerating(true);
    
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
            model: p.mode === 'i2v' ? p.i2vModel : p.t2vModel,
            mode: p.mode,
            startImage: p.mode === 'i2v' ? p.startImage : null,
            endImage: p.mode === 'i2v' ? p.endImage : null,
            prompt: p.prompt,
            duration: p.duration,
            aspectRatio: p.aspectRatio,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const result = await response.json();
      
      setGeneration(prev => ({
        ...prev,
        id: result.keyframeGroupId,
      }));
      
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
        
        const mappedSegments = status.segments?.map((s: any) => ({
          partId: parts[s.index]?.id || s.id,
          status: s.status,
          videoUrl: s.videoUrl,
          thumbUrl: s.thumbUrl,
          duration: s.duration,
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
          progress: status.progress,
          currentSegmentIndex: status.currentSegmentIndex,
        }));
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsGenerating(false);
          return;
        }
        
        const pollInterval = status.status === 'merging' ? 2000 : 3000;
        setTimeout(poll, pollInterval);
        
      } catch (error) {
        console.error('Status polling error:', error);
        setTimeout(poll, 5000);
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
        {/* LEFT PANEL - INPUT */}
        <div className="w-[480px] flex flex-col pl-20 pr-0 relative">
          <div className="flex-1 flex flex-col py-8 overflow-y-auto pb-32">
            {/* Header */}
            <div className="mb-4 shrink-0">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Parts */}
            <div className="flex flex-col gap-3">
              {parts.map((part, index) => (
                <PartCard
                  key={part.id}
                  part={part}
                  index={index}
                  onChange={(updated) => updatePart(part.id, updated)}
                  onRemove={() => removePart(part.id)}
                  canRemove={parts.length > 1}
                  segment={generation.segments.find(s => s.partId === part.id)}
                />
              ))}
              
              {/* Добавить часть */}
              <button
                onClick={addPart}
                className="h-11 bg-[#212121] rounded-2xl flex items-center justify-center gap-2 text-[13px] text-white/70 hover:text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить часть
              </button>
            </div>
          </div>

          {/* Sticky buttons */}
          <div className="sticky bottom-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={isGenerating}
                className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isGenerating 
                  ? generation.progress 
                    ? `${generation.progress.percent}%`
                    : 'Запуск...'
                  : 'Создать'}
              </button>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 py-8 pl-0 pr-20 overflow-y-auto flex flex-col gap-6">
          {/* Header + Actions */}
          <div className="flex items-center justify-between">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
            
            {generation.finalVideoUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="p-2 border border-[#2f2f2f] rounded-lg hover:bg-[#1f1f1f] transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 border border-[#2f2f2f] rounded-lg hover:bg-[#1f1f1f] transition-colors"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Output Content */}
          {generation.finalVideoUrl ? (
            <VideoPlayer videoUrl={generation.finalVideoUrl} />
          ) : generation.status !== 'idle' ? (
            <GeneratingOutput 
              status={generation.status}
              progress={generation.progress}
              error={generation.error}
            />
          ) : (
            <EmptyOutput />
          )}

          {/* Timeline */}
          <VideoTimeline
            parts={parts}
            segments={generation.segments}
            totalDuration={totalDuration}
          />
        </div>
      </main>

      {/* Mobile */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-24">
        <p className="text-center text-[#959595] py-8">
          Keyframes доступны только на десктопе
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
