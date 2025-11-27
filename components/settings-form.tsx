'use client';

import React, { useState, useRef, useCallback } from 'react';
import { getModelById, ModelSetting } from '@/lib/models-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

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
  const acceptType = isVideoField ? 'image/*,video/*' : 'image/*';

  const handleFile = useCallback((file: File) => {
    const isValidType = file.type.startsWith('image/') || (isVideoField && file.type.startsWith('video/'));
    if (!isValidType) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
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
        {description && (
          <p className="font-inter text-[14px] text-[#959595] mt-2">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div>
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
      {description && (
        <p className="font-inter text-[14px] text-[#959595] mt-2">{description}</p>
      )}
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
    
    // Читаем все файлы параллельно с Promise.all
    const readFilePromises = filesToProcess.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });
    
    // Ждём все файлы и обновляем состояние один раз
    const results = await Promise.all(readFilePromises);
    onChange([...valueRef.current, ...results]);
  }, [maxFiles, onChange]);

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
            accept={isVideoField ? 'image/*,video/*' : 'image/*'}
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

      {description && (
        <p className="font-inter text-[14px] text-[#959595] mt-2">{description}</p>
      )}

      {/* Превью загруженных изображений - под областью загрузки, 4 в ряд */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-3 ml-1">
          {value.map((img, index) => (
            <div 
              key={index} 
              onClick={() => handleSelectImage(index)}
              className={`
                relative rounded-[8px] overflow-hidden bg-[#0a0a0a] cursor-pointer transition-all
                ${selectedIndex === index 
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#050505]' 
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

interface SettingsFormProps {
  modelId: string;
  onGenerationCreated: (generationId: string, generation: any) => void;
  onFormDataChange?: (data: Record<string, any>) => void;
  onSubmitStart?: () => void;
  onError?: (error: string) => void;
  initialData?: Record<string, any>;
}

export function SettingsForm({
  modelId,
  onGenerationCreated,
  onFormDataChange,
  onSubmitStart,
  onError,
  initialData,
}: SettingsFormProps) {
  const model = getModelById(modelId);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Состояние для выбранных индексов изображений в file_array полях
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});

  // Sync initialData to formData when it changes
  React.useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
    }
  }, [initialData, modelId]);

  if (!model) return null;

  // Expose form data to parent
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [formData, onFormDataChange]);

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
          // Загружаем одиночный файл
          console.log(`Uploading file for ${setting.name}...`);
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ files: [fieldValue] }),
          });
          
          const uploadResult = await uploadResponse.json();
          
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
            console.log(`Uploading ${base64Files.length} files for ${setting.name}...`);
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ files: base64Files }),
            });
            
            const uploadResult = await uploadResponse.json();
            
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
      
      const response = await fetch('/api/generations/create', {
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
      });

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

  // Expose methods to parent via ref or global
  React.useEffect(() => {
    (window as any).__settingsFormSubmit = handleSubmit;
    (window as any).__settingsFormReset = handleReset;
    (window as any).__settingsFormLoading = isLoading;
  }, [handleSubmit, isLoading]);

  const updateFormData = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const renderSetting = (setting: ModelSetting) => {
    const value = formData[setting.name] ?? setting.default ?? '';

    switch (setting.type) {
      case 'textarea':
        return (
          <div className="relative">
            <Textarea
              value={value}
              onChange={(e) => updateFormData(setting.name, e.target.value)}
              placeholder={setting.placeholder || 'Напишите запрос'}
              required={setting.required}
              rows={4}
            />
            {setting.description && (
              <p className="font-inter text-[14px] text-[#959595] mt-2">
                {setting.description}
              </p>
            )}
          </div>
        );

      case 'text':
      case 'number':
        return (
          <div>
            <Input
              type={setting.type}
              value={value}
              onChange={(e) => updateFormData(setting.name, e.target.value)}
              placeholder={setting.placeholder}
              required={setting.required}
              min={setting.min}
              max={setting.max}
              step={setting.step}
            />
            {setting.description && (
              <p className="font-inter text-[14px] text-[#959595] mt-2">
                {setting.description}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div>
            <Select
              value={value}
              onValueChange={(v) => updateFormData(setting.name, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выбрать из списка" />
              </SelectTrigger>
              <SelectContent className="bg-[#101010] border-[#2f2f2f]">
                {setting.options?.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="font-inter text-[14px] text-white focus:bg-[#1f1f1f]"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setting.description && (
              <p className="font-inter text-[14px] text-[#959595] mt-2">
                {setting.description}
              </p>
            )}
          </div>
        );

      case 'slider':
        const min = setting.min ?? 0;
        const max = setting.max ?? 100;
        const currentValue = typeof value === 'number' ? value : min;
        const percentage = ((currentValue - min) / (max - min)) * 100;
        
        return (
          <div>
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
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[#050505] shadow-sm cursor-pointer"
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
            {setting.description && (
              <p className="font-inter text-[14px] text-[#959595] mt-2">
                {setting.description}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => updateFormData(setting.name, e.target.checked)}
                className="w-4 h-4 rounded accent-white"
              />
              <span className="font-inter font-medium text-[14px] text-white">{setting.label}</span>
            </label>
            {setting.description && (
              <p className="font-inter text-[14px] text-[#959595] mt-2">
                {setting.description}
              </p>
            )}
          </div>
        );

      case 'file':
        return (
          <FileUploader
            key={`file-${setting.name}-${modelId}`}
            settingName={setting.name}
            value={formData[setting.name]}
            onChange={(val) => updateFormData(setting.name, val)}
            description={setting.description}
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
            description={setting.description}
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

  return (
    <div className="flex flex-col gap-6">
      {/* Only fields, no buttons */}
      {model.settings.map((setting) => (
        <div key={setting.name} className="flex flex-col gap-2 shrink-0">
          {setting.type !== 'checkbox' && (
            <label className="font-inter font-medium text-[14px] leading-[20px] text-white tracking-[-0.084px]">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {renderSetting(setting)}
        </div>
      ))}

      {/* Error message if any */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive font-inter">
          {error}
        </div>
      )}
    </div>
  );
}
