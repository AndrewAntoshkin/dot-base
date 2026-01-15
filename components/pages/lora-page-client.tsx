'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { useUser } from '@/contexts/user-context';
import { LORA_TRAINERS, LORA_TYPES, getTrainerById, getLoraTypeById } from '@/lib/lora-trainers-config';
import { 
  Upload, Plus, Play, Trash2, Loader2, ExternalLink, Sparkles, Clock, 
  CheckCircle, XCircle, Info, RefreshCw, ChevronDown, X, Eye, Lock,
  Wand2, Settings2, Image as ImageIcon, FileText, Zap, Command, Hash
} from 'lucide-react';

// Types
interface LoraModel {
  id: string;
  name: string;
  description: string | null;
  trigger_word: string;
  status: 'pending' | 'uploading' | 'training' | 'completed' | 'failed';
  type: 'style' | 'character' | 'product' | 'custom';
  lora_url: string | null;
  replicate_model_url: string | null;
  error_message: string | null;
  created_at: string;
  training_started_at: string | null;
  training_completed_at: string | null;
  training_images_count: number;
}

interface TrainingImage {
  file: File;
  url: string;
  uploading: boolean;
  uploaded: string | null;
  caption: string;
  captionLoading: boolean;
}

// Preset LoRAs for demonstration
const PRESET_LORAS: LoraModel[] = [
  {
    id: 'preset-old-school-3d',
    name: 'Old School 3D Renders',
    description: 'Ретро 3D рендер стиль 90-х и 2000-х годов',
    trigger_word: '3DRNDR',
    status: 'completed',
    type: 'style',
    lora_url: 'paulccote/old-school-3d-renders',
    replicate_model_url: null,
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
    replicate_model_url: null,
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
    replicate_model_url: null,
    error_message: null,
    created_at: '2024-08-15',
    training_started_at: null,
    training_completed_at: null,
    training_images_count: 0,
  },
];

// Status badge component
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

// LoRA Card component (styled like action-selector)
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
  const loraType = getLoraTypeById(lora.type);
  
  return (
    <div 
      className={`bg-neutral-900 rounded-[16px] border overflow-hidden transition-all cursor-pointer ${
        isSelected ? 'border-white' : 'border-transparent hover:border-[#404040]'
      }`}
      onClick={() => onView?.(lora)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-inter font-semibold text-[13px] leading-[18px] text-white truncate">
              {loraType?.icon} {lora.name}
            </h3>
            <span className="text-[10px] text-[#606060] uppercase tracking-[0.15px]">{loraType?.label || lora.type}</span>
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
            <span className="text-[10px] text-[#606060] uppercase">Trigger:</span>
            <code className="px-1.5 py-0.5 rounded bg-[#252525] text-[10px] text-[#00D9FF] font-mono">
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
          className="flex-1 h-[40px] px-4 rounded-[12px] bg-white text-black font-inter font-medium text-[13px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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
            className="h-[40px] w-[40px] rounded-[12px] border border-[#2f2f2f] flex items-center justify-center text-[#959595] hover:text-red-500 hover:border-red-500/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Image compression utility
async function compressImage(file: File, maxSize: number = 1024, quality: number = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      if (width <= maxSize && height <= maxSize) {
        resolve(file);
        return;
      }
      
      if (width > height) {
        height = (height / width) * maxSize;
        width = maxSize;
      } else {
        width = (width / height) * maxSize;
        height = maxSize;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    
    img.src = url;
  });
}

// Main LoRA Page Content
function LoraContent() {
  const router = useRouter();
  const { user, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState<'create' | 'my' | 'presets'>('create');
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  
  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [type, setType] = useState('product');
  const [trainerId, setTrainerId] = useState('fast-flux-trainer');
  const [images, setImages] = useState<TrainingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captionProgress, setCaptionProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // My LoRAs state
  const [myLoras, setMyLoras] = useState<LoraModel[]>([]);
  const [lorasLoading, setLorasLoading] = useState(true);
  const [selectedLora, setSelectedLora] = useState<LoraModel | null>(null);

  // Load user's LoRAs
  useEffect(() => {
    loadMyLoras();
  }, []);

  // Poll for training status
  useEffect(() => {
    const trainingLoras = myLoras.filter(l => l.status === 'training' || l.status === 'pending' || l.status === 'uploading');
    if (trainingLoras.length === 0) return;

    const interval = setInterval(() => {
      loadMyLoras();
    }, 10000);

    return () => clearInterval(interval);
  }, [myLoras]);

  const loadMyLoras = async () => {
    try {
      const res = await fetch('/api/loras');
      const data = await res.json();
      if (data.loras) {
        setMyLoras(data.loras);
      }
    } catch (err) {
      console.error('Failed to load LoRAs:', err);
    } finally {
      setLorasLoading(false);
    }
  };

  // Image handling
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
    addImages(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
    e.target.value = '';
  }, []);

  const addImages = async (files: File[]) => {
    const newImages: TrainingImage[] = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      uploading: false,
      uploaded: null,
      caption: '',
      captionLoading: false,
    }));
    
    setImages(prev => [...prev, ...newImages].slice(0, 50));
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Generate captions for all images
  const generateCaptions = async () => {
    if (images.length === 0) return;
    
    const normalizedTrigger = triggerWord.trim().toUpperCase().replace(/\s+/g, '_');
    setCaptionProgress({ current: 0, total: images.length });
    
    // First upload all images that aren't uploaded yet
    const uploadPromises = images.map(async (img, idx) => {
      if (img.uploaded) return img.uploaded;
      
      setImages(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], uploading: true };
        return updated;
      });
      
      try {
        const compressed = await compressImage(img.file);
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('bucket', 'lora-training-images');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        
        setImages(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], uploading: false, uploaded: data.url };
          return updated;
        });
        
        return data.url;
      } catch (err) {
        setImages(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], uploading: false };
          return updated;
        });
        return null;
      }
    });
    
    const uploadedUrls = await Promise.all(uploadPromises);
    
    // Now generate captions in batches
    for (let i = 0; i < images.length; i++) {
      const imageUrl = uploadedUrls[i];
      if (!imageUrl) continue;
      
      setImages(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], captionLoading: true };
        return updated;
      });
      
      try {
        const res = await fetch('/api/loras/caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            trigger_word: normalizedTrigger,
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setImages(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], caption: data.caption, captionLoading: false };
            return updated;
          });
        }
      } catch (err) {
        console.error('Caption generation failed:', err);
      } finally {
        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], captionLoading: false };
          return updated;
        });
        setCaptionProgress(prev => prev ? { ...prev, current: i + 1 } : null);
      }
    }
    
    setCaptionProgress(null);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!name.trim() || !triggerWord.trim() || images.length < 5) {
      setError('Заполните все обязательные поля и загрузите минимум 5 изображений');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload all images first
      const uploadedImages: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        if (images[i].uploaded) {
          uploadedImages.push(images[i].uploaded!);
          continue;
        }
        
        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: true };
          return updated;
        });
        
        const compressed = await compressImage(images[i].file);
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('bucket', 'lora-training-images');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Ошибка загрузки изображения');
        const data = await res.json();
        uploadedImages.push(data.url);
        
        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: false, uploaded: data.url };
          return updated;
        });
      }
      
      // Collect captions
      const captions = images.map((img, idx) => ({
        image_url: uploadedImages[idx],
        caption: img.caption || '',
      }));
      
      // Create LoRA
      const normalizedTrigger = triggerWord.trim().toUpperCase().replace(/\s+/g, '_');
      
      const res = await fetch('/api/loras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          trigger_word: normalizedTrigger,
          type,
          trainer_id: trainerId,
          image_urls: uploadedImages,
          captions,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка создания LoRA');
      }
      
      // Success - reset form and switch to My LoRAs tab
      setName('');
      setDescription('');
      setTriggerWord('');
      setType('product');
      setImages([]);
      setActiveTab('my');
      loadMyLoras();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use LoRA - navigate to generation
  const handleUseLora = (lora: LoraModel) => {
    const loraUrl = lora.replicate_model_url || lora.lora_url || '';
    const trigger = lora.trigger_word || '';
    router.push(`/?model=flux-dev-lora&lora=${lora.id}&lora_url=${encodeURIComponent(loraUrl)}&trigger=${encodeURIComponent(trigger)}`);
  };

  // Delete LoRA
  const handleDeleteLora = async (lora: LoraModel) => {
    if (!confirm('Удалить эту LoRA модель?')) return;
    
    try {
      await fetch(`/api/loras/${lora.id}`, { method: 'DELETE' });
      loadMyLoras();
      if (selectedLora?.id === lora.id) {
        setSelectedLora(null);
      }
    } catch (err) {
      console.error('Failed to delete LoRA:', err);
    }
  };

  // Sync status
  const handleSyncStatus = async (lora: LoraModel) => {
    try {
      const res = await fetch(`/api/loras/${lora.id}`, { method: 'PATCH' });
      if (res.ok) {
        loadMyLoras();
      }
    } catch (err) {
      console.error('Failed to sync status:', err);
    }
  };

  const trainer = getTrainerById(trainerId);
  const loraType = getLoraTypeById(type);

  // Trainer options for select
  const trainerOptions: SelectOption[] = LORA_TRAINERS.map(t => ({
    value: t.id,
    label: t.displayName,
    badge: t.recommended ? { text: 'Рекомендуем', className: 'bg-green-600' } : undefined,
  }));

  return (
    <div className="h-screen flex flex-col bg-[#101010] overflow-hidden">
      <Header />
      
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden">
        <MobileTabSwitcher
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
        />
      </div>
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Input */}
        <div className={`w-full lg:w-[440px] flex-shrink-0 flex flex-col border-r border-[#1a1a1a] overflow-y-auto ${
          mobileActiveTab === 'output' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 space-y-4">
            
            {/* Tab Selector - styled like ActionSelector */}
            <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                <Command className="w-3 h-3" />
                Режим
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'create', label: 'Создать LoRA' },
                  { id: 'my', label: 'Мои LoRA' },
                  { id: 'presets', label: 'Готовые' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex-1 h-[56px] px-4 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-neutral-900 ${
                      activeTab === tab.id
                        ? 'border border-white'
                        : 'border border-transparent hover:border-[#404040]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Form */}
            {activeTab === 'create' && (
              <div className="space-y-4">
                {/* Error */}
                {error && (
                  <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Name */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <FileText className="w-3 h-3" />
                    Название *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Моя бутылка"
                    className="w-full h-12 px-3 rounded-[8px] bg-neutral-900 text-white text-[14px] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
                
                {/* Description */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <Info className="w-3 h-3" />
                    Описание
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание вашей LoRA модели..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-[8px] bg-neutral-900 text-white text-[14px] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white resize-none"
                  />
                </div>
                
                {/* Trigger Word */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <Hash className="w-3 h-3" />
                    Trigger Word *
                  </label>
                  <input
                    type="text"
                    value={triggerWord}
                    onChange={(e) => setTriggerWord(e.target.value.toUpperCase().replace(/[^A-Z0-9_\s]/g, ''))}
                    placeholder="MYBOTTLE"
                    className="w-full h-12 px-3 rounded-[8px] bg-neutral-900 text-white text-[14px] font-mono placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white uppercase"
                  />
                  <p className="text-[10px] text-[#606060]">
                    Уникальное слово для активации стиля (A-Z, 0-9, _)
                  </p>
                </div>
                
                {/* Type Selector */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <Settings2 className="w-3 h-3" />
                    Тип LoRA
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {LORA_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        title={t.description}
                        className={`px-3 py-2 rounded-[12px] font-inter text-[13px] transition-colors ${
                          type === t.id
                            ? 'bg-white text-black'
                            : 'bg-neutral-900 text-white hover:border-[#404040] border border-transparent'
                        }`}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#606060]">
                    {loraType?.description}
                    {type === 'style' && ' ⚠️ Для художественных стилей, НЕ для объектов'}
                  </p>
                </div>
                
                {/* Trainer Selector */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <Zap className="w-3 h-3" />
                    Модель обучения
                  </label>
                  <MobileSelect
                    value={trainerId}
                    onValueChange={setTrainerId}
                    options={trainerOptions}
                    title="Модель обучения"
                  />
                  {trainer && (
                    <div className="space-y-1 mt-2">
                      <p className="text-[11px] text-[#959595]">{trainer.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {trainer.features.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-[#252525] text-[10px] text-[#00D9FF]">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#606060]">
                        ⏱ ~{trainer.trainingTime} • {trainer.minImages}-{trainer.maxImages} изображений
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Image Upload */}
                <div className="border border-[#252525] rounded-[16px] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      <ImageIcon className="w-3 h-3" />
                      Изображения * ({images.length}/{trainer?.maxImages || 50})
                    </label>
                    {images.length >= 5 && (
                      <button
                        onClick={generateCaptions}
                        disabled={captionProgress !== null}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#252525] text-[10px] text-[#00D9FF] hover:bg-[#303030] transition-colors disabled:opacity-50"
                      >
                        {captionProgress ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {captionProgress.current}/{captionProgress.total}
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3" />
                            Сгенерировать описания
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[12px] p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-white bg-white/5'
                        : 'border-[#2f2f2f] hover:border-[#404040]'
                    }`}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-[#606060]" />
                    <p className="text-sm text-[#959595]">
                      Перетащите или <span className="text-white font-medium">выберите</span>
                    </p>
                    <p className="text-[10px] text-[#606060] mt-1">
                      JPG, PNG • мин. {trainer?.minImages || 5} изображений
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
                  
                  {/* Images grid with captions */}
                  {images.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {images.map((img, idx) => (
                        <div key={idx} className="flex gap-2 p-2 bg-[#1A1A1A] rounded-[8px]">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <img
                              src={img.url}
                              alt=""
                              className="w-full h-full object-cover rounded-[6px]"
                            />
                            {(img.uploading || img.captionLoading) && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[6px]">
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                              </div>
                            )}
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <textarea
                              value={img.caption}
                              onChange={(e) => {
                                setImages(prev => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], caption: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="Описание изображения..."
                              rows={2}
                              className="w-full px-2 py-1 text-[11px] bg-[#252525] rounded text-white placeholder:text-[#606060] focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Info box */}
                <div className="p-3 rounded-[12px] bg-[#1A1A1A] border border-[#252525]">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#00D9FF] flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-[#959595] space-y-1">
                      <p><strong className="text-white">Рекомендации:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                        <li>25-30 изображений для лучшего результата</li>
                        <li>Разные ракурсы, освещение, фоны</li>
                        <li>Разрешение 1024x1024 оптимально</li>
                        <li>Описания улучшают качество обучения</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Submit buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setName('');
                      setDescription('');
                      setTriggerWord('');
                      setType('product');
                      setImages([]);
                      setError(null);
                    }}
                    className="flex-1 h-[48px] rounded-[12px] border border-[#2f2f2f] text-white font-inter font-medium text-[14px] hover:border-[#404040] transition-colors"
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || images.length < 5 || !name.trim() || !triggerWord.trim()}
                    className="flex-1 h-[48px] rounded-[12px] bg-white text-black font-inter font-medium text-[14px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Создать LoRA
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* My LoRAs */}
            {activeTab === 'my' && (
              <div className="space-y-3">
                {lorasLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#959595]" />
                  </div>
                ) : myLoras.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#404040]" />
                    <p className="text-[#959595] text-sm">У вас пока нет LoRA моделей</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 px-4 py-2 rounded-[12px] bg-white text-black text-sm font-medium"
                    >
                      Создать первую LoRA
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {myLoras.map((lora) => (
                      <LoraCard
                        key={lora.id}
                        lora={lora}
                        onUse={handleUseLora}
                        onDelete={handleDeleteLora}
                        onView={setSelectedLora}
                        isSelected={selectedLora?.id === lora.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preset LoRAs */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <p className="text-[11px] text-[#959595]">
                  Готовые 3D стили для быстрого старта
                </p>
                <div className="grid gap-3">
                  {PRESET_LORAS.map((lora) => (
                    <LoraCard
                      key={lora.id}
                      lora={lora}
                      onUse={handleUseLora}
                      onView={setSelectedLora}
                      isPreset
                      isSelected={selectedLora?.id === lora.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Details/Output */}
        <div className={`flex-1 flex flex-col bg-[#0A0A0A] overflow-y-auto ${
          mobileActiveTab === 'input' ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedLora ? (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {getLoraTypeById(selectedLora.type)?.icon} {selectedLora.name}
                  </h2>
                  <p className="text-sm text-[#959595] mt-1">{selectedLora.description}</p>
                </div>
                <StatusBadge status={selectedLora.status} />
              </div>
              
              {/* Details */}
              <div className="grid gap-4">
                <div className="p-4 bg-[#1A1A1A] rounded-[12px] space-y-3">
                  <h3 className="text-sm font-medium text-white">Информация</h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#606060]">Тип:</span>
                      <span className="text-white ml-2">{getLoraTypeById(selectedLora.type)?.label}</span>
                    </div>
                    <div>
                      <span className="text-[#606060]">Trigger:</span>
                      <code className="ml-2 px-1.5 py-0.5 rounded bg-[#252525] text-[#00D9FF] font-mono text-xs">
                        {selectedLora.trigger_word || '—'}
                      </code>
                    </div>
                    <div>
                      <span className="text-[#606060]">Создано:</span>
                      <span className="text-white ml-2">
                        {new Date(selectedLora.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#606060]">Изображений:</span>
                      <span className="text-white ml-2">{selectedLora.training_images_count || '—'}</span>
                    </div>
                  </div>
                  
                  {selectedLora.lora_url && (
                    <div>
                      <span className="text-[#606060] text-sm">Model URL:</span>
                      <code className="block mt-1 px-2 py-1 rounded bg-[#252525] text-[10px] text-[#00D9FF] font-mono break-all">
                        {selectedLora.replicate_model_url || selectedLora.lora_url}
                      </code>
                    </div>
                  )}
                </div>
                
                {/* Error message */}
                {selectedLora.error_message && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-[12px]">
                    <p className="text-red-400 text-sm">{selectedLora.error_message}</p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUseLora(selectedLora)}
                    disabled={selectedLora.status !== 'completed'}
                    className="flex-1 h-[48px] rounded-[12px] bg-white text-black font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    Использовать для генерации
                  </button>
                  
                  {(selectedLora.status === 'training' || selectedLora.status === 'failed') && !selectedLora.id.startsWith('preset-') && (
                    <button
                      onClick={() => handleSyncStatus(selectedLora)}
                      className="h-[48px] px-4 rounded-[12px] border border-[#2f2f2f] text-white flex items-center gap-2 hover:border-[#404040]"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Обновить статус
                    </button>
                  )}
                </div>
                
                {/* Usage example */}
                {selectedLora.status === 'completed' && (
                  <div className="p-4 bg-[#1A1A1A] rounded-[12px] space-y-3">
                    <h3 className="text-sm font-medium text-white">Пример использования</h3>
                    <code className="block p-3 rounded bg-[#252525] text-[12px] text-[#959595] font-mono">
                      {selectedLora.trigger_word ? `${selectedLora.trigger_word}, ` : ''}a beautiful product shot of [your subject], professional lighting, studio photography
                    </code>
                    <p className="text-[10px] text-[#606060]">
                      Используйте trigger word в начале промпта для активации стиля
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-[#252525]" />
                <p className="text-[#606060] text-sm">Выберите LoRA для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoraPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <LoraContent />
    </Suspense>
  );
}
