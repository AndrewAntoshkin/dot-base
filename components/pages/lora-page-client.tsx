'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { useUser } from '@/contexts/user-context';
import { Upload, Plus, Play, Trash2, Loader2, ExternalLink, Sparkles, Clock, CheckCircle, XCircle, Info, RefreshCw, ChevronDown, X, Eye, Lock } from 'lucide-react';

// Types
interface LoraModel {
  id: string;
  name: string;
  description: string | null;
  trigger_word: string;
  status: 'pending' | 'uploading' | 'training' | 'completed' | 'failed';
  type: 'style' | 'character' | 'product' | 'custom';
  lora_url: string | null;
  error_message: string | null;
  created_at: string;
  training_started_at: string | null;
  training_completed_at: string | null;
  training_images_count: number;
}

// Preset LoRAs for testing
const PRESET_LORAS: LoraModel[] = [
  {
    id: 'preset-old-school-3d',
    name: 'Old School 3D Renders',
    description: 'Ретро 3D рендер стиль 90-х и 2000-х годов',
    trigger_word: '3DRNDR',
    status: 'completed',
    type: 'style',
    lora_url: 'paulccote/old-school-3d-renders',
    error_message: null,
    created_at: '2024-09-08',
    training_started_at: null,
    training_completed_at: null,
    training_images_count: 0,
  },
  {
    id: 'preset-3d-cartoon',
    name: '3D Cartoon Style',
    description: 'Мультяшный 3D стиль для персонажей',
    trigger_word: '',
    status: 'completed',
    type: 'style',
    lora_url: 'drdanieltsang/3dcartoonstyle',
    error_message: null,
    created_at: '2025-01-21',
    training_started_at: null,
    training_completed_at: null,
    training_images_count: 0,
  },
  {
    id: 'preset-pixar',
    name: 'Pixar Style',
    description: 'Стиль анимации Pixar',
    trigger_word: 'pixar style',
    status: 'completed',
    type: 'style',
    lora_url: 'fofr/flux-pixar',
    error_message: null,
    created_at: '2024-08-15',
    training_started_at: null,
    training_completed_at: null,
    training_images_count: 0,
  },
];

// Status badge
function StatusBadge({ status }: { status: LoraModel['status'] }) {
  const config = {
    pending: { icon: Clock, label: 'В очереди', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
    uploading: { icon: Loader2, label: 'Загрузка', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    training: { icon: Loader2, label: 'Обучение', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    completed: { icon: CheckCircle, label: 'Готова', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
    failed: { icon: XCircle, label: 'Ошибка', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className={`w-3 h-3 ${status === 'training' || status === 'uploading' ? 'animate-spin' : ''}`} />
      {label}
    </div>
  );
}

// LoRA Card component
function LoraCard({ 
  lora, 
  onUse, 
  onDelete,
  onView,
  isPreset = false,
  isSelected = false,
}: { 
  lora: LoraModel; 
  onUse: (lora: LoraModel) => void;
  onDelete?: (lora: LoraModel) => void;
  onView?: (lora: LoraModel) => void;
  isPreset?: boolean;
  isSelected?: boolean;
}) {
  return (
    <div 
      className={`bg-[#1A1A1A] rounded-2xl border overflow-hidden transition-colors cursor-pointer ${
        isSelected ? 'border-white' : 'border-[#2f2f2f] hover:border-[#404040]'
      }`}
      onClick={() => onView?.(lora)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-inter font-semibold text-sm text-white truncate">
              {lora.name}
            </h3>
            <span className="text-xs text-[#606060] capitalize">{lora.type}</span>
          </div>
          <StatusBadge status={lora.status} />
        </div>
        
        {lora.description && (
          <p className="text-xs text-[#959595] line-clamp-2 mb-2">
            {lora.description}
          </p>
        )}
        
        {lora.trigger_word && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#606060]">Trigger:</span>
            <code className="px-1.5 py-0.5 rounded bg-[#252525] text-xs text-[#00D9FF] font-mono">
              {lora.trigger_word}
            </code>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-3 pt-0 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUse(lora);
          }}
          disabled={lora.status !== 'completed'}
          className="flex-1 h-8 px-3 rounded-lg bg-white text-black font-inter font-medium text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          Использовать
        </button>
        
        {!isPreset && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lora);
            }}
            className="h-8 w-8 rounded-lg border border-[#2f2f2f] flex items-center justify-center text-[#959595] hover:text-red-500 hover:border-red-500/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Create LoRA Form
function CreateLoraForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: { name: string; description: string; trigger_word: string; type: string; image_urls: string[] }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [type, setType] = useState('style');
  const [images, setImages] = useState<{ file: File; url: string; uploading: boolean; uploaded: string | null }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(files);
  }, []);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);
  
  // Compress image before upload (resize to max 1024x1024, quality 85%)
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate new dimensions (max 1024x1024, maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        const maxSize = 1024;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`[LoRA Compress] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`);
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      
      img.onerror = () => resolve(file); // Fallback to original on error
      img.src = URL.createObjectURL(file);
    });
  };

  const addFiles = async (files: File[]) => {
    const newImages = files.slice(0, 20 - images.length).map(file => ({
      file,
      url: URL.createObjectURL(file),
      uploading: true,
      uploaded: null as string | null,
    }));
    
    setImages(prev => [...prev, ...newImages]);
    setUploadError(null);
    
    // Upload all files in parallel for better performance
    const uploadPromises = newImages.map(async (img) => {
      const startTime = Date.now();
      try {
        // Compress image before upload
        const compressedFile = await compressImage(img.file);
        
        const formData = new FormData();
        formData.append('files', compressedFile);
        formData.append('bucket', 'lora-training-images');
        
        console.log(`[LoRA Upload] Starting upload: ${img.file.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        const duration = Date.now() - startTime;
        console.log(`[LoRA Upload] Response received in ${duration}ms: ${img.file.name}`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          if (data.urls?.[0]) {
            setImages(prev => prev.map(p => 
              p.url === img.url ? { ...p, uploading: false, uploaded: data.urls[0] } : p
            ));
            return { success: true, url: img.url, uploadedUrl: data.urls[0] };
          } else {
            throw new Error('No URL returned');
          }
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
      } catch (error: any) {
        setImages(prev => prev.map(p => 
          p.url === img.url ? { ...p, uploading: false } : p
        ));
        return { success: false, url: img.url, error: error.message };
      }
    });
    
    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      setUploadError(`Не удалось загрузить ${failed.length} из ${newImages.length} изображений`);
    }
  };
  
  const removeImage = (url: string) => {
    setImages(prev => prev.filter(p => p.url !== url));
  };
  
  const uploadedImages = images.filter(i => i.uploaded);
  const canSubmit = name.trim() && triggerWord.trim() && uploadedImages.length >= 5 && !isSubmitting;
  
  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      trigger_word: triggerWord.trim().toUpperCase(),
      type,
      image_urls: uploadedImages.map(i => i.uploaded!),
    });
  };
  
  const handleReset = () => {
    setName('');
    setDescription('');
    setTriggerWord('');
    setType('style');
    setImages([]);
    setUploadError(null);
  };
  
  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Название *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Мой 3D стиль"
          className="w-full h-11 px-4 rounded-xl bg-[#1A1A1A] border border-[#2f2f2f] text-white placeholder-[#606060] focus:outline-none focus:border-white/50 transition-colors"
        />
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Опишите стиль..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-[#2f2f2f] text-white placeholder-[#606060] focus:outline-none focus:border-white/50 transition-colors resize-none"
        />
      </div>
      
      {/* Trigger Word */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Trigger Word * <span className="text-[#606060] font-normal">(для активации стиля)</span>
        </label>
        <input
          type="text"
          value={triggerWord}
          onChange={(e) => {
            // Only allow alphanumeric, underscores, and spaces (spaces will be converted to _)
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_\s]/g, '').replace(/\s+/g, '_');
            setTriggerWord(value);
          }}
          placeholder="MY3DSTYLE"
          maxLength={50}
          className="w-full h-11 px-4 rounded-xl bg-[#1A1A1A] border border-[#2f2f2f] text-white placeholder-[#606060] focus:outline-none focus:border-white/50 transition-colors font-mono"
        />
        <p className="text-xs text-[#606060] mt-1">
          Только буквы, цифры и подчеркивания (A-Z, 0-9, _), до 50 символов
        </p>
      </div>
      
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">Тип LoRA</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'product', label: 'Объект', desc: 'Бутылка, машина, предмет' },
            { id: 'character', label: 'Персонаж', desc: 'Лицо, человек, персонаж' },
            { id: 'style', label: 'Стиль', desc: 'Художественный стиль' },
            { id: 'custom', label: 'Другое', desc: 'Свой вариант' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              title={t.desc}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                type === t.id 
                  ? 'bg-white text-black' 
                  : 'bg-[#1A1A1A] text-[#959595] hover:text-white border border-[#2f2f2f]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#606060] mt-1.5">
          {type === 'style' ? '⚠️ Стиль — для обучения художественному стилю, НЕ для объектов' : 
           type === 'product' ? '✓ Объект — для обучения конкретным предметам (бутылки, машины)' :
           type === 'character' ? '✓ Персонаж — для обучения лицам и персонажам' :
           '✓ Свой вариант — для нестандартных случаев'}
        </p>
      </div>
      
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Изображения * <span className="text-[#606060] font-normal">({uploadedImages.length}/20, мин. 5)</span>
        </label>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-white bg-white/5' 
              : 'border-[#2f2f2f] hover:border-[#404040]'
          }`}
        >
          <Upload className="w-6 h-6 text-[#606060] mx-auto mb-2" />
          <p className="text-xs text-[#959595]">
            Перетащите или <span className="text-white">выберите</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
        
        {images.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            {images.map((img, index) => (
              <div key={img.url} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={img.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {img.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
                {!img.uploading && !img.uploaded && (
                  <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.url);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2f2f2f]">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
          <div className="text-xs text-[#959595]">
            <p className="font-medium text-white mb-1">Рекомендации:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Разрешение от 1024x1024</li>
              <li>10-15 изображений оптимально</li>
              <li>Единый стиль, разные объекты</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleReset}
          disabled={isSubmitting}
          className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
        >
          Сбросить
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Создание...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Начать обучение
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// LoRA Detail Panel
function LoraDetailPanel({
  lora,
  onUse,
  onClose,
  onSync,
  isSyncing = false,
  isPreset = false,
}: {
  lora: LoraModel | null;
  onUse: (lora: LoraModel) => void;
  onClose: () => void;
  onSync?: (lora: LoraModel) => void;
  isSyncing?: boolean;
  isPreset?: boolean;
}) {
  if (!lora) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-[#404040]" />
        </div>
        <h3 className="font-inter font-semibold text-lg text-white mb-2">
          Выберите LoRA
        </h3>
        <p className="text-sm text-[#959595]">
          Выберите модель из списка или создайте новую
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-6 animate-fade-in-up">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-inter font-semibold text-xl text-white mb-1">{lora.name}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#606060] capitalize">{lora.type}</span>
            <StatusBadge status={lora.status} />
          </div>
        </div>
        {isPreset && lora.lora_url && (
          <a 
            href={`https://replicate.com/${lora.lora_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#959595] hover:text-white transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        )}
      </div>
      
      {lora.description && (
        <p className="text-sm text-[#959595] mb-6">{lora.description}</p>
      )}
      
      {/* Details */}
      <div className="space-y-4 mb-6">
        {lora.trigger_word && (
          <div>
            <label className="block text-xs text-[#606060] mb-1">Trigger Word</label>
            <code className="block px-3 py-2 rounded-lg bg-[#1A1A1A] text-sm text-[#00D9FF] font-mono">
              {lora.trigger_word}
            </code>
          </div>
        )}
        
        {lora.lora_url && (
          <div>
            <label className="block text-xs text-[#606060] mb-1">Model URL</label>
            <code className="block px-3 py-2 rounded-lg bg-[#1A1A1A] text-xs text-[#959595] font-mono break-all">
              {lora.lora_url}
            </code>
          </div>
        )}
        
        {lora.training_images_count > 0 && (
          <div>
            <label className="block text-xs text-[#606060] mb-1">Training Images</label>
            <span className="text-sm text-white">{lora.training_images_count} изображений</span>
          </div>
        )}
        
        {lora.error_message && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <span className="text-sm text-red-400">{lora.error_message}</span>
          </div>
        )}
        
        {/* Sync status button for training */}
        {lora.status === 'training' && !isPreset && onSync && (
          <button
            onClick={() => onSync(lora)}
            disabled={isSyncing}
            className="w-full h-10 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 font-inter font-medium text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Проверка статуса...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Обновить статус
              </>
            )}
          </button>
        )}
        
        {lora.error_message && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-500">{lora.error_message}</p>
          </div>
        )}
      </div>
      
      {/* Usage example */}
      {lora.status === 'completed' && lora.trigger_word && (
        <div className="mb-6">
          <label className="block text-xs text-[#606060] mb-2">Пример использования</label>
          <div className="p-3 rounded-lg bg-[#1A1A1A] border border-[#2f2f2f]">
            <p className="text-sm text-[#959595] font-mono">
              A photo of <span className="text-[#00D9FF]">{lora.trigger_word}</span> character, studio lighting, 4k
            </p>
          </div>
        </div>
      )}
      
      {/* Action button */}
      <button
        onClick={() => onUse(lora)}
        disabled={lora.status !== 'completed'}
        className="w-full h-11 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" />
        Использовать для генерации
      </button>
    </div>
  );
}

// Main component
function LoraContent() {
  const router = useRouter();
  const { isAdmin, email } = useUser();
  const [userLoras, setUserLoras] = useState<LoraModel[]>([]);
  const [selectedLora, setSelectedLora] = useState<LoraModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [activeTab, setActiveTab] = useState<'create' | 'my' | 'presets'>('create');

  // Redirect non-admins
  useEffect(() => {
    if (email && !isAdmin) {
      router.replace('/');
    }
  }, [email, isAdmin, router]);

  // Show access denied for non-admins (while redirecting)
  if (email && !isAdmin) {
    return (
      <div className="h-screen flex flex-col bg-[#101010]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-16 h-16 text-[#959595] mx-auto mb-4" />
            <h1 className="text-2xl font-medium text-white mb-2">Доступ ограничен</h1>
            <p className="text-[#959595]">Раздел LoRA доступен только администраторам</p>
          </div>
        </main>
      </div>
    );
  }
  
  // Load user's LoRAs
  useEffect(() => {
    const loadLoras = async () => {
      try {
        const response = await fetch('/api/loras', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUserLoras(data.loras || []);
        }
      } catch (error) {
        console.error('Error loading LoRAs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLoras();
  }, []);
  
  // Poll for training status
  useEffect(() => {
    const trainingLoras = userLoras.filter(l => l.status === 'training' || l.status === 'uploading');
    if (trainingLoras.length === 0) return;
    
    const interval = setInterval(async () => {
      for (const lora of trainingLoras) {
        try {
          const response = await fetch(`/api/loras/${lora.id}`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            if (data.lora.status !== lora.status) {
              setUserLoras(prev => prev.map(l => 
                l.id === lora.id ? data.lora : l
              ));
              if (selectedLora?.id === lora.id) {
                setSelectedLora(data.lora);
              }
            }
          }
        } catch (error) {
          console.error('Error polling LoRA status:', error);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [userLoras, selectedLora]);
  
  const handleCreateLora = async (data: { name: string; description: string; trigger_word: string; type: string; image_urls: string[] }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/loras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        setUserLoras(prev => [result.lora, ...prev]);
        setSelectedLora(result.lora);
        setActiveTab('my');
        setMobileActiveTab('output');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Ошибка создания LoRA';
        setError(errorMessage);
        console.error('LoRA creation error:', errorData);
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUseLora = (lora: LoraModel) => {
    // Redirect to Image generation with LoRA
    const params = new URLSearchParams({
      lora: lora.id,
      lora_url: lora.lora_url || '',
      trigger: lora.trigger_word || '',
    });
    window.location.href = `/?${params.toString()}`;
  };
  
  const handleDeleteLora = async (lora: LoraModel) => {
    if (!confirm(`Удалить LoRA "${lora.name}"?`)) return;
    
    try {
      const response = await fetch(`/api/loras/${lora.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUserLoras(prev => prev.filter(l => l.id !== lora.id));
        if (selectedLora?.id === lora.id) {
          setSelectedLora(null);
        }
      }
    } catch (error) {
      console.error('Error deleting LoRA:', error);
    }
  };
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSyncLora = async (lora: LoraModel) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/loras/${lora.id}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.lora) {
          setUserLoras(prev => prev.map(l => 
            l.id === lora.id ? data.lora : l
          ));
          if (selectedLora?.id === lora.id) {
            setSelectedLora(data.lora);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing LoRA:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const displayLoras = activeTab === 'presets' ? PRESET_LORAS : userLoras;
  
  return (
    <div className="h-screen flex flex-col bg-[#101010] overflow-hidden">
      <Header />

      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 min-h-0 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-20 pr-0">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pr-4">
            <div className="mb-6 shrink-0 animate-fade-in-up">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                LORA
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 animate-fade-in-up animate-delay-100">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'create' 
                    ? 'bg-white text-black' 
                    : 'bg-[#1A1A1A] text-[#959595] hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                Создать
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'my' 
                    ? 'bg-white text-black' 
                    : 'bg-[#1A1A1A] text-[#959595] hover:text-white'
                }`}
              >
                Мои ({userLoras.length})
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'presets' 
                    ? 'bg-white text-black' 
                    : 'bg-[#1A1A1A] text-[#959595] hover:text-white'
                }`}
              >
                Готовые ({PRESET_LORAS.length})
              </button>
            </div>

            {/* Content */}
            <div className="animate-fade-in-up animate-delay-200">
              {activeTab === 'create' ? (
                <>
                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                      {error}
                    </div>
                  )}
                  <CreateLoraForm onSubmit={handleCreateLora} isSubmitting={isSubmitting} />
                </>
              ) : (
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  ) : displayLoras.length === 0 ? (
                    <div className="text-center py-12">
                      <Sparkles className="w-10 h-10 text-[#404040] mx-auto mb-3" />
                      <p className="text-sm text-[#959595]">
                        {activeTab === 'my' ? 'У вас пока нет LoRA' : 'Нет готовых LoRA'}
                      </p>
                    </div>
                  ) : (
                    displayLoras.map((lora) => (
                      <LoraCard
                        key={lora.id}
                        lora={lora}
                        onUse={handleUseLora}
                        onDelete={activeTab === 'my' ? handleDeleteLora : undefined}
                        onView={setSelectedLora}
                        isPreset={activeTab === 'presets'}
                        isSelected={selectedLora?.id === lora.id}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pl-0 pr-20">
          <div className="mb-6 animate-fade-in-up">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              ДЕТАЛИ
            </h2>
          </div>

          <div className="animate-fade-in-up animate-delay-200">
            <LoraDetailPanel
              lora={selectedLora}
              onUse={handleUseLora}
              onClose={() => setSelectedLora(null)}
              onSync={handleSyncLora}
              isSyncing={isSyncing}
              isPreset={selectedLora ? PRESET_LORAS.some(p => p.id === selectedLora.id) : false}
            />
          </div>
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-0">
        <div className="mb-4">
          <MobileTabSwitcher 
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
            label="LORA MODELS"
          />
        </div>

        {mobileActiveTab === 'input' ? (
          <div className="flex-1 flex flex-col gap-4 pb-4 overflow-y-auto">
            {/* Mobile tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'create' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#959595]'
                }`}
              >
                Создать
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'my' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#959595]'
                }`}
              >
                Мои ({userLoras.length})
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'presets' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#959595]'
                }`}
              >
                Готовые
              </button>
            </div>

            {activeTab === 'create' ? (
              <>
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
                    {error}
                  </div>
                )}
                <CreateLoraForm onSubmit={handleCreateLora} isSubmitting={isSubmitting} />
              </>
            ) : (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                ) : displayLoras.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-10 h-10 text-[#404040] mx-auto mb-3" />
                    <p className="text-sm text-[#959595]">Нет LoRA моделей</p>
                  </div>
                ) : (
                  displayLoras.map((lora) => (
                    <LoraCard
                      key={lora.id}
                      lora={lora}
                      onUse={handleUseLora}
                      onDelete={activeTab === 'my' ? handleDeleteLora : undefined}
                      onView={(l) => {
                        setSelectedLora(l);
                        setMobileActiveTab('output');
                      }}
                      isPreset={activeTab === 'presets'}
                      isSelected={selectedLora?.id === lora.id}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col pb-4 overflow-y-auto">
            <LoraDetailPanel
              lora={selectedLora}
              onUse={handleUseLora}
              onClose={() => setSelectedLora(null)}
              onSync={handleSyncLora}
              isSyncing={isSyncing}
              isPreset={selectedLora ? PRESET_LORAS.some(p => p.id === selectedLora.id) : false}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoraPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    }>
      <LoraContent />
    </Suspense>
  );
}
