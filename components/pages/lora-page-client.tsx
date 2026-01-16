'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { useUser } from '@/contexts/user-context';
import { LORA_TRAINERS, LORA_TYPES, getTrainerById, getLoraTypeById } from '@/lib/lora-trainers-config';
import { 
  Upload, Plus, Play, Trash2, Loader2, ExternalLink, Sparkles, Clock, 
  CheckCircle, XCircle, Info, RefreshCw, ChevronDown, X, Eye, Lock,
  Wand2, Settings2, Image as ImageIcon, FileText, Zap, Command, Hash, Copy
} from 'lucide-react';

// Types
interface TrainingImage {
  id: string;
  image_url: string;
  caption: string | null;
}

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
  trainer_id?: string;
  training_images?: TrainingImage[];
}

interface TrainingImageFile {
  file: File;
  url: string;
  uploading: boolean;
  uploaded: string | null;
  caption: string;
  captionLoading: boolean;
}

// Status badge component
function StatusBadge({ status }: { status: LoraModel['status'] }) {
  const config = {
    pending: { icon: Clock, label: 'В очереди', className: 'text-white border-[#4D4D4D]' },
    uploading: { icon: Loader2, label: 'Загрузка', className: 'text-white border-[#4D4D4D]' },
    training: { icon: Loader2, label: 'Обучение', className: 'text-white border-[#4D4D4D]' },
    completed: { icon: CheckCircle, label: 'ГОТОВА', className: 'text-white border-[#4D4D4D]' },
    failed: { icon: XCircle, label: 'Ошибка', className: 'text-white border-[#4D4D4D]' },
  };
  
  const { icon: Icon, label, className } = config[status];
  
  return (
    <div className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${className}`}>
      <Icon className={`w-4 h-4 ${status === 'training' || status === 'uploading' ? 'animate-spin' : ''}`} />
      <span className="font-inter font-medium text-xs leading-[1.666] tracking-[-0.01em] uppercase">{label}</span>
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
              {lora.name}
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
            <code className="px-1.5 py-0.5 rounded bg-[#252525] text-[10px] text-white font-mono">
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
          className="flex-1 h-10 px-4 rounded-xl bg-white text-black font-inter font-medium text-sm tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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
            className="h-10 w-10 rounded-xl border border-[#2f2f2f] flex items-center justify-center text-[#959595] hover:text-white hover:border-[#404040] transition-colors"
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
    const img = new window.Image();
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
  const [activeTab, setActiveTab] = useState<'create' | 'my'>('create');
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  
  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [type, setType] = useState('product');
  const [trainerId, setTrainerId] = useState('fast-flux-trainer');
  const [images, setImages] = useState<TrainingImageFile[]>([]);
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
    const newImages: TrainingImageFile[] = files.map(file => ({
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
        formData.append('files', compressed);
        formData.append('bucket', 'lora-training-images');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        
        const imageUrl = data.urls && data.urls.length > 0 ? data.urls[0] : null;
        if (!imageUrl) throw new Error('No URL returned from upload');
        
        setImages(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], uploading: false, uploaded: imageUrl };
          return updated;
        });
        
        return imageUrl;
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
        formData.append('files', compressed);
        formData.append('bucket', 'lora-training-images');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Ошибка загрузки изображения');
        const data = await res.json();
        
        const imageUrl = data.urls && data.urls.length > 0 ? data.urls[0] : null;
        if (!imageUrl) throw new Error('No URL returned from upload');
        
        uploadedImages.push(imageUrl);
        
        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: false, uploaded: imageUrl };
          return updated;
        });
      }
      
      // Auto-generate captions for images that don't have them
      const normalizedTrigger = triggerWord.trim().toUpperCase().replace(/\s+/g, '_');
      const generatedCaptions: string[] = [];
      
      // Generate captions for all images
      for (let i = 0; i < images.length; i++) {
        let caption = images[i].caption;
        
        // If no caption exists, generate it
        if (!caption && uploadedImages[i]) {
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
                image_url: uploadedImages[i],
                trigger_word: normalizedTrigger,
              }),
            });
            
            if (res.ok) {
              const data = await res.json();
              caption = data.caption || '';
              
              setImages(prev => {
                const updated = [...prev];
                updated[i] = { ...updated[i], caption, captionLoading: false };
                return updated;
              });
            } else {
              setImages(prev => {
                const updated = [...prev];
                updated[i] = { ...updated[i], captionLoading: false };
                return updated;
              });
            }
          } catch (err) {
            console.error('Caption generation failed:', err);
            setImages(prev => {
              const updated = [...prev];
              updated[i] = { ...updated[i], captionLoading: false };
              return updated;
            });
          }
        }
        
        generatedCaptions.push(caption || '');
      }
      
      // Collect captions (use generated captions)
      const captions = uploadedImages.map((imageUrl, idx) => ({
        image_url: imageUrl,
        caption: generatedCaptions[idx] || '',
      }));
      
      // Create LoRA (normalizedTrigger already defined above)
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
    badge: t.recommended ? { text: 'Рекомендуем', className: 'bg-[#252525] text-white' } : undefined,
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
      
      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 min-h-0 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-20 pr-0">
          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pr-4">
            {/* Header */}
            <div className="mb-6 shrink-0 animate-fade-in-up">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-3">
              {/* Tab Selector - styled like ActionSelector */}
              <div className="animate-fade-in-up animate-delay-100 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                <Command className="w-3 h-3" />
                Режим
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'create', label: 'Создать' },
                  { id: 'my', label: 'Мои LoRA' },
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
                <>
                  {/* Error */}
                  {error && (
                    <div className="animate-fade-in-up animate-delay-200 p-3 rounded-[12px] bg-[#1A1A1A] border border-[#2f2f2f] text-[#959595] text-sm">
                      {error}
                    </div>
                  )}
                  
                  {/* Name */}
                  <div className="animate-fade-in-up animate-delay-200 border border-[#252525] rounded-[16px] p-4 space-y-2">
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
                  <div className="animate-fade-in-up animate-delay-300 border border-[#252525] rounded-[16px] p-4 space-y-2">
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
                  <div className="animate-fade-in-up animate-delay-400 border border-[#252525] rounded-[16px] p-4 space-y-2">
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
                  <div className="animate-fade-in-up animate-delay-500 border border-[#252525] rounded-[16px] p-4 space-y-2">
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
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#606060]">
                    {loraType?.description}
                    {type === 'style' && ' Для художественных стилей, НЕ для объектов'}
                  </p>
                </div>
                
                  {/* Trainer Selector */}
                  <div className="animate-fade-in-up animate-delay-600 border border-[#252525] rounded-[16px] p-4 space-y-2">
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
                          <span key={i} className="px-2 py-0.5 rounded bg-[#252525] text-[10px] text-white">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#606060]">
                        ~{trainer.trainingTime} • {trainer.minImages}-{trainer.maxImages} изображений
                      </p>
                    </div>
                  )}
                </div>
                
                  {/* Image Upload */}
                  <div className="animate-fade-in-up animate-delay-700 border border-[#252525] rounded-[16px] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      <ImageIcon className="w-3 h-3" />
                      Изображения * ({images.length}/{trainer?.maxImages || 50})
                    </label>
                    {images.length >= 5 && (
                      <button
                        onClick={generateCaptions}
                        disabled={captionProgress !== null}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#252525] text-[10px] text-white hover:bg-[#303030] transition-colors disabled:opacity-50"
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
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#2f2f2f] border border-[#404040] flex items-center justify-center hover:bg-[#404040] transition-colors"
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
                  <div className="animate-fade-in-up animate-delay-800 p-3 rounded-[12px] bg-[#1A1A1A] border border-[#252525]">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#959595] flex-shrink-0 mt-0.5" />
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
                
                </>
              )}

              {/* My LoRAs */}
              {activeTab === 'my' && (
                <div className="animate-fade-in-up animate-delay-200 space-y-3">
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
                          onView={async (lora) => {
                            // Load full LoRA data with training images
                            try {
                              const res = await fetch(`/api/loras/${lora.id}`);
                              const data = await res.json();
                              if (data.lora) {
                                setSelectedLora(data.lora);
                              } else {
                                setSelectedLora(lora);
                              }
                            } catch (err) {
                              console.error('Failed to load LoRA details:', err);
                              setSelectedLora(lora);
                            }
                          }}
                          isSelected={selectedLora?.id === lora.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Fixed buttons at bottom (outside scroll area) */}
          {activeTab === 'create' && (
            <div className="shrink-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] pr-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setDescription('');
                    setTriggerWord('');
                    setType('product');
                    setImages([]);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || images.length < 5 || !name.trim() || !triggerWord.trim()}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
                >
                  {isSubmitting ? 'Создание...' : 'Создать LoRA'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIVIDER (64px) */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT (independent scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pl-0 pr-20">
          <div className="mb-6 animate-fade-in-up">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
          </div>

          <div className="animate-fade-in-up animate-delay-200 flex flex-col gap-6">
            {selectedLora ? (
              <div className="flex flex-col gap-6">
                {/* Header with name, status badge and button */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      название
                    </label>
                    <h2 className="font-inter font-semibold text-2xl text-white leading-[1.333]">
                      {selectedLora.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedLora.status} />
                    <button
                      onClick={() => handleUseLora(selectedLora)}
                      disabled={selectedLora.status !== 'completed'}
                      className="h-10 px-4 rounded-xl bg-white text-black font-inter font-medium text-sm leading-[1.428] tracking-[-0.006em] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Попробовать
                    </button>
                  </div>
                </div>

                {/* Description */}
                {selectedLora.description && (
                  <div className="rounded-[16px] p-4 flex flex-col gap-2 bg-[#171717]">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      описание
                    </label>
                    <p className="font-inter font-medium text-base text-white leading-[1.5]">
                      {selectedLora.description}
                    </p>
                  </div>
                )}

                {/* Info Grid: Trigger word + Model, Type + Created */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Trigger word with copy button */}
                    <div className="rounded-[16px] p-4 flex items-center justify-between gap-3 bg-[#171717]">
                      <div className="flex flex-col gap-3 flex-1">
                        <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                          trigger word
                        </label>
                        <code className="font-inter font-medium text-base text-white font-mono leading-[1.5]">
                          {selectedLora.trigger_word || '—'}
                        </code>
                      </div>
                      {selectedLora.trigger_word && (
                        <button
                          onClick={async () => {
                            if (selectedLora.trigger_word) {
                              await navigator.clipboard.writeText(selectedLora.trigger_word);
                            }
                          }}
                          className="p-2 rounded-[10px] border border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors shrink-0"
                        >
                          <Copy className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>

                    {/* Model */}
                    <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                      <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                        модель
                      </label>
                      <p className="font-inter font-medium text-base text-white leading-[1.5]">
                        {selectedLora.trainer_id ? getTrainerById(selectedLora.trainer_id)?.displayName || '—' : 'Fast Flux Trainer'}
                      </p>
                    </div>

                    {/* Type */}
                    <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                      <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                        Тип
                      </label>
                      <p className="font-inter font-medium text-base text-white leading-[1.5]">
                        {getLoraTypeById(selectedLora.type)?.label || '—'}
                      </p>
                    </div>

                    {/* Created */}
                    <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                      <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                        Создано
                      </label>
                      <p className="font-inter font-medium text-base text-white leading-[1.5]">
                        {new Date(selectedLora.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                </div>

                {/* Usage example */}
                {selectedLora.status === 'completed' && (
                  <div className="rounded-[16px] p-4 flex flex-col gap-2 bg-[#171717]">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      Пример использования
                    </label>
                    <div className="p-3 rounded-[16px] bg-[#101010] flex items-center justify-between gap-3">
                      <code className="font-inter text-sm text-white leading-[1.428] flex-1 break-words">
                        {selectedLora.trigger_word ? `${selectedLora.trigger_word}, ` : ''}a beautiful product shot of [your subject], professional lighting, studio photography
                      </code>
                      <button
                        onClick={async () => {
                          const text = `${selectedLora.trigger_word ? `${selectedLora.trigger_word}, ` : ''}a beautiful product shot of [your subject], professional lighting, studio photography`;
                          await navigator.clipboard.writeText(text);
                        }}
                        className="p-2 rounded-[10px] border border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors shrink-0"
                      >
                        <Copy className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <p className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      Используйте trigger word в начале промпта для активации стиля
                    </p>
                  </div>
                )}

                {/* Images */}
                {selectedLora.training_images && selectedLora.training_images.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      Изображения
                    </label>
                    <div className="flex flex-col gap-4">
                      {selectedLora.training_images.map((img, idx) => (
                        <div key={img.id || idx} className="rounded-[16px] p-4 bg-[#171717] flex items-start gap-4">
                          <div className="w-20 h-20 rounded-[16px] overflow-hidden relative bg-[#1A1A1A] shrink-0">
                            <Image
                              src={img.image_url}
                              alt={`Training image ${idx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          {img.caption && (
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                              <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                                caption
                              </label>
                              <p className="font-inter font-medium text-xs text-white leading-[1.333]">
                                {img.caption}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {selectedLora.error_message && (
                  <div className="border border-[#2f2f2f] rounded-[16px] p-4">
                    <p className="text-[#959595] text-sm">{selectedLora.error_message}</p>
                  </div>
                )}

                {/* Sync status button for training/failed */}
                {(selectedLora.status === 'training' || selectedLora.status === 'failed') && (
                  <button
                    onClick={() => handleSyncStatus(selectedLora)}
                    className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Обновить статус
                  </button>
                )}
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col overflow-hidden">
        {/* Left Panel - Input */}
        <div className={`w-full flex-shrink-0 flex flex-col overflow-y-auto ${
          mobileActiveTab === 'output' ? 'hidden' : 'flex'
        }`}>
          <div className="p-4 flex flex-col gap-3">
            
            {/* Tab Selector */}
            <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                <Command className="w-3 h-3" />
                Режим
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'create', label: 'Создать' },
                  { id: 'my', label: 'Мои LoRA' },
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
              <div className="flex flex-col gap-3">
                {/* Error */}
                {error && (
                  <div className="p-3 rounded-[12px] bg-[#1A1A1A] border border-[#2f2f2f] text-[#959595] text-sm">
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
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#606060]">
                    {loraType?.description}
                    {type === 'style' && ' Для художественных стилей, НЕ для объектов'}
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
                          <span key={i} className="px-2 py-0.5 rounded bg-[#252525] text-[10px] text-white">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#606060]">
                        ~{trainer.trainingTime} • {trainer.minImages}-{trainer.maxImages} изображений
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
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#252525] text-[10px] text-white hover:bg-[#303030] transition-colors disabled:opacity-50"
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
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#2f2f2f] border border-[#404040] flex items-center justify-center hover:bg-[#404040] transition-colors"
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
                    <Info className="w-4 h-4 text-[#959595] flex-shrink-0 mt-0.5" />
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
              </div>
            )}

            {/* My LoRAs - Mobile */}
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

          </div>
          
          {/* Fixed buttons at bottom (mobile) */}
          {activeTab === 'create' && (
            <div className="fixed bottom-0 left-0 right-0 bg-[#101010] p-4 border-t border-[#1f1f1f] z-10">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setDescription('');
                    setTriggerWord('');
                    setType('product');
                    setImages([]);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || images.length < 5 || !name.trim() || !triggerWord.trim()}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
                >
                  {isSubmitting ? 'Создание...' : 'Создать LoRA'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Panel - Details/Output - Mobile */}
        <div className={`flex-1 flex flex-col bg-[#0A0A0A] overflow-y-auto ${
          mobileActiveTab === 'input' ? 'hidden' : 'flex'
        }`}>
          {selectedLora ? (
            <div className="p-4 flex flex-col gap-6">
              {/* Header with name, status badge and button */}
              <div className="flex items-start gap-2">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    название
                  </label>
                  <h2 className="font-inter font-semibold text-2xl text-white leading-[1.333]">
                    {selectedLora.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedLora.status} />
                  <button
                    onClick={() => handleUseLora(selectedLora)}
                    disabled={selectedLora.status !== 'completed'}
                    className="h-10 px-4 rounded-xl bg-white text-black font-inter font-medium text-sm leading-[1.428] tracking-[-0.006em] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Попробовать
                  </button>
                </div>
              </div>

              {/* Description */}
              {selectedLora.description && (
                <div className="rounded-[16px] p-4 flex flex-col gap-2 bg-[#171717]">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    описание
                  </label>
                  <p className="font-inter font-medium text-base text-white leading-[1.5]">
                    {selectedLora.description}
                  </p>
                </div>
              )}

              {/* Info Grid: Trigger word + Model, Type + Created */}
              <div className="grid grid-cols-2 gap-4">
                {/* Trigger word with copy button */}
                <div className="rounded-[16px] p-4 flex items-center justify-between gap-3 bg-[#171717]">
                  <div className="flex flex-col gap-3 flex-1">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      trigger word
                    </label>
                    <code className="font-inter font-medium text-base text-white font-mono leading-[1.5]">
                      {selectedLora.trigger_word || '—'}
                    </code>
                  </div>
                  {selectedLora.trigger_word && (
                    <button
                      onClick={async () => {
                        if (selectedLora.trigger_word) {
                          await navigator.clipboard.writeText(selectedLora.trigger_word);
                        }
                      }}
                      className="p-2 rounded-[10px] border border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors shrink-0"
                    >
                      <Copy className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>

                {/* Model */}
                <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    модель
                  </label>
                  <p className="font-inter font-medium text-base text-white leading-[1.5]">
                    {selectedLora.trainer_id ? getTrainerById(selectedLora.trainer_id)?.displayName || '—' : 'Fast Flux Trainer'}
                  </p>
                </div>

                {/* Type */}
                <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Тип
                  </label>
                  <p className="font-inter font-medium text-base text-white leading-[1.5]">
                    {getLoraTypeById(selectedLora.type)?.label || '—'}
                  </p>
                </div>

                {/* Created */}
                <div className="rounded-[16px] p-4 flex flex-col gap-3 bg-[#171717]">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Создано
                  </label>
                  <p className="font-inter font-medium text-base text-white leading-[1.5]">
                    {new Date(selectedLora.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Usage example */}
              {selectedLora.status === 'completed' && (
                <div className="rounded-[16px] p-4 flex flex-col gap-2 bg-[#171717]">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Пример использования
                  </label>
                  <div className="p-3 rounded-[16px] bg-[#101010] flex items-center justify-between gap-3">
                    <code className="font-inter text-sm text-white leading-[1.428] flex-1 break-words">
                      {selectedLora.trigger_word ? `${selectedLora.trigger_word}, ` : ''}a beautiful product shot of [your subject], professional lighting, studio photography
                    </code>
                    <button
                      onClick={async () => {
                        const text = `${selectedLora.trigger_word ? `${selectedLora.trigger_word}, ` : ''}a beautiful product shot of [your subject], professional lighting, studio photography`;
                        await navigator.clipboard.writeText(text);
                      }}
                      className="p-2 rounded-[10px] border border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors shrink-0"
                    >
                      <Copy className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <p className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Используйте trigger word в начале промпта для активации стиля
                  </p>
                </div>
              )}

              {/* Images */}
              {selectedLora.training_images && selectedLora.training_images.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Изображения
                  </label>
                  <div className="flex flex-col gap-4">
                    {selectedLora.training_images.map((img, idx) => (
                      <div key={img.id || idx} className="rounded-[16px] p-4 bg-[#171717] flex items-start gap-4">
                        <div className="w-20 h-20 rounded-[16px] overflow-hidden relative bg-[#1A1A1A] shrink-0">
                          <Image
                            src={img.image_url}
                            alt={`Training image ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        {img.caption && (
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                              caption
                            </label>
                            <p className="font-inter font-medium text-xs text-white leading-[1.333]">
                              {img.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {selectedLora.error_message && (
                <div className="border border-[#2f2f2f] rounded-[16px] p-4">
                  <p className="text-[#959595] text-sm">{selectedLora.error_message}</p>
                </div>
              )}

              {/* Sync status button for training/failed */}
              {(selectedLora.status === 'training' || selectedLora.status === 'failed') && (
                <button
                  onClick={() => handleSyncStatus(selectedLora)}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Обновить статус
                </button>
              )}
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
