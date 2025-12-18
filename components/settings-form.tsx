'use client';

import React, { useState, useRef, useCallback } from 'react';
import { getModelById, ModelSetting } from '@/lib/models-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { TooltipLabel } from '@/components/ui/tooltip-label';
import { 
  X, 
  Image as ImageIcon,
  Wand2,           // prompt
  Ban,             // negative_prompt
  Hash,            // seed, number
  Gauge,           // cfg_scale, guidance
  Clock,           // duration
  Monitor,         // resolution
  Settings2,       // mode
  Maximize2,       // aspect_ratio
  ImagePlus,       // start_image, first_frame_image
  Target,          // end_image, last_frame_image
  Palette,         // style
  Sparkles,        // quality
  Copy,            // num_outputs
  Ruler,           // width, height
  Layers,          // steps
  Cpu,             // scheduler
  Zap,             // prompt_optimizer
  Lock,            // camera_fixed
  Film,            // fps
  SlidersHorizontal, // slider generic
  List,            // select generic
  ToggleRight,     // checkbox generic
  Type,            // text generic
  Images,          // file_array
  LucideIcon,
} from 'lucide-react';
import { AspectRatioSelector } from './aspect-ratio-selector';
import { DirectionalExpandSelector, ExpandDirection } from './directional-expand-selector';
import { useUser } from '@/contexts/user-context';

// Helper function to get image dimensions
function getImageDimensions(imageSrc: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

// Wrapper component for directional expand selector with image dimensions loading
function DirectionalExpandSelectorWrapper({
  imageUrl,
  value,
  onChange,
  expandAmount,
  onExpandAmountChange,
}: {
  imageUrl?: string | null;
  value: ExpandDirection;
  onChange: (direction: ExpandDirection) => void;
  expandAmount: number;
  onExpandAmountChange: (amount: number) => void;
}) {
  const [imageDimensions, setImageDimensions] = React.useState<{ width?: number; height?: number }>({});
  
  React.useEffect(() => {
    if (imageUrl) {
      getImageDimensions(imageUrl)
        .then(dims => setImageDimensions(dims))
        .catch(() => setImageDimensions({}));
    } else {
      setImageDimensions({});
    }
  }, [imageUrl]);
  
  return (
    <DirectionalExpandSelector
      value={value}
      onChange={onChange}
      expandAmount={expandAmount}
      onExpandAmountChange={onExpandAmountChange}
      imageWidth={imageDimensions.width}
      imageHeight={imageDimensions.height}
      imageUrl={imageUrl}
    />
  );
}

// Маппинг иконок по названию поля
const FIELD_ICONS: Record<string, LucideIcon> = {
  // Prompt fields
  prompt: Wand2,
  negative_prompt: Ban,
  
  // Seed & guidance
  seed: Hash,
  cfg_scale: Gauge,
  guidance_scale: Gauge,
  guidance: Gauge,
  
  // Time & duration
  duration: Clock,
  fps: Film,
  
  // Resolution & size
  resolution: Monitor,
  size: Monitor,
  width: Ruler,
  height: Ruler,
  
  // Mode & settings
  mode: Settings2,
  scheduler: Cpu,
  
  // Aspect ratio
  aspect_ratio: Maximize2,
  
  // Images
  start_image: ImagePlus,
  first_frame_image: ImagePlus,
  image: ImagePlus,
  input_image: ImagePlus,
  end_image: Target,
  last_frame_image: Target,
  
  // Style & quality
  style: Palette,
  quality: Sparkles,
  
  // Other
  num_outputs: Copy,
  num_images: Copy,
  steps: Layers,
  num_inference_steps: Layers,
  prompt_optimizer: Zap,
  camera_fixed: Lock,
};

// Получить иконку для поля по имени или типу
function getFieldIcon(name: string, type: string): LucideIcon {
  // Сначала ищем по имени
  if (FIELD_ICONS[name]) {
    return FIELD_ICONS[name];
  }
  
  // Потом по типу
  switch (type) {
    case 'textarea':
      return Wand2;
    case 'file':
      return ImageIcon;
    case 'file_array':
      return Images;
    case 'select':
      return List;
    case 'slider':
      return SlidersHorizontal;
    case 'checkbox':
      return ToggleRight;
    case 'number':
      return Hash;
    case 'text':
    default:
      return Type;
  }
}

import { fetchWithTimeout, isSlowConnection, isOnline } from '@/lib/network-utils';

// Максимальный размер файла для загрузки (уменьшен для мобильного)
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB для лучшей совместимости с мобильным
// Качество сжатия JPEG
const COMPRESSION_QUALITY = 0.80;
// Максимальное разрешение (по большей стороне)
const MAX_DIMENSION = 2048;

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.+)$/);
  if (!match) {
    throw new Error('Некорректный формат файла. Ожидается data URL');
  }
  const mimeType = match[1] || 'application/octet-stream';
  const base64 = match[2];
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([buffer], { type: mimeType });
  const extension = mimeType.split('/')[1] || 'bin';
  return { blob, mimeType, extension };
}

async function uploadDataUrls(dataUrls: string[]) {
  const formData = new FormData();
  dataUrls.forEach((dataUrl, index) => {
    const { blob, extension } = dataUrlToBlob(dataUrl);
    const filename = `upload-${Date.now()}-${index}.${extension}`;
    formData.append('files', blob, filename);
  });

  const uploadTimeout = isSlowConnection() ? 120000 : 60000;
  const response = await fetchWithTimeout('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    timeout: uploadTimeout,
    retries: 2,
    retryDelay: 2000,
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error('Server returned non-JSON response:', responseText.substring(0, 200));
    if (response.status === 413 || responseText.toLowerCase().includes('entity too large')) {
      throw new Error('Файл слишком большой. Попробуйте уменьшить размер или загрузить меньше файлов');
    }
    throw new Error('Ошибка сервера при загрузке файла');
  }

  if (!response.ok) {
    throw new Error(result.error || 'Не удалось загрузить файл');
  }

  if (!result.urls || result.urls.length === 0) {
    throw new Error('Файл не был загружен');
  }

  return result.urls as string[];
}

/**
 * Сжимает изображение до допустимого размера
 * Адаптируется под качество соединения
 * @returns base64 строка сжатого изображения
 */
async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      
      // Для медленного соединения используем более агрессивное сжатие
      const slowConnection = isSlowConnection();
      const maxDim = slowConnection ? 1536 : MAX_DIMENSION;
      const targetSize = slowConnection ? MAX_UPLOAD_SIZE * 0.7 : MAX_UPLOAD_SIZE; // 1.4MB для медленного
      const initialQuality = slowConnection ? 0.7 : COMPRESSION_QUALITY;
      
      // Масштабируем если превышает максимальное разрешение
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Пробуем JPEG сначала (лучше сжимает)
      let result = canvas.toDataURL('image/jpeg', initialQuality);
      
      // Если всё ещё слишком большой, уменьшаем качество
      let quality = initialQuality;
      const minQuality = slowConnection ? 0.4 : 0.3;
      while (result.length > targetSize * 1.33 && quality > minQuality) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      
      // Если после сжатия всё ещё большой, уменьшаем размер
      if (result.length > targetSize * 1.33) {
        const scale = slowConnection ? 0.6 : 0.7;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        result = canvas.toDataURL('image/jpeg', slowConnection ? 0.6 : 0.8);
      }
      
      console.log(`[Compress] ${slowConnection ? 'SLOW' : 'FAST'} connection: ${(result.length / 1024).toFixed(0)}KB, quality: ${quality.toFixed(1)}`);
      resolve(result);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Обрабатывает файл - сжимает если нужно
 */
async function processFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      
      // Для видео не сжимаем
      if (file.type.startsWith('video/')) {
        resolve(dataUrl);
        return;
      }
      
      // Для изображений проверяем размер и сжимаем если нужно
      try {
        const base64Size = dataUrl.length * 0.75; // Примерный размер в байтах
        if (base64Size > MAX_UPLOAD_SIZE) {
          console.log(`Compressing image: ${(base64Size / 1024 / 1024).toFixed(2)}MB → target <${(MAX_UPLOAD_SIZE / 1024 / 1024).toFixed(1)}MB`);
          const compressed = await compressImage(dataUrl);
          console.log(`Compressed to: ${(compressed.length * 0.75 / 1024 / 1024).toFixed(2)}MB`);
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        // Если сжатие не удалось, возвращаем оригинал
        console.warn('Compression failed, using original:', err);
        resolve(dataUrl);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Компонент загрузки одного файла - ВЫНЕСЕН НАРУЖУ
function FileUploader({
  settingName,
  value,
  onChange,
  description,
  acceptVideo = false,
}: {
  settingName: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  description?: string;
  acceptVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Определяем, это видео или изображение по settingName
  const isVideoField = settingName.toLowerCase().includes('video') || acceptVideo;
  // Явно указываем форматы для лучшей совместимости с macOS
  const acceptType = isVideoField 
    ? 'image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/quicktime,video/webm' 
    : 'image/png,image/jpeg,image/jpg,image/gif,image/webp';

  const handleFile = useCallback(async (file: File) => {
    const isValidType = file.type.startsWith('image/') || (isVideoField && file.type.startsWith('video/'));
    if (!isValidType) return;
    
    try {
      // Используем processFile для автоматического сжатия больших изображений
      const result = await processFile(file);
      onChange(result);
    } catch (err) {
      console.error('Failed to process file:', err);
    }
  }, [onChange, isVideoField]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input для возможности повторной загрузки того же файла
    e.target.value = '';
  }, [handleFile]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!isFocused || value) return;
    
    if (e.clipboardData?.items) {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/') || (isVideoField && item.type.startsWith('video/'))) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    }
  }, [isFocused, value, handleFile, isVideoField]);

  // Listen for paste events
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Определяем тип содержимого для превью
  const isVideoContent = value?.startsWith('data:video/');

  if (value) {
    return (
      <div className="relative">
        <div className="relative rounded-[10px] overflow-hidden bg-[#101010]">
          {isVideoContent ? (
            <video
              src={value}
              className="w-full h-48 object-contain bg-[#0a0a0a]"
              controls
            />
          ) : (
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-48 object-contain bg-[#0a0a0a]"
            />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      className={`
        h-12 flex items-center pl-3 pr-2 gap-2 border border-dashed rounded-[8px] cursor-pointer transition-colors
        ${isDragging || isFocused
          ? 'border-white bg-white/5' 
          : 'border-[#656565] hover:border-white bg-neutral-900'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptType}
        onChange={handleInputChange}
        className="hidden"
      />
      <ImageIcon className="w-5 h-5 text-[#959595]" />
      <span className="font-inter text-[14px] text-[#959595] flex-1">
        {isVideoField ? 'Выберите файл' : 'Выберите на устройстве'}
      </span>
      <span className="font-inter text-[11px] text-[#555]">⌘V</span>
    </div>
  );
}

// Компонент множественной загрузки файлов - ВЫНЕСЕН НАРУЖУ
function MultiFileUploader({
  settingName,
  value,
  onChange,
  maxFiles,
  description,
  selectedIndex,
  onSelectIndex,
  acceptVideo = false,
}: {
  settingName: string;
  value: string[];
  onChange: (value: string[]) => void;
  maxFiles: number;
  description?: string;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  acceptVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // Храним текущее значение в ref для доступа из async callbacks
  const valueRef = useRef(value);
  valueRef.current = value;

  // Определяем, это видео или изображение по settingName
  const isVideoField = settingName.toLowerCase().includes('video') || acceptVideo;

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const currentValue = valueRef.current;
    const remainingSlots = maxFiles - currentValue.length;
    const filesToProcess = Array.from(files)
      .filter(file => file.type.startsWith('image/') || (isVideoField && file.type.startsWith('video/')))
      .slice(0, remainingSlots);
    
    if (filesToProcess.length === 0) return;
    
    // Обрабатываем все файлы параллельно с автоматическим сжатием
    const processPromises = filesToProcess.map((file) => processFile(file));
    
    // Ждём все файлы и обновляем состояние один раз
    const results = await Promise.all(processPromises);
    onChange([...valueRef.current, ...results]);
  }, [maxFiles, onChange, isVideoField]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    e.target.value = ''; // Reset для повторной загрузки
  }, [handleFiles]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (!isFocused || value.length >= maxFiles) return;
    
    if (e.clipboardData?.items) {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/') || (isVideoField && item.type.startsWith('video/'))) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    }
  }, [isFocused, value.length, maxFiles, handleFiles, isVideoField]);

  // Listen for paste events
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const removeFile = useCallback((index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  }, [value, onChange]);

  const handleSelectImage = useCallback((index: number) => {
    if (onSelectIndex) {
      onSelectIndex(index);
    }
  }, [onSelectIndex]);

  return (
    <div>
      {/* Зона загрузки */}
      {value.length < maxFiles && (
        <div
          ref={containerRef}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onMouseEnter={() => setIsFocused(true)}
          onMouseLeave={() => setIsFocused(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          tabIndex={0}
          className={`
            h-12 flex items-center pl-3 pr-2 gap-2 border border-dashed rounded-[8px] cursor-pointer transition-colors
            ${isDragging || isFocused
              ? 'border-white bg-white/5' 
              : 'border-[#656565] hover:border-white bg-[#101010]'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={isVideoField 
              ? 'image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/quicktime,video/webm' 
              : 'image/png,image/jpeg,image/jpg,image/gif,image/webp'}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <ImageIcon className="w-5 h-5 text-[#959595]" />
          <span className="font-inter text-[14px] text-[#959595] flex-1">
            {isVideoField ? `Добавить файлы (${value.length}/${maxFiles})` : `Добавить изображения (${value.length}/${maxFiles})`}
          </span>
          <span className="font-inter text-[11px] text-[#555]">⌘V</span>
        </div>
      )}

      {/* Превью загруженных изображений - под областью загрузки, 4 в ряд */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {value.map((img, index) => (
            <div 
              key={index} 
              onClick={() => handleSelectImage(index)}
              className={`
                relative rounded-[8px] overflow-hidden bg-[#0a0a0a] cursor-pointer transition-all
                ${selectedIndex === index 
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' 
                  : 'hover:ring-1 hover:ring-white/50'
                }
              `}
            >
              <img
                src={img}
                alt={`Uploaded ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Exposed methods via ref
export interface SettingsFormRef {
  submit: () => Promise<void>;
  reset: () => void;
}

interface SettingsFormProps {
  modelId: string;
  onGenerationCreated: (generationId: string, generation: any) => void;
  onFormDataChange?: (data: Record<string, any>) => void;
  onSubmitStart?: () => void;
  onSubmitEnd?: () => void;
  onError?: (error: string) => void;
  initialData?: Record<string, any>;
  formRef?: React.MutableRefObject<SettingsFormRef | null>;
}

export function SettingsForm({
  modelId,
  onGenerationCreated,
  onFormDataChange,
  onSubmitStart,
  onSubmitEnd,
  onError,
  initialData,
  formRef,
}: SettingsFormProps) {
  const model = getModelById(modelId);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedWorkspaceId } = useUser();
  // Состояние для выбранных индексов изображений в file_array полях
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});
  // Ref для хранения handleSubmit функции (чтобы использовать в useEffect до определения функции)
  const handleSubmitRef = useRef<() => Promise<void>>(() => Promise.resolve());
  // Ref для отслеживания применённых initialData (предотвращает бесконечный цикл)
  const appliedInitialDataRef = useRef<string>('');
  // Ref для предыдущего formData (предотвращает лишние вызовы onFormDataChange)
  const prevFormDataRef = useRef<string>('');

  // Sync initialData to formData when it changes (only if actually different)
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const initialDataKey = JSON.stringify(initialData) + modelId;
      // Применяем только если данные реально изменились
      if (appliedInitialDataRef.current !== initialDataKey) {
        appliedInitialDataRef.current = initialDataKey;
        setFormData(initialData);
      }
    }
  }, [initialData, modelId]);

  // Expose form data to parent (only if actually different)
  React.useEffect(() => {
    if (onFormDataChange && model) {
      const formDataKey = JSON.stringify(formData);
      if (prevFormDataRef.current !== formDataKey) {
        prevFormDataRef.current = formDataKey;
        onFormDataChange(formData);
      }
    }
  }, [formData, onFormDataChange, model]);

  // Expose methods to parent via window and ref
  React.useEffect(() => {
    if (!model) return;
    
    const handleSubmitForWindow = async () => {
      await handleSubmitRef.current();
    };
    
    const handleResetForWindow = () => {
      setFormData({});
    };
    
    (window as any).__settingsFormSubmit = handleSubmitForWindow;
    (window as any).__settingsFormReset = handleResetForWindow;
    
    // Set on ref if provided
    if (formRef) {
      formRef.current = {
        submit: handleSubmitForWindow,
        reset: handleResetForWindow,
      };
    }
    
    return () => {
      // Don't clear window globals - they're needed for mobile
      if (formRef) {
        formRef.current = null;
      }
    };
  }, [model, formRef]);

  // updateFormData должен быть до раннего return (это хук)
  const updateFormData = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Early return ПОСЛЕ всех хуков
  if (!model) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (onSubmitStart) onSubmitStart();
    setIsLoading(true);
    setError(null);

    try {
      // Определяем, это видео модель или нет
      const isVideoAction = model.action.startsWith('video_');
      
      // Подготавливаем settings - конвертируем base64 файлы в URL через upload API
      const processedSettings = { ...formData };
      
      // Найти все file и file_array поля с base64 данными
      for (const setting of model.settings) {
        const fieldValue = formData[setting.name];
        
        if (setting.type === 'file' && fieldValue && fieldValue.startsWith('data:')) {
          if (!isOnline()) {
            throw new Error('Нет подключения к интернету. Проверьте соединение');
          }

          try {
            console.log(`Uploading file for ${setting.name}...`);
            const [url] = await uploadDataUrls([fieldValue]);
            processedSettings[setting.name] = url;
            console.log(`File uploaded: ${url}`);
          } catch (uploadErr: any) {
            console.error('Upload failed:', uploadErr);
            throw uploadErr;
          }
        } else if (setting.type === 'file_array' && Array.isArray(fieldValue) && fieldValue.length > 0) {
          const base64Files = fieldValue.filter((f: string) => f && f.startsWith('data:'));

          if (base64Files.length > 0) {
            if (!isOnline()) {
              throw new Error('Нет подключения к интернету. Проверьте соединение');
            }

            try {
              console.log(`Uploading ${base64Files.length} files for ${setting.name}...`);
              const urls = await uploadDataUrls(base64Files);
              processedSettings[setting.name] = urls;
              console.log(`Files uploaded: ${urls.length}`);
            } catch (uploadErr: any) {
              console.error('Upload failed:', uploadErr);
              throw uploadErr;
            }
          }
        }
      }
      
      // Обработка направленного расширения для Bria Expand
      if (model.replicateModel === 'bria/expand-image' && processedSettings.expand_direction) {
        // Получаем изображение из formData (может быть base64) или из processedSettings (уже URL)
        const imageData = formData.image || processedSettings.image;
        if (imageData) {
          // Получаем размеры изображения
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageData; // Работает и с base64 и с URL
          });
          
          const imageWidth = img.naturalWidth;
          const imageHeight = img.naturalHeight;
          const expandAmount = processedSettings.expand_amount || 20;
          const direction = processedSettings.expand_direction as ExpandDirection;
          
          // Рассчитываем параметры для Bria Expand
          const expandRatio = expandAmount / 100;
          let newWidth = imageWidth;
          let newHeight = imageHeight;
          let offsetX = 0;
          let offsetY = 0;
          
          switch (direction) {
            case 'up':
              newHeight = Math.round(imageHeight * (1 + expandRatio));
              offsetY = Math.round(imageHeight * expandRatio);
              break;
            case 'down':
              newHeight = Math.round(imageHeight * (1 + expandRatio));
              offsetY = 0;
              break;
            case 'left':
              newWidth = Math.round(imageWidth * (1 + expandRatio));
              offsetX = Math.round(imageWidth * expandRatio);
              break;
            case 'right':
              newWidth = Math.round(imageWidth * (1 + expandRatio));
              offsetX = 0;
              break;
            case 'all':
              newWidth = Math.round(imageWidth * (1 + expandRatio));
              newHeight = Math.round(imageHeight * (1 + expandRatio));
              offsetX = Math.round(imageWidth * expandRatio / 2);
              offsetY = Math.round(imageHeight * expandRatio / 2);
              break;
          }
          
          // Ensure max canvas size (25M pixels for Bria)
          const maxArea = 25_000_000;
          if (newWidth * newHeight > maxArea) {
            const scale = Math.sqrt(maxArea / (newWidth * newHeight));
            newWidth = Math.round(newWidth * scale);
            newHeight = Math.round(newHeight * scale);
            offsetX = Math.round(offsetX * scale);
            offsetY = Math.round(offsetY * scale);
          }
          
          // Устанавливаем параметры для Bria Expand API
          processedSettings.canvas_size = [newWidth, newHeight];
          processedSettings.original_image_size = [imageWidth, imageHeight];
          processedSettings.original_image_location = [offsetX, offsetY];
          
          // Удаляем aspect_ratio если используется направленное расширение
          delete processedSettings.aspect_ratio;
          
          console.log('Bria Expand directional params:', {
            canvas_size: processedSettings.canvas_size,
            original_image_size: processedSettings.original_image_size,
            original_image_location: processedSettings.original_image_location,
          });
        }
      }
      
      // Проверяем соединение перед созданием генерации
      if (!isOnline()) {
        throw new Error('Нет подключения к интернету. Проверьте соединение');
      }
      
      let response;
      try {
        response = await fetchWithTimeout('/api/generations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: model.action,
            model_id: model.id,
            prompt: formData.prompt,
            input_image_url: processedSettings.image || processedSettings.input_image || processedSettings.start_image || processedSettings.first_frame_image,
            input_video_url: isVideoAction ? processedSettings.video : undefined,
            settings: processedSettings,
            workspace_id: selectedWorkspaceId,
          }),
          timeout: isSlowConnection() ? 60000 : 30000,
          retries: 2,
          retryDelay: 2000,
        });
      } catch (networkErr: any) {
        console.error('Network error creating generation:', networkErr);
        if (networkErr.code === 'TIMEOUT') {
          throw new Error('Запрос занял слишком много времени. Проверьте соединение');
        }
        if (networkErr.code === 'OFFLINE') {
          throw new Error('Потеряно соединение с интернетом');
        }
        throw new Error('Ошибка сети. Проверьте соединение и попробуйте снова');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create generation');
      }

      const result = await response.json();
      onGenerationCreated(result.id, result);
      // НЕ сбрасываем форму - пользователь может хотеть переделать
    } catch (err: any) {
      const errorMsg = err.message;
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
      if (onSubmitEnd) onSubmitEnd();
    }
  };

  const handleReset = () => {
    setFormData({});
  };

  // Обновляем ref для handleSubmit (используется в useEffect выше)
  handleSubmitRef.current = handleSubmit;

  const renderSetting = (setting: ModelSetting) => {
    const value = formData[setting.name] ?? setting.default ?? '';

    switch (setting.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateFormData(setting.name, e.target.value)}
            placeholder={setting.placeholder || 'Напишите запрос'}
            required={setting.required}
            rows={4}
            className="bg-neutral-900 border-0 rounded-[8px] min-h-[80px]"
          />
        );

      case 'text':
      case 'number':
        return (
          <Input
            type={setting.type}
            value={value}
            onChange={(e) => updateFormData(setting.name, e.target.value)}
            placeholder={setting.placeholder}
            required={setting.required}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            className="bg-neutral-900 border-0 h-12 rounded-[8px]"
          />
        );

      case 'select':
        // Используем интерактивный селектор для aspect_ratio
        if (setting.name === 'aspect_ratio' && setting.options) {
          const defaultOption = setting.options.find(opt => opt.value === setting.default);
          return (
            <AspectRatioSelector
              value={value || setting.default || '1:1'}
              options={setting.options}
              onChange={(v) => updateFormData(setting.name, v)}
              description={setting.description}
              defaultLabel={defaultOption?.label}
              defaultValue={setting.default}
            />
          );
        }
        
        // Преобразуем опции в формат MobileSelect
        const selectOptions: SelectOption[] = (setting.options || []).map(opt => ({
          value: opt.value,
          label: opt.label,
        }));
        
        return (
          <MobileSelect
            value={value}
            onValueChange={(v) => updateFormData(setting.name, v)}
            options={selectOptions}
            placeholder="Выбрать из списка"
            title={setting.label}
          />
        );

      case 'slider':
        const min = setting.min ?? 0;
        const max = setting.max ?? 100;
        const currentValue = typeof value === 'number' ? value : min;
        const percentage = ((currentValue - min) / (max - min)) * 100;
        
        return (
          <div className="flex flex-col gap-1">
            {/* Кастомный слайдер по дизайну Figma */}
            <div className="relative h-4 w-full">
              {/* Трек (фон) */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[2px] bg-[#3a3a3a] rounded-full" />
              {/* Заполненная часть */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-0 h-[2px] bg-white rounded-full"
                style={{ width: `${percentage}%` }}
              />
              {/* Ползунок */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-neutral-900 shadow-sm cursor-pointer"
                style={{ left: `calc(${percentage}% - 6px)` }}
              />
              {/* Скрытый input для взаимодействия */}
              <input
                type="range"
                value={currentValue}
                onChange={(e) => updateFormData(setting.name, parseFloat(e.target.value))}
                min={min}
                max={max}
                step={setting.step || 1}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Подписи: min - value - max */}
            <div className="flex justify-between items-center h-4">
              <span className="font-inter text-[12px] leading-[14px] text-[#878787] w-8">
                {min}
              </span>
              <span className="font-inter text-[12px] leading-[14px] font-bold text-white text-center w-8">
                {currentValue}
              </span>
              <span className="font-inter text-[12px] leading-[14px] text-[#878787] text-right w-8">
                {max}
              </span>
            </div>
          </div>
        );

      case 'checkbox':
        // Checkbox рендерится в основном цикле с TooltipLabel
        return null;

      case 'file':
        return (
          <FileUploader
            key={`file-${setting.name}-${modelId}`}
            settingName={setting.name}
            value={formData[setting.name]}
            onChange={(val) => updateFormData(setting.name, val)}
          />
        );

      case 'file_array':
        return (
          <MultiFileUploader
            key={`files-${setting.name}-${modelId}`}
            settingName={setting.name}
            value={formData[setting.name] || []}
            onChange={(val) => {
              updateFormData(setting.name, val);
              // Если удалили выбранное изображение, сбрасываем выбор
              const currentSelected = selectedIndices[setting.name];
              if (currentSelected !== undefined && currentSelected >= val.length) {
                setSelectedIndices(prev => ({
                  ...prev,
                  [setting.name]: val.length > 0 ? val.length - 1 : 0
                }));
              }
            }}
            maxFiles={setting.maxFiles || 10}
            selectedIndex={selectedIndices[setting.name] ?? 0}
            onSelectIndex={(index) => setSelectedIndices(prev => ({
              ...prev,
              [setting.name]: index
            }))}
          />
        );

      case 'directional_expand':
        // Получаем изображение из разных возможных полей
        const imageUrl = formData.image 
          || (formData.image_input && Array.isArray(formData.image_input) && formData.image_input[0])
          || (formData.image_input && typeof formData.image_input === 'string' && formData.image_input)
          || formData.input_image
          || formData.start_image
          || formData.first_frame_image;
        
        // Отладка (можно убрать в продакшене)
        if (process.env.NODE_ENV === 'development') {
          console.log('DirectionalExpandSelector imageUrl:', imageUrl, 'formData keys:', Object.keys(formData));
        }
        
        return (
          <DirectionalExpandSelectorWrapper
            imageUrl={imageUrl}
            value={formData[setting.name] || 'all'}
            onChange={(direction) => updateFormData(setting.name, direction)}
            expandAmount={formData.expand_amount || 20}
            onExpandAmountChange={(amount) => updateFormData('expand_amount', amount)}
          />
        );

      default:
        return null;
    }
  };

  // Получаем описание и дефолтное значение для настройки
  const getSettingMeta = (setting: ModelSetting) => {
    const defaultOption = setting.options?.find(opt => opt.value === setting.default);
    return {
      description: setting.description,
      defaultLabel: defaultOption?.label || (setting.default !== undefined ? String(setting.default) : undefined),
    };
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Settings wrapped in cards */}
      {model.settings.map((setting) => {
        const meta = getSettingMeta(setting);
        const isAspectRatio = setting.name === 'aspect_ratio';
        
        // Скрываем aspect_ratio если выбрано направление расширения
        if (isAspectRatio && formData.expand_direction) {
          return null;
        }
        
        // Checkbox рендерится с тултипом на label
        if (setting.type === 'checkbox') {
          const Icon = getFieldIcon(setting.name, setting.type);
          return (
            <div key={setting.name} className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!(formData[setting.name] ?? setting.default ?? false)}
                  onChange={(e) => updateFormData(setting.name, e.target.checked)}
                  className="w-4 h-4 rounded accent-white cursor-pointer"
                />
                <TooltipLabel
                  label={setting.label}
                  description={meta.description}
                  defaultValue={setting.default !== undefined ? (setting.default ? 'Включено' : 'Выключено') : undefined}
                  icon={Icon}
                />
              </div>
            </div>
          );
        }
        
        // Aspect ratio имеет свой особый рендеринг внутри AspectRatioSelector
        if (isAspectRatio) {
          const Icon = getFieldIcon(setting.name, setting.type);
          return (
            <div key={setting.name} className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <TooltipLabel
                label={setting.label}
                description={meta.description}
                defaultValue={meta.defaultLabel}
                required={setting.required}
                icon={Icon}
              />
              {renderSetting(setting)}
            </div>
          );
        }
        
        const Icon = getFieldIcon(setting.name, setting.type);
        return (
          <div key={setting.name} className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
            {/* Label with tooltip on hover */}
            <TooltipLabel
              label={setting.label}
              description={meta.description}
              defaultValue={meta.defaultLabel}
              required={setting.required}
              icon={Icon}
            />
            
            {/* Field */}
            {renderSetting(setting)}
          </div>
        );
      })}

      {/* Error message if any */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive font-inter">
          {error}
        </div>
      )}
    </div>
  );
}
