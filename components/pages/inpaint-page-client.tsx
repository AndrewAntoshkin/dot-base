'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { MaskEditor } from '@/components/mask-editor';
import { INPAINT_MODELS } from '@/lib/models-config';
import { INPAINT_MODELS_LITE } from '@/lib/models-lite';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { 
  Upload, 
  X, 
  Wand2,
  AlignRight,
} from 'lucide-react';
import { ImageUploadArea } from '@/components/ui/image-upload-area';

interface GenerationResult {
  id: string;
  resultUrl: string;
  prompt: string;
}

export default function InpaintPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageUrlParam = searchParams.get('imageUrl');
  
  const { addGeneration, refreshGenerations } = useGenerations();
  const { selectedWorkspaceId } = useUser();
  // State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>(INPAINT_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle imageUrl param from Quick Actions
  useEffect(() => {
    if (!imageUrlParam) return;
    
    // Set image directly from URL (it's already a valid HTTP URL)
    setUploadedImage(imageUrlParam);
    setMaskDataUrl(null);
    
    // Clear URL param
    router.replace('/inpaint', { scroll: false });
  }, [imageUrlParam, router]);

  // Get selected model from full config
  const selectedModel = useMemo(() => {
    return INPAINT_MODELS.find(m => m.id === selectedModelId) || INPAINT_MODELS[0];
  }, [selectedModelId]);

  // Model options for select
  const modelOptions: SelectOption[] = useMemo(() => {
    return INPAINT_MODELS_LITE.map((model) => ({
      value: model.id,
      label: model.displayName,
    }));
  }, []);
  
  // Result state
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationResult[]>([]);

  // Process uploaded file
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, загрузите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImage(dataUrl);
      setMaskDataUrl(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle mask change from editor
  const handleMaskChange = useCallback((dataUrl: string) => {
    setMaskDataUrl(dataUrl);
  }, []);

  // Clear uploaded image
  const handleClearImage = () => {
    setUploadedImage(null);
    setMaskDataUrl(null);
  };

  // Upload data URL to server (or return HTTP URL as-is)
  const uploadDataUrl = async (dataUrl: string): Promise<string> => {
    // If it's already an HTTP URL, return it directly
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return dataUrl;
    }
    
    const match = dataUrl.match(/^data:(.*?);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    
    const mimeType = match[1];
    const base64 = match[2];
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    const extension = mimeType.split('/')[1] || 'png';
    const blob = new Blob([buffer], { type: mimeType });

    const formData = new FormData();
    formData.append('files', blob, `file.${extension}`);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    return data.urls[0];
  };

  // Poll for generation result
  const pollForResult = useCallback(async (generationId: string) => {
    const maxAttempts = 120; // 2 minutes max
    let attempts = 0;

    const poll = async (): Promise<string | null> => {
      try {
        const response = await fetch(`/api/generations/${generationId}`);
        if (!response.ok) return null;

        const data = await response.json();
        
        // API возвращает output_urls (массив)
        if (data.status === 'completed' && data.output_urls && data.output_urls.length > 0) {
          return data.output_urls[0];
        } else if (data.status === 'failed') {
          throw new Error(data.error_message || 'Generation failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          return poll();
        }
        return null;
      } catch (error) {
        console.error('Poll error:', error);
        return null;
      }
    };

    return poll();
  }, []);

  // Handle generate
  const handleGenerate = async () => {
    if (!uploadedImage || !maskDataUrl) {
      alert('Загрузите изображение и нарисуйте маску');
      return;
    }
    
    if (selectedModel.id !== 'bria-eraser-inpaint' && !prompt.trim()) {
      alert('Введите prompt');
      return;
    }

    setIsGenerating(true);

    try {
      // Upload image and mask
      const [imageUrl, maskUrl] = await Promise.all([
        uploadDataUrl(uploadedImage),
        uploadDataUrl(maskDataUrl),
      ]);

      // Build settings - ONLY what the model needs
      const settings: Record<string, any> = {
        image: imageUrl,
        mask: maskUrl,
      };

      // Add model-specific settings
      if (selectedModel.id === 'flux-fill-pro') {
        settings.prompt = prompt.trim();
      } else if (selectedModel.id === 'bria-genfill-inpaint') {
        settings.prompt = prompt.trim();
      }

      // Create generation via API
      const response = await fetch('/api/generations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: selectedModel.action,
          model_id: selectedModel.id,
          prompt: settings.prompt || '',
          settings: settings,
          workspace_id: selectedWorkspaceId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentGenerationId(result.id);
        
        // Add to global context for header indicator
        addGeneration({
          id: result.id,
          model_name: selectedModel.name,
          action: selectedModel.action,
          status: result.status || 'processing',
          created_at: result.created_at || new Date().toISOString(),
          viewed: false,
        });
        
        // Poll for result
        const resultUrl = await pollForResult(result.id);
        
        if (resultUrl) {
          // Заменяем изображение в канвасе на результат
          setUploadedImage(resultUrl);
          setMaskDataUrl(null);
          
          // Add to local history
          setGenerationHistory(prev => [{
            id: result.id,
            resultUrl,
            prompt: prompt.trim(),
          }, ...prev].slice(0, 10));
          
          // Refresh global generations
          refreshGenerations();
        } else {
          alert('Генерация завершилась без результата. Проверьте историю.');
        }
      } else {
        const errorData = await response.json();
        console.error('Generation failed:', errorData);
        alert('Ошибка при создании генерации: ' + (errorData.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Ошибка при создании генерации. Попробуйте ещё раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if can generate
  const canGenerate = uploadedImage && maskDataUrl && (prompt.trim() || selectedModel.id === 'bria-eraser-inpaint');

  return (
    <div className="min-h-screen flex flex-col bg-[#101010]">
      <Header />

      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-20 pr-0 relative">
          {/* Top content area */}
          <div className="flex-1 flex flex-col py-8">
            {/* Header */}
            <div className="mb-6 shrink-0 animate-fade-in-up">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Form fields - 12px gap between cards */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Model selector card */}
              <div className="animate-fade-in-up animate-delay-100 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                  <AlignRight className="w-3 h-3" />
                  Модель
                </label>
                
                <MobileSelect
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                  options={modelOptions}
                  placeholder="Выбрать модель"
                  title="Модель"
                />

                {selectedModel.description && (
                  <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
                    {selectedModel.description}
                  </p>
                )}
              </div>

              {/* Upload card - FIRST */}
              <div className="animate-fade-in-up animate-delay-200 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                  <Upload className="w-3 h-3" />
                  Изображение
                </label>
                
                {!uploadedImage ? (
                  <ImageUploadArea
                    onFileSelect={processFile}
                    isDragging={isDragging}
                    onDragStateChange={setIsDragging}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#2f2f2f] flex-shrink-0">
                      <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-inter text-sm text-white">Изображение загружено</p>
                      <p className="font-inter text-xs text-[#666] mt-1">Нарисуйте маску на панели справа</p>
                    </div>
                    <button
                      onClick={handleClearImage}
                      className="p-2 rounded-lg bg-[#2f2f2f] text-white hover:bg-[#3f3f3f] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt card - SECOND */}
              {selectedModel.id !== 'bria-eraser-inpaint' && (
                <div className="animate-fade-in-up animate-delay-300 border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <Wand2 className="w-3 h-3" />
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите результат на английском... (horse head, blue sky, etc.)"
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2f2f2f] rounded-xl text-white placeholder:text-[#666] font-inter text-sm resize-none focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              )}

              {/* Eraser info */}
              {selectedModel.id === 'bria-eraser-inpaint' && (
                <div className="animate-fade-in-up animate-delay-300 border border-[#252525] rounded-[16px] p-4">
                  <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
                    <strong className="text-white">Bria Eraser</strong> — удаляет объекты из выделенной области, заполняя её фоном. Prompt не требуется.
                  </p>
                </div>
              )}

              {/* Mask preview */}
              {maskDataUrl && (
                <div className="animate-fade-in-up border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
                  <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Маска (preview)
                  </label>
                  <div className="w-full aspect-video bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#2f2f2f]">
                    <img src={maskDataUrl} alt="Mask preview" className="w-full h-full object-contain" />
                  </div>
                  <p className="font-inter text-[12px] text-[#666]">Белые области будут изменены</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky buttons at bottom */}
          <div className="sticky bottom-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  handleClearImage();
                  setGenerationHistory([]);
                }}
                disabled={isGenerating}
                className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
              >
                {isGenerating ? 'Генерация...' : 'Создать'}
              </button>
            </div>
            <p className="font-inter text-xs text-[#666] text-center mt-3">
              {!uploadedImage 
                ? '1. Загрузите изображение' 
                : !maskDataUrl 
                ? '2. Нарисуйте маску' 
                : selectedModel.id !== 'bria-eraser-inpaint' && !prompt.trim()
                ? '3. Введите prompt'
                : 'Готово к генерации!'}
            </p>
          </div>
        </div>

        {/* DIVIDER (64px) */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 py-8 pl-0 pr-20 overflow-y-auto">
          <div className="mb-6 animate-fade-in-up">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
          </div>

          <div className="animate-fade-in-up animate-delay-200">
            {!uploadedImage ? (
              // Empty state - same as IMAGE page
              <div className="flex items-center justify-center min-h-[660px] px-20">
                <div className="flex gap-12 w-full">
                  <div className="flex-1 flex flex-col py-2">
                    <img src="/numbers/1.png" alt="1" width={36} height={64} className="mb-0" />
                    <div className="flex flex-col gap-2 py-6">
                      <h3 className="font-inter font-semibold text-xl text-white">Загрузить</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Выберите изображение</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col py-2">
                    <img src="/numbers/2.png" alt="2" width={55} height={64} className="mb-0" />
                    <div className="flex flex-col gap-2 py-6">
                      <h3 className="font-inter font-semibold text-xl text-white">Нарисовать маску</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Выделите область для изменения</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col py-2">
                    <img src="/numbers/3.png" alt="3" width={53} height={64} className="mb-0" />
                    <div className="flex flex-col gap-2 py-6">
                      <h3 className="font-inter font-semibold text-xl text-white">Генерация</h3>
                      <p className="font-inter text-sm text-[#9c9c9c]">Опишите результат на английском</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Mask editor + history
              <div className="flex flex-col gap-4">
                <MaskEditor
                  imageUrl={uploadedImage}
                  onMaskChange={handleMaskChange}
                  width={660}
                  height={660}
                />

                {/* Generation history - 64x64 previews in a row */}
                {generationHistory.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {generationHistory.map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => {
                          setUploadedImage(gen.resultUrl);
                          setMaskDataUrl(null);
                        }}
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#2f2f2f] hover:border-white transition-colors"
                        title="Кликните чтобы редактировать"
                      >
                        <img src={gen.resultUrl} alt={gen.prompt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-24">
        <div className="flex-1 flex flex-col gap-3">
          {/* Model selector */}
          <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
            <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
              <AlignRight className="w-3 h-3" />
              Модель
            </label>
            
            <MobileSelect
              value={selectedModelId}
              onValueChange={setSelectedModelId}
              options={modelOptions}
              placeholder="Выбрать модель"
              title="Модель"
            />
          </div>

          {/* Upload or Editor - FIRST */}
          {!uploadedImage ? (
            <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                <Upload className="w-3 h-3" />
                Изображение
              </label>
              <ImageUploadArea
                onFileSelect={processFile}
                isDragging={isDragging}
                onDragStateChange={setIsDragging}
              />
            </div>
          ) : (
            <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                  Редактор маски
                </label>
                <button onClick={handleClearImage} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2f2f2f] text-white text-xs">
                  <X className="w-3 h-3" /> Убрать
                </button>
              </div>
              <MaskEditor imageUrl={uploadedImage} onMaskChange={handleMaskChange} width={400} height={300} />
            </div>
          )}

          {/* Prompt - SECOND */}
          {selectedModel.id !== 'bria-eraser-inpaint' && (
            <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
              <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
                <Wand2 className="w-3 h-3" />
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите результат на английском..."
                rows={3}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2f2f2f] rounded-xl text-white placeholder:text-[#666] font-inter text-sm resize-none focus:outline-none focus:border-white transition-colors"
              />
            </div>
          )}
        </div>

        {/* Mobile bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#101010] p-4 border-t border-[#1f1f1f]">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="w-full h-12 rounded-xl bg-white font-inter font-medium text-sm text-black disabled:opacity-50 disabled:bg-[#2f2f2f] disabled:text-[#666]"
          >
            {isGenerating ? 'Генерация...' : 'Создать'}
          </button>
        </div>
      </main>
    </div>
  );
}

