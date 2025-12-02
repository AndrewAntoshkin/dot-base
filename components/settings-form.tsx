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

import { fetchWithTimeout, isSlowConnection, isOnline, NetworkError } from '@/lib/network-utils';

// Максимальный размер файла для загрузки (уменьшен для мобильного)
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB для лучшей совместимости с мобильным
// Качество сжатия JPEG
const COMPRESSION_QUALITY = 0.80;
// Максимальное разрешение (по большей стороне)
const MAX_DIMENSION = 2048;

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
  const [isDragging, setIsDragging] = useState(false);

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
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        h-12 flex items-center pl-3 gap-2 border border-dashed rounded-[8px] cursor-pointer transition-colors
        ${isDragging 
          ? 'border-white bg-white/5' 
          : 'border-[#656565] hover:border-white bg-[#101010]'
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
      <span className="font-inter text-[14px] text-[#959595]">
        {isVideoField ? 'Выберите файл' : 'Выберите на устройстве'}
      </span>
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
  const [isDragging, setIsDragging] = useState(false);
  // Храним текущее значение в ref для доступа из async callbacks
  const valueRef = useRef(value);
  valueRef.current = value;

  // Определяем, это видео или изображение по settingName
  const isVideoField = settingName.toLowerCase().includes('video') || acceptVideo;

  const handleFiles = useCallback(async (files: FileList) => {
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
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            h-12 flex items-center pl-3 gap-2 border border-dashed rounded-[8px] cursor-pointer transition-colors
            ${isDragging 
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
          <span className="font-inter text-[14px] text-[#959595]">
            {isVideoField ? `Добавить файлы (${value.length}/${maxFiles})` : `Добавить изображения (${value.length}/${maxFiles})`}
          </span>
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
  onError?: (error: string) => void;
  initialData?: Record<string, any>;
  formRef?: React.MutableRefObject<SettingsFormRef | null>;
}

export function SettingsForm({
  modelId,
  onGenerationCreated,
  onFormDataChange,
  onSubmitStart,
  onError,
  initialData,
  formRef,
}: SettingsFormProps) {
  const model = getModelById(modelId);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Состояние для выбранных индексов изображений в file_array полях
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});
  // Ref для хранения handleSubmit функции (чтобы использовать в useEffect до определения функции)
  const handleSubmitRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Sync initialData to formData when it changes
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, [initialData, modelId]);

  // Expose form data to parent
  React.useEffect(() => {
    if (onFormDataChange && model) {
      onFormDataChange(formData);
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
          // Проверяем соединение перед загрузкой
          if (!isOnline()) {
            throw new Error('Нет подключения к интернету. Проверьте соединение');
          }
          
          // Загружаем одиночный файл
          console.log(`Uploading file for ${setting.name}...`);
          
          // Используем fetchWithTimeout для надёжной загрузки
          const uploadTimeout = isSlowConnection() ? 120000 : 60000; // 2 мин для медленного, 1 мин обычно
          
          let uploadResponse;
          try {
            uploadResponse = await fetchWithTimeout('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ files: [fieldValue] }),
              timeout: uploadTimeout,
              retries: 2,
              retryDelay: 2000,
            });
          } catch (networkErr: any) {
            console.error('Network error during upload:', networkErr);
            if (networkErr.code === 'TIMEOUT') {
              throw new Error('Загрузка прервана из-за медленного соединения. Попробуйте позже или используйте WiFi');
            }
            if (networkErr.code === 'OFFLINE') {
              throw new Error('Потеряно соединение с интернетом');
            }
            throw new Error('Ошибка сети при загрузке. Проверьте соединение');
          }
          
          // Безопасный парсинг JSON - сервер может вернуть HTML при ошибке
          let uploadResult;
          const responseText = await uploadResponse.text();
          try {
            uploadResult = JSON.parse(responseText);
          } catch {
            console.error('Server returned non-JSON response:', responseText.substring(0, 200));
            if (responseText.toLowerCase().includes('entity too large') || uploadResponse.status === 413) {
              throw new Error('Файл слишком большой. Максимальный размер: 4MB');
            }
            throw new Error('Ошибка сервера при загрузке файла');
          }
          
          if (!uploadResponse.ok) {
            console.error('Upload failed:', uploadResult);
            throw new Error(uploadResult.error || 'Не удалось загрузить файл');
          }
          
          if (uploadResult.urls && uploadResult.urls.length > 0) {
            processedSettings[setting.name] = uploadResult.urls[0];
            console.log(`File uploaded: ${uploadResult.urls[0]}`);
          } else {
            throw new Error('Файл не был загружен');
          }
        } else if (setting.type === 'file_array' && Array.isArray(fieldValue) && fieldValue.length > 0) {
          // Фильтруем только base64 строки
          const base64Files = fieldValue.filter((f: string) => f && f.startsWith('data:'));
          
          if (base64Files.length > 0) {
            // Проверяем соединение перед загрузкой
            if (!isOnline()) {
              throw new Error('Нет подключения к интернету. Проверьте соединение');
            }
            
            console.log(`Uploading ${base64Files.length} files for ${setting.name}...`);
            
            // Увеличенный timeout для множественных файлов
            const uploadTimeout = isSlowConnection() ? 180000 : 90000; // 3 мин для медленного
            
            let uploadResponse;
            try {
              uploadResponse = await fetchWithTimeout('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ files: base64Files }),
                timeout: uploadTimeout,
                retries: 2,
                retryDelay: 3000,
              });
            } catch (networkErr: any) {
              console.error('Network error during upload:', networkErr);
              if (networkErr.code === 'TIMEOUT') {
                throw new Error('Загрузка прервана. Попробуйте загрузить меньше файлов или используйте WiFi');
              }
              if (networkErr.code === 'OFFLINE') {
                throw new Error('Потеряно соединение с интернетом');
              }
              throw new Error('Ошибка сети при загрузке. Проверьте соединение');
            }
            
            // Безопасный парсинг JSON - сервер может вернуть HTML при ошибке
            let uploadResult;
            const responseText = await uploadResponse.text();
            try {
              uploadResult = JSON.parse(responseText);
            } catch {
              console.error('Server returned non-JSON response:', responseText.substring(0, 200));
              if (responseText.toLowerCase().includes('entity too large') || uploadResponse.status === 413) {
                throw new Error('Файлы слишком большие. Попробуйте меньше файлов или уменьшите размер');
              }
              throw new Error('Ошибка сервера при загрузке файлов');
            }
            
            if (!uploadResponse.ok) {
              console.error('Upload failed:', uploadResult);
              throw new Error(uploadResult.error || 'Не удалось загрузить файлы');
            }
            
            if (uploadResult.urls && uploadResult.urls.length > 0) {
              processedSettings[setting.name] = uploadResult.urls;
              console.log(`Files uploaded: ${uploadResult.urls.length}`);
            } else {
              throw new Error('Файлы не были загружены');
            }
          }
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
            className="bg-[#101010] border-0 rounded-[8px] min-h-[80px]"
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
            className="bg-[#101010] border-0 h-12 rounded-[8px]"
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
        
        // Checkbox рендерится с тултипом на label
        if (setting.type === 'checkbox') {
          const Icon = getFieldIcon(setting.name, setting.type);
          return (
            <div key={setting.name} className="bg-[#1a1a1a] rounded-[16px] p-4 flex flex-col gap-2">
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
            <div key={setting.name} className="bg-[#1a1a1a] rounded-[16px] p-4 flex flex-col gap-2">
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
          <div key={setting.name} className="bg-[#1a1a1a] rounded-[16px] p-4 flex flex-col gap-2">
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
