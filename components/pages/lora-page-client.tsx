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
  Upload, Plus, Trash2, Loader2, ExternalLink, Sparkles, Clock, 
  CheckCircle, XCircle, RefreshCw, ChevronDown, X, Eye, Lock, Copy, Wand2
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
  file: File | null; // null for existing images
  url: string;
  uploading: boolean;
  uploaded: string | null; // Storage URL after upload
  caption: string;
  captionLoading: boolean;
  isExisting?: boolean; // true for images from previous training
  existingId?: string; // ID from lora_training_images table
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
  const [menuOpen, setMenuOpen] = useState(false);
  const loraType = getLoraTypeById(lora.type);
  
  // Get training images for preview (API returns max 5)
  const previewImages = lora.training_images?.slice(0, 4) || [];
  const totalImages = lora.training_images_count || lora.training_images?.length || 0;
  const remainingCount = totalImages - 4;
  
  // Format date
  const createdDate = lora.created_at 
    ? new Date(lora.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  
  return (
    <div 
      className={`relative border rounded-[16px] p-4 flex flex-col gap-4 h-[206px] transition-all cursor-pointer ${
        isSelected ? 'border-white' : 'border-[#252525] hover:border-[#404040]'
      }`}
      onClick={() => onView?.(lora)}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        {/* Left side - name and meta */}
        <div className="flex flex-col gap-3 flex-1">
          <h3 className="font-inter font-semibold text-[16px] leading-[24px] text-white uppercase tracking-[-0.01em]">
            {lora.name}
          </h3>
          
          {/* Meta info */}
          <div className="flex flex-col gap-2">
            {lora.trigger_word && (
              <div className="flex gap-3">
                <span className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.015em]">trigger word</span>
                <span className="font-inter font-medium text-[10px] leading-[14px] text-white uppercase tracking-[0.015em]">{lora.trigger_word}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.015em]">Тип</span>
              <span className="font-inter font-medium text-[10px] leading-[14px] text-white uppercase tracking-[0.015em]">{loraType?.label || lora.type}</span>
            </div>
            {createdDate && (
              <div className="flex gap-3">
                <span className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.015em]">Создано</span>
                <span className="font-inter font-medium text-[10px] leading-[14px] text-white uppercase tracking-[0.015em]">{createdDate}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Menu button */}
        {!isPreset && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-lg bg-[#212121] text-white hover:bg-[#2a2a2a] transition-colors"
            >
              <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10.5" cy="4.5" r="1.5" fill="currentColor"/>
                <circle cx="10.5" cy="10.5" r="1.5" fill="currentColor"/>
                <circle cx="10.5" cy="16.5" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            
            {/* Dropdown menu */}
            {menuOpen && (
              <div 
                className="absolute top-full right-0 mt-2 w-64 bg-[#1A1A1A] rounded-[16px] p-5 flex flex-col gap-2 z-50"
                style={{ boxShadow: '0px 12px 24px 0px rgba(0, 0, 0, 0.8)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onView?.(lora);
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-[12px] border border-[#2F2F2F] text-left font-inter font-normal text-[14px] leading-[18px] text-white hover:bg-[#252525] transition-colors"
                >
                  Редактировать
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(lora);
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 rounded-[12px] border border-[#2F2F2F] text-left font-inter font-normal text-[14px] leading-[18px] text-white hover:bg-[#252525] transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Preview images - last image on top */}
      <div className="flex items-center">
        {previewImages.map((img, idx) => (
          <div
            key={img.id}
            className="w-16 h-16 rounded-[16px] border-2 border-[#101010] overflow-hidden flex-shrink-0"
            style={{ marginLeft: idx > 0 ? '-24px' : '0', zIndex: idx + 1 }}
          >
            <img
              src={img.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="w-16 h-16 rounded-[16px] border-2 border-[#101010] bg-[#212121] flex items-center justify-center flex-shrink-0"
            style={{ marginLeft: '-24px', zIndex: previewImages.length + 1 }}
          >
            <span className="font-inter font-medium text-[16px] leading-[24px] text-white tracking-[-0.01em]">
              +{remainingCount}
            </span>
          </div>
        )}
        {previewImages.length === 0 && (
          <div className="w-16 h-16 rounded-[16px] border-2 border-[#101010] bg-[#212121] flex items-center justify-center">
            <span className="text-[#959595] text-xs">Нет фото</span>
          </div>
        )}
      </div>
      
      {/* Click outside to close menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(false);
          }}
        />
      )}
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
  
  // Inline editing state
  const [isSavingName, setIsSavingName] = useState(false);
  const nameRef = useRef<HTMLHeadingElement>(null);
  
  // Retrain mode - show settings panel with LoRA data
  const [isRetrainMode, setIsRetrainMode] = useState(false);

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
      // Only revoke URL for new images (blob URLs), not existing ones (storage URLs)
      if (!updated[index].isExisting && updated[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].url);
      }
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
      // Already uploaded (existing or previously uploaded)
      if (img.uploaded) return img.uploaded;
      
      // No file to upload (shouldn't happen)
      if (!img.file) return null;
      
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
      // Upload all images first (skip existing ones that are already uploaded)
      const uploadedImages: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        // If already uploaded (existing or previously uploaded new image)
        if (img.uploaded) {
          uploadedImages.push(img.uploaded);
          continue;
        }

        // Skip if no file (shouldn't happen, but safety check)
        if (!img.file) {
          console.warn(`Image ${i} has no file and no uploaded URL, skipping`);
          continue;
        }

        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: true };
          return updated;
        });

        const compressed = await compressImage(img.file);
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
    if (!confirm(`Удалить LoRA модель "${lora.name}"? Это действие нельзя отменить.`)) return;
    
    try {
      const res = await fetch(`/api/loras/${lora.id}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при удалении');
      }
      
      // Success - reload list and clear selection if needed
      loadMyLoras();
      if (selectedLora?.id === lora.id) {
        setSelectedLora(null);
      }
      
      console.log(`LoRA "${lora.name}" успешно удалена`);
    } catch (err) {
      console.error('Failed to delete LoRA:', err);
      alert(err instanceof Error ? err.message : 'Не удалось удалить LoRA модель');
    }
  };

  // Save name on blur (contentEditable)
  const handleNameBlur = async () => {
    if (!selectedLora || !nameRef.current) return;
    
    const newName = nameRef.current.textContent?.trim() || '';
    if (!newName || newName === selectedLora.name) {
      // Restore original if empty or unchanged
      if (nameRef.current) {
        nameRef.current.textContent = selectedLora.name;
      }
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/loras/${selectedLora.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка при сохранении');
      }

      // Update local state
      const updatedLora = { ...selectedLora, name: newName };
      setSelectedLora(updatedLora);
      setMyLoras(prev => prev.map(l => l.id === selectedLora.id ? updatedLora : l));
    } catch (err) {
      console.error('Failed to save name:', err);
      // Restore original on error
      if (nameRef.current) {
        nameRef.current.textContent = selectedLora.name;
      }
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle key press in name (contentEditable)
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (nameRef.current && selectedLora) {
        nameRef.current.textContent = selectedLora.name;
        nameRef.current.blur();
      }
    }
  };

  // Start retrain mode - populate form with LoRA data including existing images
  const startRetrainMode = () => {
    if (!selectedLora) return;
    
    // Populate form with LoRA data
    setName(selectedLora.name);
    setDescription(selectedLora.description || '');
    setTriggerWord(selectedLora.trigger_word);
    setType(selectedLora.type);
    setTrainerId(selectedLora.trainer_id || 'fast-flux-trainer');
    setError(null);
    
    // Load existing training images
    if (selectedLora.training_images && selectedLora.training_images.length > 0) {
      const existingImages: TrainingImageFile[] = selectedLora.training_images.map((img) => ({
        file: null, // No file for existing images
        url: img.image_url, // Use storage URL for preview
        uploading: false,
        uploaded: img.image_url, // Already uploaded
        caption: img.caption || '',
        captionLoading: false,
        isExisting: true,
        existingId: img.id,
      }));
      setImages(existingImages);
    } else {
      setImages([]);
    }
    
    // Switch to create tab and enable retrain mode
    setActiveTab('create');
    setIsRetrainMode(true);
  };

  // Cancel retrain mode
  const cancelRetrainMode = () => {
    setIsRetrainMode(false);
    setActiveTab('my');
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
    description: t.shortDescription,
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
              <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
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
                    className={`flex-1 h-[56px] px-6 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-[#171717] ${
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
                  <div className="animate-fade-in-up animate-delay-200 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Космический кот"
                    className="w-full h-12 px-3 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
                
                  {/* Description */}
                  <div className="animate-fade-in-up animate-delay-300 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Описание
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Пушистый кот в скафандре на фоне звёзд"
                    rows={2}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white resize-none"
                  />
                </div>
                
                  {/* Trigger Word */}
                  <div className="animate-fade-in-up animate-delay-400 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Trigger Word *
                  </label>
                  <input
                    type="text"
                    value={triggerWord}
                    onChange={(e) => setTriggerWord(e.target.value.toUpperCase().replace(/[^A-Z0-9_\s]/g, ''))}
                    placeholder="SPACECAT"
                    className="w-full h-12 px-3 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] font-mono placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white uppercase"
                  />
                  <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                    Уникальное слово для активации стиля (A-Z, 0-9, _)
                  </p>
                </div>
                
                  {/* Type Selector */}
                  <div className="animate-fade-in-up animate-delay-500 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Тип LoRA
                  </label>
                  <div className="flex flex-col gap-2">
                    {/* Row 1 */}
                    <div className="flex gap-2">
                      {LORA_TYPES.slice(0, 2).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setType(t.id)}
                          title={t.description}
                          className={`flex-1 h-[56px] px-6 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-[#171717] ${
                            type === t.id
                              ? 'border border-white'
                              : 'border border-transparent hover:border-[#404040]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {/* Row 2 */}
                    {LORA_TYPES.length > 2 && (
                      <div className="flex gap-2">
                        {LORA_TYPES.slice(2, 4).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setType(t.id)}
                            title={t.description}
                            className={`flex-1 h-[56px] px-6 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-[#171717] ${
                              type === t.id
                                ? 'border border-white'
                                : 'border border-transparent hover:border-[#404040]'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                    {loraType?.description}
                    {type === 'style' && ' Для художественных стилей, НЕ для объектов'}
                  </p>
                </div>
                
                  {/* Trainer Selector */}
                  <div className="animate-fade-in-up animate-delay-600 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Модель
                  </label>
                  <MobileSelect
                    value={trainerId}
                    onValueChange={setTrainerId}
                    options={trainerOptions}
                    title="Модель"
                  />
                  {trainer && (
                    <div className="flex flex-col gap-2 py-2">
                      <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                        {trainer.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {trainer.features.map((f, i) => (
                          <span key={i} className="px-2 py-1.5 rounded-lg bg-[#171717] font-inter font-medium text-[10px] text-white uppercase tracking-[0.15px]">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                        ~{trainer.trainingTime} • {trainer.minImages}-{trainer.maxImages} изображений
                      </p>
                    </div>
                  )}
                </div>
                
                  {/* Image Upload */}
                  <div className="animate-fade-in-up animate-delay-700 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
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
                        <div key={idx} className={"flex gap-2 p-2 rounded-[8px] bg-[#1A1A1A]"}>
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
                              placeholder="Добавьте детали для обучения..."
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
                  <div className="animate-fade-in-up animate-delay-800 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      Рекомендации
                    </label>
                    <ul className="list-disc list-inside space-y-1 font-inter text-[14px] leading-[20px] text-[#959595]">
                      <li>25-30 изображений для лучшего результата</li>
                      <li>Разные ракурсы, освещение, фоны</li>
                      <li>Разрешение 1024x1024 оптимально</li>
                      <li>Описания улучшают качество обучения</li>
                    </ul>
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
            <div className="shrink-0 bg-[#171717] pt-4 pb-8 border-t border-[#1f1f1f] pr-4">
              <div className="flex gap-3">
                {isRetrainMode ? (
                  <button
                    type="button"
                    onClick={cancelRetrainMode}
                    disabled={isSubmitting}
                    className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                ) : (
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
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || images.length < 5 || !name.trim() || !triggerWord.trim()}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
                >
                  {isSubmitting ? 'Создание...' : isRetrainMode ? 'Переобучить' : 'Создать LoRA'}
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
            {selectedLora && activeTab === 'my' ? (
              <div className="flex flex-col gap-6">
                {/* Header with name and buttons */}
                <div className="flex items-start gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      название
                    </label>
                    <h2 
                      ref={nameRef}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={handleNameBlur}
                      onKeyDown={handleNameKeyDown}
                      className={`font-inter font-semibold text-2xl text-white leading-[1.333] outline-none cursor-text border-b-2 border-transparent focus:border-white transition-colors ${isSavingName ? 'opacity-50' : ''}`}
                      style={{ caretColor: 'white' }}
                    >
                      {selectedLora.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startRetrainMode}
                      className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white leading-[1.428] tracking-[-0.006em] hover:bg-[#1f1f1f] transition-colors"
                    >
                      Переобучить
                    </button>
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
                    <div className="p-3 rounded-[16px] bg-[#171717] flex items-center justify-between gap-3">
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

                {/* Images - Grid 2 columns per Figma design */}
                {selectedLora.training_images && selectedLora.training_images.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                      Изображения
                    </label>
                    <div className="flex flex-col gap-4">
                      {/* Group images in pairs (2 per row) */}
                      {Array.from({ length: Math.ceil(selectedLora.training_images.length / 2) }, (_, rowIdx) => {
                        const startIdx = rowIdx * 2;
                        const pair = selectedLora.training_images!.slice(startIdx, startIdx + 2);
                        return (
                          <div key={rowIdx} className="flex gap-4">
                            {pair.map((img, idx) => (
                              <div key={img.id || startIdx + idx} className="flex-1 rounded-[16px] p-4 bg-[#171717] flex gap-4">
                                <div className="w-20 h-20 rounded-[16px] overflow-hidden relative shrink-0">
                                  <Image
                                    src={img.image_url}
                                    alt={`Training image ${startIdx + idx + 1}`}
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
                                    <p className="font-inter font-medium text-xs text-white leading-[1.333] line-clamp-3">
                                      {img.caption}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                            {/* Empty placeholder for odd number of images */}
                            {pair.length === 1 && <div className="flex-1" />}
                          </div>
                        );
                      })}
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
                      <h3 className="font-inter font-semibold text-xl text-white">Настройка</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Укажите название и триггер</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col py-2">
                    <img src="/numbers/2.png" alt="2" width={55} height={64} className="mb-0" />
                    <div className="flex flex-col gap-2 py-6">
                      <h3 className="font-inter font-semibold text-xl text-white">Изображения</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Загрузите 25-30 фото объекта</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col py-2">
                    <img src="/numbers/3.png" alt="3" width={53} height={64} className="mb-0" />
                    <div className="flex flex-col gap-2 py-6">
                      <h3 className="font-inter font-semibold text-xl text-white">Обучение</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Запустите и дождитесь результата</p>
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
              <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
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
                    className={`flex-1 h-[56px] px-6 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-[#171717] ${
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
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Космический кот"
                    className="w-full h-12 px-3 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
                
                {/* Description */}
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Описание
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Пушистый кот в скафандре на фоне звёзд"
                    rows={2}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white resize-none"
                  />
                </div>
                
                {/* Trigger Word */}
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Trigger Word *
                  </label>
                  <input
                    type="text"
                    value={triggerWord}
                    onChange={(e) => setTriggerWord(e.target.value.toUpperCase().replace(/[^A-Z0-9_\s]/g, ''))}
                    placeholder="SPACECAT"
                    className="w-full h-12 px-3 rounded-[8px] bg-[#171717] text-white font-inter font-normal text-sm leading-[1.43] font-mono placeholder:text-[#959595] focus:outline-none focus:ring-1 focus:ring-white uppercase"
                  />
                  <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                    Уникальное слово для активации стиля (A-Z, 0-9, _)
                  </p>
                </div>
                
                {/* Type Selector */}
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Тип LoRA
                  </label>
                  <div className="flex flex-col gap-2">
                    {/* Row 1 */}
                    <div className="flex gap-2">
                      {LORA_TYPES.slice(0, 2).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setType(t.id)}
                          title={t.description}
                          className={`flex-1 h-[56px] px-6 py-2 rounded-[16px] font-inter text-[13px] leading-[18px] text-center text-white transition-all bg-[#171717] ${
                            type === t.id
                              ? 'border border-white'
                              : 'border border-transparent hover:border-[#404040]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {/* Row 2 */}
                    {LORA_TYPES.length > 2 && (
                      <div className="flex gap-2">
                        {LORA_TYPES.slice(2, 4).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setType(t.id)}
                            title={t.description}
                            className={`flex-1 h-14 px-6 rounded-[16px] font-inter font-normal text-[13px] leading-[1.38] text-center transition-colors ${
                              type === t.id
                                ? 'bg-[#171717] border border-white text-white'
                                : 'bg-[#171717] text-white hover:bg-[#1a1a1a]'
                          }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                    {loraType?.description}
                    {type === 'style' && ' Для художественных стилей, НЕ для объектов'}
                  </p>
                </div>
                
                {/* Trainer Selector */}
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Модель
                  </label>
                  <MobileSelect
                    value={trainerId}
                    onValueChange={setTrainerId}
                    options={trainerOptions}
                    title="Модель"
                  />
                  {trainer && (
                    <div className="flex flex-col gap-2 py-2">
                      <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                        {trainer.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {trainer.features.map((f, i) => (
                          <span key={i} className="px-2 py-1.5 rounded-lg bg-[#171717] font-inter font-medium text-[10px] text-white uppercase tracking-[0.15px]">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="font-inter font-normal text-sm text-[#959595] leading-[1.43]">
                        ~{trainer.trainingTime} • {trainer.minImages}-{trainer.maxImages} изображений
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Image Upload */}
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
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
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Images grid with captions - Mobile */}
                  {images.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {images.map((img, idx) => (
                        <div key={idx} className={"flex gap-2 p-2 rounded-[8px] bg-[#1A1A1A]"}>
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
                              placeholder="Добавьте детали для обучения..."
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
                <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Рекомендации
                  </label>
                  <ul className="list-disc list-inside space-y-1 font-inter text-[14px] leading-[20px] text-[#959595]">
                    <li>25-30 изображений для лучшего результата</li>
                    <li>Разные ракурсы, освещение, фоны</li>
                    <li>Разрешение 1024x1024 оптимально</li>
                    <li>Описания улучшают качество обучения</li>
                  </ul>
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
            <div className="fixed bottom-0 left-0 right-0 bg-[#171717] p-4 border-t border-[#1f1f1f] z-10">
              <div className="flex gap-3">
                {isRetrainMode ? (
                  <button
                    type="button"
                    onClick={cancelRetrainMode}
                    disabled={isSubmitting}
                    className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                ) : (
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
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || images.length < 5 || !name.trim() || !triggerWord.trim()}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
                >
                  {isSubmitting ? 'Создание...' : isRetrainMode ? 'Переобучить' : 'Создать LoRA'}
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
              {/* Header with name and buttons */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    название
                  </label>
                  <h2 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleNameBlur}
                    onKeyDown={handleNameKeyDown}
                    className={`font-inter font-semibold text-2xl text-white leading-[1.333] outline-none cursor-text border-b-2 border-transparent focus:border-white transition-colors ${isSavingName ? 'opacity-50' : ''}`}
                    style={{ caretColor: 'white' }}
                  >
                    {selectedLora.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startRetrainMode}
                    className="flex-1 h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white leading-[1.428] tracking-[-0.006em] hover:bg-[#1f1f1f] transition-colors"
                  >
                    Переобучить
                  </button>
                  <button
                    onClick={() => handleUseLora(selectedLora)}
                    disabled={selectedLora.status !== 'completed'}
                    className="flex-1 h-10 px-4 rounded-xl bg-white text-black font-inter font-medium text-sm leading-[1.428] tracking-[-0.006em] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="p-3 rounded-[16px] bg-[#171717] flex items-center justify-between gap-3">
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

              {/* Images - Mobile: 2 columns grid */}
              {selectedLora.training_images && selectedLora.training_images.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    Изображения
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLora.training_images.map((img, idx) => (
                      <div key={img.id || idx} className="rounded-[16px] p-4 bg-[#171717] flex flex-col gap-4">
                        <div className="w-full aspect-square rounded-[16px] overflow-hidden relative">
                          <Image
                            src={img.image_url}
                            alt={`Training image ${idx + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
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
