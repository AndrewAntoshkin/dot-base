'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { ModelSelector } from '@/components/model-selector';
import { AspectRatioSelector } from '@/components/aspect-ratio-selector';
import { Textarea } from '@/components/ui/textarea';
import { TooltipLabel } from '@/components/ui/tooltip-label';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { 
  ImageIcon, 
  Wand2,
  Ban,
  X,
  ImagePlus,
} from 'lucide-react';
import { ImageUploadArea } from '@/components/ui/image-upload-area';
import { OutputPanel } from '@/components/output-panel';

// Форматы для расширения
const ASPECT_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
];

// Форматы с размерами для расчёта expand
const ASPECT_RATIOS = [
  { value: '1:1', width: 1, height: 1 },
  { value: '3:4', width: 3, height: 4 },
  { value: '4:3', width: 4, height: 3 },
  { value: '9:16', width: 9, height: 16 },
  { value: '16:9', width: 16, height: 9 },
];

export function ExpandPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageUrlParam = searchParams.get('imageUrl');
  
  const { addGeneration, generations } = useGenerations();
  const { selectedWorkspaceId } = useUser();
  
  // Состояние
  const [selectedModel, setSelectedModel] = useState('bria-expand');
  const [image, setImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false); // Когда кнопка нажата и запрос отправляется

  // Handle imageUrl param from Quick Actions
  useEffect(() => {
    if (!imageUrlParam) return;
    
    // Load image from URL and get dimensions
    const img = new Image();
    img.onload = () => {
      console.log('[Expand] Quick Action image loaded:', img.naturalWidth, 'x', img.naturalHeight);
      setImage(imageUrlParam);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setCurrentGenerationId(null); // Clear any previous generation
    };
    img.onerror = () => {
      console.error('[Expand] Failed to load image from URL:', imageUrlParam);
    };
    img.src = imageUrlParam;
    
    // Clear URL param
    router.replace('/expand', { scroll: false });
  }, [imageUrlParam, router]);
  
  // Настройки для Outpainter
  const [steps, setSteps] = useState(50);
  const [guidance, setGuidance] = useState(30);
  
  // Expand state (проценты расширения 0-100)
  const [expand, setExpand] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialExpandRef = useRef({ top: 0, right: 0, bottom: 0, left: 0 });
  const expandRef = useRef({ top: 0, right: 0, bottom: 0, left: 0 });

  // Синхронизируем ref с state
  useEffect(() => {
    expandRef.current = expand;
  }, [expand]);

  // УДАЛЁН дублирующий useEffect - вся логика пресетов в handleRatioSelect

  // Загрузка изображения
  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      setCurrentGenerationId(null); // Clear previous generation
      
      // Получаем размеры изображения - expand будет рассчитан в useEffect
      const img = new Image();
      img.onload = () => {
        console.log('[Expand] Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag & Drop для Canvas
  const handleDropCanvas = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCanvas(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  // Выбор пресета формата
  const handleRatioSelect = useCallback((ratio: string) => {
    console.log('[Expand] handleRatioSelect called:', ratio, 'imageDimensions:', imageDimensions);
    setSelectedRatio(ratio);

    if (!imageDimensions) {
      console.log('[Expand] No imageDimensions, skipping expand calculation');
      return;
    }

    const ratioConfig = ASPECT_RATIOS.find(r => r.value === ratio);
    if (!ratioConfig) return;

    const imgRatio = imageDimensions.width / imageDimensions.height;
    const targetRatio = ratioConfig.width / ratioConfig.height;

    console.log('[Expand] Ratios:', { imgRatio, targetRatio, ratio });

    // Рассчитываем расширение для достижения целевого соотношения
    if (targetRatio > imgRatio) {
      // Нужно расширить по горизонтали
      const expandX = ((targetRatio / imgRatio) - 1) * 50; // 50% = max
      const newExpand = { top: 0, right: expandX, bottom: 0, left: expandX };
      console.log('[Expand] Expand horizontally:', newExpand);
      setExpand(newExpand);
    } else if (targetRatio < imgRatio) {
      // Нужно расширить по вертикали
      const expandY = ((imgRatio / targetRatio) - 1) * 50;
      const newExpand = { top: expandY, right: 0, bottom: expandY, left: 0 };
      console.log('[Expand] Expand vertically:', newExpand);
      setExpand(newExpand);
    } else {
      console.log('[Expand] Same ratio, no expand needed');
      setExpand({ top: 0, right: 0, bottom: 0, left: 0 });
    }
  }, [imageDimensions]);

  // Начало перетаскивания ручки
  const handleMouseDown = useCallback((handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragHandleRef.current = handle;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialExpandRef.current = { ...expandRef.current };
    setIsDraggingHandle(true);
    
    // При ручном изменении сбрасываем выбранный пресет
    setSelectedRatio(null);
  }, []);

  // Event listeners для перетаскивания
  useEffect(() => {
    if (!isDraggingHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragHandleRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const canvasSize = Math.min(rect.width, rect.height);

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Конвертируем пиксели в проценты
      const maxDrag = canvasSize * 0.25;
      const scaleX = (deltaX / maxDrag) * 100;
      const scaleY = (deltaY / maxDrag) * 100;

      const initial = initialExpandRef.current;
      const newExpand = { ...initial };

      switch (dragHandleRef.current) {
        // Угловые handles - меняют 2 стороны
        case 'top-left':
          newExpand.top = Math.max(0, Math.min(100, initial.top - scaleY));
          newExpand.left = Math.max(0, Math.min(100, initial.left - scaleX));
          break;
        case 'top-right':
          newExpand.top = Math.max(0, Math.min(100, initial.top - scaleY));
          newExpand.right = Math.max(0, Math.min(100, initial.right + scaleX));
          break;
        case 'bottom-left':
          newExpand.bottom = Math.max(0, Math.min(100, initial.bottom + scaleY));
          newExpand.left = Math.max(0, Math.min(100, initial.left - scaleX));
          break;
        case 'bottom-right':
          newExpand.bottom = Math.max(0, Math.min(100, initial.bottom + scaleY));
          newExpand.right = Math.max(0, Math.min(100, initial.right + scaleX));
          break;
        // Боковые handles - меняют только 1 сторону
        case 'top':
          newExpand.top = Math.max(0, Math.min(100, initial.top - scaleY));
          break;
        case 'bottom':
          newExpand.bottom = Math.max(0, Math.min(100, initial.bottom + scaleY));
          break;
        case 'left':
          newExpand.left = Math.max(0, Math.min(100, initial.left - scaleX));
          break;
        case 'right':
          newExpand.right = Math.max(0, Math.min(100, initial.right + scaleX));
          break;
      }

      // При ручном drag - сбрасываем выбранный пресет
      console.log('[Expand] Manual drag - setting expand:', newExpand, 'handle:', dragHandleRef.current);
      setSelectedRatio(null);
      setExpand(newExpand);
      expandRef.current = newExpand; // Сразу обновляем ref
    };

    const handleMouseUp = () => {
      dragHandleRef.current = null;
      setIsDraggingHandle(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHandle]);

  // Удаление изображения
  const handleRemoveImage = useCallback(() => {
    setImage(null);
    setImageDimensions(null);
    setCurrentGenerationId(null);
    setExpand({ top: 0, right: 0, bottom: 0, left: 0 });
    setSelectedRatio(null); // Не автоматически применять пресет
  }, []);

  // Сброс формы
  const handleReset = useCallback(() => {
    handleRemoveImage();
    setPrompt('');
    setNegativePrompt('');
  }, [handleRemoveImage]);

  // Compress image to fit within size limit (4MB to be safe for Vercel's 4.5MB limit)
  const compressImage = async (dataUrl: string, maxSizeBytes: number = 4 * 1024 * 1024): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        // Start with original size, reduce if needed
        let quality = 0.9;
        let scale = 1;
        
        const tryCompress = () => {
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              console.log(`[Expand] Compressed: ${canvas.width}x${canvas.height}, quality=${quality.toFixed(2)}, size=${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              
              if (blob.size <= maxSizeBytes) {
                resolve(blob);
              } else if (quality > 0.5) {
                // Try lower quality first
                quality -= 0.1;
                tryCompress();
              } else if (scale > 0.5) {
                // Then try smaller size
                quality = 0.85;
                scale -= 0.1;
                tryCompress();
              } else {
                // Give up and use what we have
                console.warn('[Expand] Could not compress below target size, using best effort');
                resolve(blob);
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = dataUrl;
    });
  };

  // Upload data URL to server (or return HTTP URL as-is)
  const uploadDataUrl = async (dataUrl: string): Promise<string> => {
    // If it's already an HTTP URL, return it directly
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return dataUrl;
    }
    
    // Compress image to fit Vercel's 4.5MB body limit
    console.log('[Expand] Compressing image before upload...');
    const blob = await compressImage(dataUrl);
    console.log(`[Expand] Final compressed size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    const formData = new FormData();
    formData.append('files', blob, 'image.jpg');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Ошибка загрузки изображения');
    }

    const data = await response.json();
    return data.urls[0];
  };

  // Генерация
  const handleGenerate = async () => {
    console.log('[Expand] handleGenerate called');
    console.log('[Expand] image:', image ? 'exists' : 'null');
    console.log('[Expand] imageDimensions:', imageDimensions);
    
    if (!image || !imageDimensions) {
      console.log('[Expand] Missing image or dimensions, aborting');
      return;
    }
    
    // Используем expand state напрямую (то что видит пользователь)
    const currentExpand = expand;
    
    // Проверка что хотя бы одно направление расширения > 0
    const hasAnyExpand = currentExpand.top > 0 || currentExpand.right > 0 || currentExpand.bottom > 0 || currentExpand.left > 0;
    if (!hasAnyExpand) {
      console.log('[Expand] No expansion set, aborting');
      alert('Растяните области расширения на canvas справа');
      return;
    }
    
    setIsCreating(true);
    
    try {
      
      console.log('[Expand] ============ GENERATION START ============');
      console.log('[Expand] Using expand:', currentExpand);
      console.log('[Expand] imageDimensions:', imageDimensions);
      
      // Загружаем изображение в Storage если это base64 (избегаем 413 Payload Too Large)
      let imageUrl = image;
      if (image.startsWith('data:')) {
        console.log('[Expand] Uploading image to storage...');
        imageUrl = await uploadDataUrl(image);
        console.log('[Expand] Image uploaded:', imageUrl);
      }
      
      let requestBody: Record<string, any>;
      
      // Дефолтный промпт если пользователь не ввёл
      const defaultPrompt = 'Continue the image seamlessly, extend the background naturally';
      const finalPrompt = prompt.trim() || defaultPrompt;
      
      if (selectedModel === 'outpainter') {
        // Outpainter использует пиксели напрямую
        // Параметры называются left, right, top, bottom (не extend_*)
        const extendLeft = Math.round(imageDimensions.width * (currentExpand.left / 100));
        const extendRight = Math.round(imageDimensions.width * (currentExpand.right / 100));
        const extendTop = Math.round(imageDimensions.height * (currentExpand.top / 100));
        const extendBottom = Math.round(imageDimensions.height * (currentExpand.bottom / 100));
        
        // Ограничение до 2000 пикселей на сторону
        const clamp = (v: number) => Math.min(v, 2000);
        
        console.log('[Expand] Outpainter params:', {
          left: clamp(extendLeft),
          right: clamp(extendRight),
          top: clamp(extendTop),
          bottom: clamp(extendBottom),
          steps,
          guidance,
          prompt: finalPrompt
        });
        
        requestBody = {
          action: 'expand',
          model_id: 'outpainter',
          prompt: finalPrompt,
          input_image_url: imageUrl,
          settings: {
            image: imageUrl,
            prompt: finalPrompt,
            left: clamp(extendLeft),
            right: clamp(extendRight),
            top: clamp(extendTop),
            bottom: clamp(extendBottom),
            steps,
            guidance,
          },
        };
      } else {
        // Bria Expand использует canvas_size
        const expandRatioX = (currentExpand.left + currentExpand.right) / 100;
        const expandRatioY = (currentExpand.top + currentExpand.bottom) / 100;
        
        let canvasWidth = Math.round(imageDimensions.width * (1 + expandRatioX));
        let canvasHeight = Math.round(imageDimensions.height * (1 + expandRatioY));
        
        let offsetX = Math.round(imageDimensions.width * (currentExpand.left / 100));
        let offsetY = Math.round(imageDimensions.height * (currentExpand.top / 100));
        
        let originalWidth = imageDimensions.width;
        let originalHeight = imageDimensions.height;
        
        console.log('[Expand] Bria params BEFORE scaling:', {
          expand: currentExpand,
          imageDimensions,
          expandRatioX,
          expandRatioY,
          canvasWidth,
          canvasHeight,
          offsetX,
          offsetY,
          originalWidth,
          originalHeight,
        });
        
        // Ограничение по максимальному размеру (25M пикселей для Bria)
        const maxArea = 25_000_000;
        if (canvasWidth * canvasHeight > maxArea) {
          const scale = Math.sqrt(maxArea / (canvasWidth * canvasHeight));
          canvasWidth = Math.round(canvasWidth * scale);
          canvasHeight = Math.round(canvasHeight * scale);
          offsetX = Math.round(offsetX * scale);
          offsetY = Math.round(offsetY * scale);
          originalWidth = Math.round(originalWidth * scale);
          originalHeight = Math.round(originalHeight * scale);
          console.log('[Expand] Scaled down by', scale);
        }
        
        // Bria ТРЕБУЕТ aspect_ratio, иначе использует 1:1 по умолчанию
        // Находим ближайший пресет для соотношения canvas
        const canvasRatio = canvasWidth / canvasHeight;
        
        const RATIOS: { name: string; ratio: number }[] = [
          { name: '1:1', ratio: 1 },
          { name: '2:3', ratio: 2/3 },
          { name: '3:2', ratio: 3/2 },
          { name: '3:4', ratio: 3/4 },
          { name: '4:3', ratio: 4/3 },
          { name: '4:5', ratio: 4/5 },
          { name: '5:4', ratio: 5/4 },
          { name: '9:16', ratio: 9/16 },
          { name: '16:9', ratio: 16/9 },
        ];
        
        // Находим ближайший пресет
        let closestPreset = RATIOS[0];
        let minDiff = Math.abs(canvasRatio - RATIOS[0].ratio);
        for (const preset of RATIOS) {
          const diff = Math.abs(canvasRatio - preset.ratio);
          if (diff < minDiff) {
            minDiff = diff;
            closestPreset = preset;
          }
        }
        
        console.log('[Expand] Bria aspect_ratio:', closestPreset.name, 'for canvas ratio:', canvasRatio.toFixed(3));
        
        requestBody = {
          action: 'expand',
          model_id: 'bria-expand',
          prompt: finalPrompt,
          input_image_url: imageUrl,
          settings: {
            image: imageUrl,
            prompt: finalPrompt,
            negative_prompt: negativePrompt || undefined,
            // Bria ТРЕБУЕТ aspect_ratio
            aspect_ratio: closestPreset.name,
          },
        };
        
        console.log('[Expand] Bria FINAL params:', {
          aspect_ratio: closestPreset.name,
          expand: currentExpand,
        });
      }
      
      // Добавляем workspace_id
      requestBody.workspace_id = selectedWorkspaceId;
      
      console.log('[Expand] Sending request:', JSON.stringify(requestBody).substring(0, 500) + '...');
      
      // Добавляем таймаут 60 секунд
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      try {
        const response = await fetch('/api/generations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log('[Expand] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Expand] API error:', errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Expand] Generation created:', result.id, 'status:', result.status);
        addGeneration(result);
        
        // Сохраняем ID - OutputPanel будет отслеживать прогресс
        setCurrentGenerationId(result.id);
        setIsCreating(false);
        console.log('[Expand] Set currentGenerationId:', result.id);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Запрос превысил время ожидания (60 сек)');
        }
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error('[Expand] Generation error:', error);
      alert(`Ошибка генерации: ${error.message || 'Неизвестная ошибка'}`);
      setCurrentGenerationId(null);
      setIsCreating(false);
    }
  };

  // Начать новую генерацию (сброс результата)
  const handleNewGeneration = useCallback(() => {
    setCurrentGenerationId(null);
  }, []);
  
  // Получаем статус текущей генерации из контекста
  const currentGeneration = currentGenerationId 
    ? generations.find(g => g.id === currentGenerationId) 
    : null;
  const isGenerating = currentGeneration?.status === 'pending' || currentGeneration?.status === 'processing';
  const isCompleted = currentGeneration?.status === 'completed' || currentGeneration?.status === 'failed';

  // Вычисляем визуальные позиции для канваса
  const hasExpand = expand.top > 0 || expand.right > 0 || expand.bottom > 0 || expand.left > 0;
  
  // Рассчитываем размер изображения с учётом его aspect ratio
  // Базовый размер - 50% от канваса по большей стороне
  const baseSize = 50;
  let imageWidthPercent = baseSize;
  let imageHeightPercent = baseSize;
  
  if (imageDimensions) {
    const imgAspect = imageDimensions.width / imageDimensions.height;
    if (imgAspect > 1) {
      // Горизонтальное изображение
      imageWidthPercent = baseSize;
      imageHeightPercent = baseSize / imgAspect;
    } else {
      // Вертикальное изображение
      imageHeightPercent = baseSize;
      imageWidthPercent = baseSize * imgAspect;
    }
  }
  
  // Общий размер (картинка + expand) должен помещаться в 86% канваса
  // (оставляем 7% с каждой стороны для ручек)
  const maxTotalSize = 86;
  
  // Рассчитываем расширение в процентах от размера изображения
  const expandTopPx = (expand.top / 100) * imageHeightPercent;
  const expandBottomPx = (expand.bottom / 100) * imageHeightPercent;
  const expandLeftPx = (expand.left / 100) * imageWidthPercent;
  const expandRightPx = (expand.right / 100) * imageWidthPercent;
  
  // Общий размер с расширением
  const totalWidth = imageWidthPercent + expandLeftPx + expandRightPx;
  const totalHeight = imageHeightPercent + expandTopPx + expandBottomPx;
  
  // Масштаб чтобы всё поместилось
  const scale = Math.min(maxTotalSize / totalWidth, maxTotalSize / totalHeight, 1);
  
  // Применяем масштаб
  const scaledImageWidth = imageWidthPercent * scale;
  const scaledImageHeight = imageHeightPercent * scale;
  const scaledExpandTop = expandTopPx * scale;
  const scaledExpandBottom = expandBottomPx * scale;
  const scaledExpandLeft = expandLeftPx * scale;
  const scaledExpandRight = expandRightPx * scale;
  
  // Позиции handles (на границе расширенной области)
  // Минимальный отступ от края канваса (в процентах) чтобы ручки были видны
  const handleMargin = 5;
  
  // Рассчитываем позиции и ограничиваем их границами канваса
  const handleTop = Math.max(handleMargin, 50 - scaledImageHeight/2 - scaledExpandTop);
  const handleBottom = Math.min(100 - handleMargin, 50 + scaledImageHeight/2 + scaledExpandBottom);
  const handleLeft = Math.max(handleMargin, 50 - scaledImageWidth/2 - scaledExpandLeft);
  const handleRight = Math.min(100 - handleMargin, 50 + scaledImageWidth/2 + scaledExpandRight);

  return (
    <div className="h-screen flex flex-col bg-[#101010] overflow-hidden">
      <Header />
      
      {/* Desktop Layout - Independent scroll for each column */}
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
              {/* Модель */}
              <div className="animate-fade-in-up animate-delay-100">
                <ModelSelector
                  action="expand"
                  value={selectedModel}
                  onChange={setSelectedModel}
                />
              </div>
              
              {/* Изображение */}
              <div className="animate-fade-in-up animate-delay-200 border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Изображение" icon={ImageIcon} />
                <ImageUploadArea 
                  onFileSelect={handleImageUpload}
                  disabled={!!image}
                />
              </div>
              
              {/* Prompt */}
              <div className="animate-fade-in-up animate-delay-300 border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Prompt" icon={Wand2} />
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите результат на английском... (horse head, blue sky и тд.)"
                  className="min-h-[80px] bg-[#101010] border-0"
                />
              </div>
              
              {/* Negative Prompt */}
              <div className="animate-fade-in-up animate-delay-400 border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Negative Prompt" icon={Ban} />
                <Textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Что исключить из генерации..."
                  className="min-h-[60px] bg-[#101010] border-0"
                />
              </div>
              
              {/* Настройки Outpainter (только если выбран) */}
              {selectedModel === 'outpainter' && (
                <div className="animate-fade-in-up animate-delay-500 border border-[#252525] rounded-2xl p-4 flex flex-col gap-4">
                  {/* Steps */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15px]">
                        Steps (качество)
                      </span>
                      <span className="font-inter text-[12px] text-white">{steps}</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={50}
                      step={1}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  {/* Guidance */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15px]">
                        Guidance (сила промпта)
                      </span>
                      <span className="font-inter text-[12px] text-white">{guidance}</span>
                    </div>
                    <input
                      type="range"
                      min={1.5}
                      max={100}
                      step={0.5}
                      value={guidance}
                      onChange={(e) => setGuidance(Number(e.target.value))}
                      className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>
              )}
              
              {/* Формат (Aspect Ratio) */}
              <div className="animate-fade-in-up animate-delay-500 border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Формат (Aspect Ratio)" />
                <AspectRatioSelector
                  value={selectedRatio || '1:1'}
                  options={ASPECT_RATIO_OPTIONS}
                  onChange={handleRatioSelect}
                  description="Соотношение сторон. Растягивайте на canvas справа для ручного контроля."
                  defaultLabel="1:1"
                  defaultValue="1:1"
                />
              </div>
            </div>
          </div>

          {/* Fixed buttons at bottom (outside scroll area) */}
          <div className="animate-fade-in-up animate-delay-500 shrink-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] pr-4">
            <div className="flex gap-3">
              {isCompleted ? (
                <button
                  type="button"
                  onClick={handleNewGeneration}
                  className="flex-1 h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors"
                >
                  Новая генерация
                </button>
              ) : isGenerating ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-10 px-4 rounded-xl bg-white/50 font-inter font-medium text-sm text-black tracking-[-0.084px] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Генерация...
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!image || isCreating}
                    className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreating ? 'Создание...' : 'Создать'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT (independent scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pl-0 pr-8 flex flex-col">
          <div className="animate-fade-in-up flex items-center justify-between mb-6">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
          </div>

          {/* Show OutputPanel only when generation is completed, show canvas with shimmer during generation */}
          {isCompleted && currentGenerationId ? (
            <div className="animate-fade-in-up animate-delay-200 flex-1">
              <OutputPanel generationId={currentGenerationId} />
            </div>
          ) : (
          /* Canvas Container - fills remaining space with 32px bottom padding */
          <div className="animate-fade-in-up animate-delay-200 flex-1 pb-8 flex items-start justify-start">
            {/* Canvas Area - square, max size that fits, with padding for handles */}
            <div 
              ref={canvasRef}
              style={{ 
                width: 'min(100%, calc(100vh - 200px))', 
                aspectRatio: '1/1',
                backgroundImage: image ? 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)' : 'none',
                backgroundSize: '20px 20px',
              }}
              className={`relative rounded-2xl border transition-colors bg-[#101010] overflow-visible ${
                isDraggingCanvas ? 'border-white/50' : 'border-[#2f2f2f]'
              }`}
            onDrop={handleDropCanvas}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingCanvas(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingCanvas(false); }}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {!image ? (
              /* Empty state */
              <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                <ImagePlus className="w-12 h-12 text-[#656565] mb-4" strokeWidth={1.5} />
                <p className="font-inter text-sm text-white text-center mb-2">
                  Перетащите или выберите на устройстве
                </p>
                <p className="font-inter text-xs text-[#959595] text-center">
                  PNG, JPG, WEBP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>
            ) : (
              /* Image loaded - interactive canvas */
              <>
                {/* Blue guide lines at expansion boundaries */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Vertical lines at left/right handles - extend full height */}
                  <div className="absolute w-px bg-[#4D7CFC] h-full" style={{ left: `${handleLeft}%` }} />
                  <div className="absolute w-px bg-[#4D7CFC] h-full" style={{ left: `${handleRight}%` }} />
                  
                  {/* Horizontal lines at top/bottom handles - extend full width */}
                  <div className="absolute h-px bg-[#4D7CFC] w-full" style={{ top: `${handleTop}%` }} />
                  <div className="absolute h-px bg-[#4D7CFC] w-full" style={{ top: `${handleBottom}%` }} />
                </div>
                
                {/* Expanded area background - single dark rectangle that shows the total generation zone */}
                {hasExpand && (
                  <div 
                    className={`absolute pointer-events-none z-0 overflow-hidden ${
                      (isCreating || isGenerating) ? 'bg-[#1a1a1a]' : 'bg-[#212121]'
                    }`}
                    style={{
                      top: `${handleTop}%`,
                      left: `${handleLeft}%`,
                      right: `${100 - handleRight}%`,
                      bottom: `${100 - handleBottom}%`,
                    }}
                  >
                    {/* Shimmer effect during generation */}
                    {(isCreating || isGenerating) && (
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer-move 2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                )}
                
                {/* Original image - в центре, z-10 чтобы быть ниже handles (z-30) */}
                <div 
                  className="absolute flex items-center justify-center z-10 pointer-events-none"
                  style={{
                    top: `${50 - scaledImageHeight/2}%`,
                    left: `${50 - scaledImageWidth/2}%`,
                    width: `${scaledImageWidth}%`,
                    height: `${scaledImageHeight}%`,
                  }}
                >
                  <img
                    src={image}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Corner handles only - square with blue border like Figma */}
                <>
                    {/* Top-Left corner */}
                    <div
                      onMouseDown={(e) => handleMouseDown('top-left', e)}
                      className="absolute w-3 h-3 bg-white border border-[#4D7CFC] rounded-sm cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                      style={{ top: `${handleTop}%`, left: `${handleLeft}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Top-Right corner */}
                    <div
                      onMouseDown={(e) => handleMouseDown('top-right', e)}
                      className="absolute w-3 h-3 bg-white border border-[#4D7CFC] rounded-sm cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                      style={{ top: `${handleTop}%`, left: `${handleRight}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Bottom-Left corner */}
                    <div
                      onMouseDown={(e) => handleMouseDown('bottom-left', e)}
                      className="absolute w-3 h-3 bg-white border border-[#4D7CFC] rounded-sm cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                      style={{ top: `${handleBottom}%`, left: `${handleLeft}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Bottom-Right corner */}
                    <div
                      onMouseDown={(e) => handleMouseDown('bottom-right', e)}
                      className="absolute w-3 h-3 bg-white border border-[#4D7CFC] rounded-sm cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                      style={{ top: `${handleBottom}%`, left: `${handleRight}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </>
                
                {/* Remove image button */}
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center z-40 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </>
            )}
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4">
        <p className="text-white text-center py-20">Используйте десктоп для работы с Expand</p>
      </main>
    </div>
  );
}
