'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from '@/components/header';
import { ModelSelector } from '@/components/model-selector';
import { AspectRatioSelector } from '@/components/aspect-ratio-selector';
import { Textarea } from '@/components/ui/textarea';
import { TooltipLabel } from '@/components/ui/tooltip-label';
import { useGenerations } from '@/contexts/generations-context';
import { 
  ImageIcon, 
  RefreshCw, 
  Download,
  Wand2,
  Ban,
  X
} from 'lucide-react';

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
  const { addGeneration, generations, refreshGenerations } = useGenerations();
  
  // Состояние
  const [selectedModel, setSelectedModel] = useState('bria-expand');
  const [image, setImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
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

  // Отслеживание текущей генерации
  useEffect(() => {
    console.log('[Expand] useEffect triggered, currentGenerationId:', currentGenerationId);
    
    if (!currentGenerationId) {
      console.log('[Expand] No currentGenerationId, skipping polling');
      return;
    }

    let isMounted = true;
    console.log('[Expand] Starting polling for:', currentGenerationId);

    const checkGeneration = async () => {
      if (!isMounted) {
        console.log('[Expand] Component unmounted, skipping check');
        return;
      }
      
      console.log('[Expand] Checking generation:', currentGenerationId);
      
      try {
        const response = await fetch(`/api/generations/${currentGenerationId}`);
        if (response.ok && isMounted) {
          const generation = await response.json();
          
          // API возвращает output_urls (массив) или output_url
          const outputUrl = generation.output_url || (generation.output_urls && generation.output_urls[0]);
          console.log('[Expand] Generation status:', generation.status, 'outputUrl:', outputUrl ? 'yes' : 'no');
          
          // Проверяем оба варианта статуса (succeeded или completed)
          if ((generation.status === 'succeeded' || generation.status === 'completed') && outputUrl) {
            console.log('[Expand] ✅ Generation completed! Setting output image:', outputUrl);
            setOutputImage(outputUrl);
            setIsGenerating(false);
            setCurrentGenerationId(null);
            refreshGenerations(); // Обновить контекст
          } else if (generation.status === 'failed' || generation.status === 'cancelled') {
            console.log('[Expand] ❌ Generation failed or cancelled');
            setIsGenerating(false);
            setCurrentGenerationId(null);
            console.error('Generation failed:', generation.error);
          } else {
            console.log('[Expand] ⏳ Still processing...');
          }
        } else {
          console.log('[Expand] Response not ok or unmounted');
        }
      } catch (error) {
        console.error('[Expand] Failed to check generation status:', error);
      }
    };

    // Polling каждые 2 секунды
    const interval = setInterval(checkGeneration, 2000);
    checkGeneration(); // Сразу проверяем

    return () => {
      console.log('[Expand] Cleanup polling for:', currentGenerationId);
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentGenerationId, refreshGenerations]);

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
      setOutputImage(null);
      
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
    setOutputImage(null);
    setExpand({ top: 0, right: 0, bottom: 0, left: 0 });
    setSelectedRatio(null); // Не автоматически применять пресет
  }, []);

  // Сброс формы
  const handleReset = useCallback(() => {
    handleRemoveImage();
    setPrompt('');
    setNegativePrompt('');
  }, [handleRemoveImage]);

  // Генерация
  const handleGenerate = async () => {
    if (!image || !imageDimensions) return;
    
    setIsGenerating(true);
    
    try {
      // Используем expand state напрямую (то что видит пользователь)
      const currentExpand = expand;
      
      console.log('[Expand] ============ GENERATION START ============');
      console.log('[Expand] Using expand:', currentExpand);
      console.log('[Expand] imageDimensions:', imageDimensions);
      
      let requestBody: Record<string, any>;
      
      // Дефолтный промпт если пользователь не ввёл
      const defaultPrompt = 'Continue the image seamlessly, extend the background naturally';
      const finalPrompt = prompt.trim() || defaultPrompt;
      
      if (selectedModel === 'outpainter') {
        // Outpainter использует пиксели напрямую
        const extendLeft = Math.round(imageDimensions.width * (currentExpand.left / 100));
        const extendRight = Math.round(imageDimensions.width * (currentExpand.right / 100));
        const extendTop = Math.round(imageDimensions.height * (currentExpand.top / 100));
        const extendBottom = Math.round(imageDimensions.height * (currentExpand.bottom / 100));
        
        // Ограничение до 2000 пикселей на сторону
        const clamp = (v: number) => Math.min(v, 2000);
        
        console.log('[Expand] Outpainter params:', {
          extend_left: clamp(extendLeft),
          extend_right: clamp(extendRight),
          extend_top: clamp(extendTop),
          extend_bottom: clamp(extendBottom),
          steps,
          guidance,
          prompt: finalPrompt
        });
        
        requestBody = {
          action: 'expand',
          model_id: 'outpainter',
          prompt: finalPrompt,
          input_image_url: image,
          settings: {
            image: image,
            prompt: finalPrompt,
            extend_left: clamp(extendLeft),
            extend_right: clamp(extendRight),
            extend_top: clamp(extendTop),
            extend_bottom: clamp(extendBottom),
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
          input_image_url: image,
          settings: {
            image: image,
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
      
      console.log('[Expand] Sending request:', requestBody);
      
      const response = await fetch('/api/generations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create generation');
      }
      
      const result = await response.json();
      console.log('[Expand] Generation created:', result.id, 'status:', result.status);
      addGeneration(result);
      
      // Сохраняем ID для отслеживания
      setCurrentGenerationId(result.id);
      console.log('[Expand] Set currentGenerationId:', result.id);
      
      // Если результат уже есть (sync generation) - показываем сразу
      if (result.output_url) {
        console.log('[Expand] Result already available:', result.output_url);
        setOutputImage(result.output_url);
        setIsGenerating(false);
        setCurrentGenerationId(null);
      }
      // Иначе продолжаем показывать shimmer и polling будет отслеживать
      
    } catch (error) {
      console.error('[Expand] Generation error:', error);
      setIsGenerating(false);
      setCurrentGenerationId(null);
    }
    // НЕ ставим setIsGenerating(false) в finally - это делает polling
  };

  // Скачивание результата
  const handleDownload = useCallback(() => {
    const downloadUrl = outputImage || image;
    if (!downloadUrl) return;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `expand-${Date.now()}.png`;
    link.click();
  }, [outputImage, image]);
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
  
  // Общий размер (картинка + expand) должен помещаться в 90% канваса
  const maxTotalSize = 90;
  
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
  const handleTop = 50 - scaledImageHeight/2 - scaledExpandTop;
  const handleBottom = 50 + scaledImageHeight/2 + scaledExpandBottom;
  const handleLeft = 50 - scaledImageWidth/2 - scaledExpandLeft;
  const handleRight = 50 + scaledImageWidth/2 + scaledExpandRight;

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />
      
      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-20 pr-0 relative">
          <div className="flex-1 flex flex-col py-8">
            {/* Header */}
            <div className="mb-6 shrink-0">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Form fields */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              {/* Модель */}
              <ModelSelector
                action="expand"
                value={selectedModel}
                onChange={setSelectedModel}
              />
              
              {/* Изображение */}
              <div className="border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Изображение" icon={ImageIcon} />
                <div 
                  className="bg-[#101010] border border-dashed border-[#656565] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-white/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 text-[#959595] mb-1" />
                  <p className="font-inter text-[14px] text-[#b7b7b7] text-center">
                    Перетащите или выберите на устройстве
                  </p>
                  <p className="font-inter text-[12px] text-[#959595]">PNG, JPG, WEBP</p>
                </div>
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
              
              {/* Prompt */}
              <div className="border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Prompt" icon={Wand2} />
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите результат на английском... (horse head, blue sky и тд.)"
                  className="min-h-[80px] bg-[#101010] border-0"
                />
              </div>
              
              {/* Negative Prompt */}
              <div className="border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
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
                <div className="border border-[#252525] rounded-2xl p-4 flex flex-col gap-4">
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
              <div className="border border-[#252525] rounded-2xl p-4 flex flex-col gap-2">
                <TooltipLabel label="Формат (Aspect Ratio)" />
                <AspectRatioSelector
                  value={selectedRatio || '1:1'}
                  options={ASPECT_RATIO_OPTIONS}
                  onChange={handleRatioSelect}
                  description="Соотношение сторон. Растягивайте на canvas справа для ручного контроля."
                  defaultLabel="1:1"
                />
              </div>
            </div>
          </div>

          {/* Sticky buttons */}
          <div className="sticky bottom-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isGenerating}
                className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!image || isGenerating}
                className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? 'Генерация...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 py-8 pl-0 pr-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setOutputImage(null); }}
                disabled={!outputImage}
                className="w-8 h-8 border border-[#2f2f2f] rounded-md flex items-center justify-center hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleDownload}
                disabled={!image && !outputImage}
                className="w-8 h-8 border border-[#2f2f2f] rounded-md flex items-center justify-center hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Canvas Container - fills remaining space with 32px bottom padding */}
          <div className="flex-1 pb-8 flex items-start justify-start">
            {/* Canvas Area - square, max size that fits */}
            <div 
              ref={canvasRef}
              style={{ width: 'min(100%, calc(100vh - 200px))', aspectRatio: '1/1' }}
              className={`relative rounded-2xl border transition-colors overflow-hidden ${
                isDraggingCanvas ? 'border-white/50 bg-white/5' : 'border-[#656565]'
              }`}
            onDrop={handleDropCanvas}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingCanvas(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingCanvas(false); }}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {!image ? (
              /* Empty state */
              <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                <div className="relative w-[120px] h-[112px] mb-4">
                  <div className="absolute left-0 top-0 w-[98px] h-[98px] border border-[#656565] rounded-lg" />
                  <div className="absolute right-0 bottom-0 w-[96px] h-[96px] bg-[#1a1a1a] border border-[#656565] rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-[#656565]" strokeWidth={1} />
                  </div>
                </div>
                <p className="font-inter text-[14px] text-[#6d6d6d] text-center">
                  Перетащите картинку или{' '}
                  <span className="text-[#5595ef]">выберите на устройстве</span>
                </p>
              </div>
            ) : (
              /* Image loaded - interactive canvas */
              <>
                {/* Grid lines - 3x3 grid внутри расширенной области */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Vertical lines */}
                  <div className="absolute w-px bg-[#3f3f3f] h-full" style={{ left: `${handleLeft}%` }} />
                  <div className="absolute w-px bg-[#3f3f3f] h-full" style={{ left: `${(handleLeft + handleRight) / 2}%` }} />
                  <div className="absolute w-px bg-[#3f3f3f] h-full" style={{ left: `${handleRight}%` }} />
                  
                  {/* Horizontal lines */}
                  <div className="absolute h-px bg-[#3f3f3f] w-full" style={{ top: `${handleTop}%` }} />
                  <div className="absolute h-px bg-[#3f3f3f] w-full" style={{ top: `${(handleTop + handleBottom) / 2}%` }} />
                  <div className="absolute h-px bg-[#3f3f3f] w-full" style={{ top: `${handleBottom}%` }} />
                </div>
                
                {/* Expanded gray areas (показывают области которые будут сгенерированы) */}
                {hasExpand && !outputImage && (
                  <>
                    {/* Top expansion */}
                    {expand.top > 0 && (
                      <div 
                        className="absolute bg-[#252525] pointer-events-none"
                        style={{
                          top: `${handleTop}%`,
                          left: `${handleLeft}%`,
                          right: `${100 - handleRight}%`,
                          height: `${scaledExpandTop}%`,
                        }}
                      />
                    )}
                    {/* Bottom expansion */}
                    {expand.bottom > 0 && (
                      <div 
                        className="absolute bg-[#252525] pointer-events-none"
                        style={{
                          bottom: `${100 - handleBottom}%`,
                          left: `${handleLeft}%`,
                          right: `${100 - handleRight}%`,
                          height: `${scaledExpandBottom}%`,
                        }}
                      />
                    )}
                    {/* Left expansion */}
                    {expand.left > 0 && (
                      <div 
                        className="absolute bg-[#252525] pointer-events-none"
                        style={{
                          top: `${handleTop + scaledExpandTop}%`,
                          left: `${handleLeft}%`,
                          width: `${scaledExpandLeft}%`,
                          bottom: `${100 - handleBottom + scaledExpandBottom}%`,
                        }}
                      />
                    )}
                    {/* Right expansion */}
                    {expand.right > 0 && (
                      <div 
                        className="absolute bg-[#252525] pointer-events-none"
                        style={{
                          top: `${handleTop + scaledExpandTop}%`,
                          right: `${100 - handleRight}%`,
                          width: `${scaledExpandRight}%`,
                          bottom: `${100 - handleBottom + scaledExpandBottom}%`,
                        }}
                      />
                    )}
                  </>
                )}
                
                {/* Image or Result */}
                {outputImage ? (
                  /* Result - на весь канвас */
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img
                      src={outputImage}
                      alt="Result"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  /* Original image - в центре */
                  <div 
                    className="absolute flex items-center justify-center"
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
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>
                )}
                
                {/* Shimmer effect during generation */}
                {isGenerating && (
                  <div 
                    className="absolute overflow-hidden"
                    style={{
                      top: `${handleTop}%`,
                      left: `${handleLeft}%`,
                      right: `${100 - handleRight}%`,
                      bottom: `${100 - handleBottom}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  </div>
                )}
                
                {/* Drag handles */}
                {!outputImage && (
                  <>
                    {/* Corner handles - меняют 2 стороны */}
                    <div
                      onMouseDown={(e) => handleMouseDown('top-left', e)}
                      className="absolute w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-lg z-30 hover:scale-110 transition-transform"
                      style={{ top: `${handleTop}%`, left: `${handleLeft}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown('top-right', e)}
                      className="absolute w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-lg z-30 hover:scale-110 transition-transform"
                      style={{ top: `${handleTop}%`, left: `${handleRight}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown('bottom-left', e)}
                      className="absolute w-4 h-4 bg-white rounded-full cursor-nesw-resize shadow-lg z-30 hover:scale-110 transition-transform"
                      style={{ top: `${handleBottom}%`, left: `${handleLeft}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown('bottom-right', e)}
                      className="absolute w-4 h-4 bg-white rounded-full cursor-nwse-resize shadow-lg z-30 hover:scale-110 transition-transform"
                      style={{ top: `${handleBottom}%`, left: `${handleRight}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    
                    {/* Side handles - меняют только 1 сторону */}
                    {/* Top */}
                    <div
                      onMouseDown={(e) => handleMouseDown('top', e)}
                      className="absolute w-8 h-3 bg-white/80 rounded-full cursor-ns-resize shadow-lg z-30 hover:bg-white transition-all"
                      style={{ top: `${handleTop}%`, left: `${(handleLeft + handleRight) / 2}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Bottom */}
                    <div
                      onMouseDown={(e) => handleMouseDown('bottom', e)}
                      className="absolute w-8 h-3 bg-white/80 rounded-full cursor-ns-resize shadow-lg z-30 hover:bg-white transition-all"
                      style={{ top: `${handleBottom}%`, left: `${(handleLeft + handleRight) / 2}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Left */}
                    <div
                      onMouseDown={(e) => handleMouseDown('left', e)}
                      className="absolute w-3 h-8 bg-white/80 rounded-full cursor-ew-resize shadow-lg z-30 hover:bg-white transition-all"
                      style={{ top: `${(handleTop + handleBottom) / 2}%`, left: `${handleLeft}%`, transform: 'translate(-50%, -50%)' }}
                    />
                    {/* Right */}
                    <div
                      onMouseDown={(e) => handleMouseDown('right', e)}
                      className="absolute w-3 h-8 bg-white/80 rounded-full cursor-ew-resize shadow-lg z-30 hover:bg-white transition-all"
                      style={{ top: `${(handleTop + handleBottom) / 2}%`, left: `${handleRight}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </>
                )}
                
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
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4">
        <p className="text-white text-center py-20">Используйте десктоп для работы с Expand</p>
      </main>

      {/* Shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
