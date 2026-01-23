'use client';

import { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActionSelector } from '@/components/action-selector';
import { ModelSelector } from '@/components/model-selector';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { MobileStartScreen } from '@/components/mobile-start-screen';
import { ActionType } from '@/lib/models-lite';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { fetchWithTimeout, isSlowConnection } from '@/lib/network-utils';
import type { SettingsFormRef } from '@/components/settings-form';
import type { SessionGeneration } from '@/components/recent-generations';

// Ленивая загрузка тяжёлых компонентов
const SettingsForm = lazy(() =>
  import('@/components/settings-form').then((m) => ({ default: m.SettingsForm }))
);
const OutputPanel = lazy(() =>
  import('@/components/output-panel').then((m) => ({ default: m.OutputPanel }))
);

// Проверка, является ли action видео действием
const isVideoAction = (action: string): boolean => {
  return action.startsWith('video_');
};

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generationIdParam = searchParams.get('generationId');
  const startParam = searchParams.get('start');
  const modelParam = searchParams.get('model');
  const actionParam = searchParams.get('action');
  const imageUrlParam = searchParams.get('imageUrl');
  
  const [selectedAction, setSelectedAction] = useState<ActionType>('create');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [mobileShowForm, setMobileShowForm] = useState(false);
  const [sessionGenerations, setSessionGenerations] = useState<SessionGeneration[]>([]);
  const { addGeneration } = useGenerations();
  const { selectedWorkspaceId } = useUser();
  
  const formRef = useRef<SettingsFormRef | null>(null);

  // Check URL param to show form
  useEffect(() => {
    if (startParam === '1') {
      setMobileShowForm(true);
      router.replace('/', { scroll: false });
    }
  }, [startParam, router]);

  const quickActionHandledRef = useRef<string | null>(null);

  // Handle Quick Action params (action + imageUrl)
  useEffect(() => {
    if (!actionParam) return;
    
    const paramsKey = `${actionParam}-${imageUrlParam}`;
    if (quickActionHandledRef.current === paramsKey) return;
    
    const loadQuickAction = async () => {
      try {
        quickActionHandledRef.current = paramsKey;
        
        const { getModelsByActionLite } = await import('@/lib/models-lite');
        const { getModelsByAction } = await import('@/lib/models-config');
        const modelsLite = getModelsByActionLite(actionParam as ActionType);
        const modelsFull = getModelsByAction(actionParam as ActionType);
        
        const modelId = modelsLite[0]?.id;
        const model = modelsFull.find(m => m.id === modelId);
        
        if (modelId && model) {
          let newFormData: Record<string, any> = {};
          if (imageUrlParam) {
            const fileField = model.settings.find(s => s.type === 'file' || s.type === 'file_array');
            const fieldName = fileField?.name || 'image';
            const value = fileField?.type === 'file_array' ? [imageUrlParam] : imageUrlParam;
            newFormData = { [fieldName]: value };
          }
          
          if (!isVideoAction(actionParam)) {
            setSelectedAction(actionParam as ActionType);
          }
          setSelectedModelId(modelId);
          setFormData(newFormData);
          setMobileShowForm(true);
        }
      } catch (error) {
        console.error('Error loading quick action:', error);
        quickActionHandledRef.current = null;
      }
    };
    
    loadQuickAction();
  }, [actionParam, imageUrlParam]);

  const IMAGE_FIELD_NAMES = ['image', 'start_image', 'first_frame_image', 'img_cond_path', 'input_image', 'image_input'];

  // Состояние для выбранной LoRA
  const [selectedLora, setSelectedLora] = useState<{
    id: string;
    name: string;
    trigger_word: string | null;
    lora_url: string | null;
    replicate_model_url: string | null;
  } | null>(null);

  const handleModelChange = async (newModelId: string) => {
    if (!newModelId) {
      setSelectedModelId('');
      setSelectedLora(null);
      return;
    }

    // Обработка выбора пользовательской LoRA
    if (newModelId.startsWith('lora:')) {
      const loraId = newModelId.replace('lora:', '');
      
      try {
        // Загружаем данные LoRA
        const response = await fetch(`/api/loras/${loraId}`);
        if (response.ok) {
          const { lora } = await response.json();
          
          setSelectedLora(lora);
          // Сохраняем ID LoRA для отображения в селекторе
          setSelectedModelId(newModelId);
          
          // Предзаполняем форму с данными LoRA
          const loraUrl = lora.replicate_model_url || lora.lora_url || '';
          const triggerWord = lora.trigger_word || '';
          
          setFormData(prev => ({
            ...prev,
            hf_lora: loraUrl,
            prompt: triggerWord ? `${triggerWord} style, ` : '',
          }));
        }
      } catch (error) {
        console.error('Error loading LoRA:', error);
      }
      return;
    }

    // Сбрасываем выбранную LoRA если выбрана обычная модель
    setSelectedLora(null);

    const { getModelById } = await import('@/lib/models-config');
    const newModel = getModelById(newModelId);
    
    if (newModel) {
      let existingImageUrl: string | null = null;
      
      for (const fieldName of IMAGE_FIELD_NAMES) {
        const value = formData[fieldName];
        if (value) {
          existingImageUrl = Array.isArray(value) ? value[0] : value;
          break;
        }
      }
      
      if (existingImageUrl) {
        const fileField = newModel.settings.find(s => s.type === 'file' || s.type === 'file_array');
        
        if (fileField) {
          const value = fileField.type === 'file_array' ? [existingImageUrl] : existingImageUrl;
          setFormData({ [fileField.name]: value });
        }
      }
    }
    
    setSelectedModelId(newModelId);
  };

  useEffect(() => {
    if (!modelParam) return;
    
    const loadModel = async () => {
      const { getModelById } = await import('@/lib/models-config');
      const model = getModelById(modelParam);
      
      if (model) {
        setSelectedAction(model.action);
        setSelectedModelId(model.id);
        setMobileShowForm(true);
      }
      
      router.replace('/', { scroll: false });
    };
    
    loadModel();
  }, [modelParam, router]);

  useEffect(() => {
    if (!generationIdParam) return;

    let isCancelled = false;
    const abortController = new AbortController();

    const loadGeneration = async () => {
      try {
        const response = await fetch(`/api/generations/${generationIdParam}`, {
          signal: abortController.signal,
        });
        
        if (isCancelled) return;
        
        if (response.ok) {
          const generation = await response.json();
          
          if (isCancelled) return;
          
          if (isVideoAction(generation.action)) {
            router.replace(`/video?generationId=${generationIdParam}`);
            return;
          }
          
          setCurrentGenerationId(generation.id);
          setSelectedAction(generation.action as ActionType);
          setSelectedModelId(generation.model_id);
          setFormData({
            prompt: generation.prompt,
            ...generation.settings,
          });
          setMobileActiveTab('output');
        }
      } catch (error: any) {
        if (error?.name === 'AbortError' || isCancelled) return;
        console.error('Error loading generation:', error);
      }
    };

    loadGeneration();
    
    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [generationIdParam, router]);

  const handleGenerationCreated = (generationId: string, generation: any) => {
    setCurrentGenerationId(generationId);
    setMobileActiveTab('output');
    
    const action = generation.action || selectedAction;
    
    if (!action.startsWith('analyze_')) {
      const newSessionGen: SessionGeneration = {
        id: generation.id,
        status: generation.status || 'processing',
        output_urls: generation.output_urls || null,
        model_name: generation.model_name || 'Unknown',
        action: action,
        created_at: generation.created_at || new Date().toISOString(),
      };
      setSessionGenerations(prev => [newSessionGen, ...prev.slice(0, 15)]);
    }
    
    if (generation) {
      addGeneration({
        id: generation.id,
        model_name: generation.model_name,
        action: generation.action || selectedAction,
        status: generation.status,
        created_at: generation.created_at,
        viewed: false,
      });
    }
  };

  const handleSelectSessionGeneration = (id: string) => {
    setCurrentGenerationId(id);
    setMobileActiveTab('output');
  };

  const updateSessionGeneration = (id: string, updates: Partial<SessionGeneration>) => {
    setSessionGenerations(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  useEffect(() => {
    const processingGens = sessionGenerations.filter(
      g => g.status === 'pending' || g.status === 'processing'
    );
    
    if (processingGens.length === 0) return;

    const interval = isSlowConnection() ? 10000 : 5000;

    const pollInterval = setInterval(async () => {
      for (const gen of processingGens) {
        if (gen.id === currentGenerationId) continue;
        
        try {
          const response = await fetchWithTimeout(`/api/generations/${gen.id}`, {
            credentials: 'include',
            timeout: isSlowConnection() ? 20000 : 10000,
            retries: 0,
          });
          
          if (response.ok) {
            const data = await response.json();
            const statusChanged = data.status !== gen.status;
            const outputAppeared = !gen.output_urls && data.output_urls?.length > 0;
            
            if (statusChanged || outputAppeared) {
              updateSessionGeneration(gen.id, {
                status: data.status,
                output_urls: data.output_urls,
                model_name: data.model_name || gen.model_name,
              });
            }
          }
        } catch (error: any) {
          if (error?.name !== 'TypeError' && !error?.message?.includes('network') && error?.name !== 'AbortError') {
            console.warn('[Session] Poll error for', gen.id);
          }
        }
      }
    }, interval);

    return () => clearInterval(pollInterval);
  }, [sessionGenerations, currentGenerationId]);

  const handleRegenerate = async (prompt: string, settings: Record<string, any>, modelId: string) => {
    setSelectedModelId(modelId);
    setFormData({ ...settings, prompt });
    setIsGenerating(true);
    
    try {
      const { getModelById } = await import('@/lib/models-config');
      const model = getModelById(modelId);
      if (!model) {
        console.error('Model not found:', modelId);
        setIsGenerating(false);
        return;
      }
      
      const response = await fetchWithTimeout('/api/generations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: model.action,
          model_id: model.id,
          prompt: prompt,
          settings: settings,
          workspace_id: selectedWorkspaceId,
        }),
        timeout: isSlowConnection() ? 60000 : 30000,
        retries: 1,
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentGenerationId(result.id);
        
        addGeneration({
          id: result.id,
          model_name: model.name,
          action: model.action,
          status: result.status || 'processing',
          created_at: result.created_at || new Date().toISOString(),
          viewed: false,
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errorData = await response.json();
        console.error('Regeneration failed:', errorData);
      }
    } catch (error) {
      console.error('Regeneration error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const showStartScreen = false;

  return (
    <div className="h-screen flex flex-col bg-[#101010] overflow-hidden">
      <Header />

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
              <div className="animate-fade-in-up animate-delay-100">
                <ActionSelector
                  value={selectedAction}
                  onChange={(action) => {
                    setSelectedAction(action);
                    setSelectedModelId('');
                  }}
                />
              </div>

              <div className="animate-fade-in-up animate-delay-200">
                <ModelSelector
                  action={selectedAction}
                  value={selectedModelId}
                  onChange={handleModelChange}
                />
              </div>

              {selectedModelId && (
                <div className="animate-fade-in-up animate-delay-300 pb-4">
                  <Suspense fallback={<div className="p-4 text-center text-[#959595]">Загрузка настроек...</div>}>
                    <SettingsForm
                      modelId={selectedModelId}
                      onGenerationCreated={handleGenerationCreated}
                      onFormDataChange={setFormData}
                      onSubmitStart={() => setIsGenerating(true)}
                      onSubmitEnd={() => setIsGenerating(false)}
                      onError={() => setIsGenerating(false)}
                      initialData={formData}
                      formRef={formRef}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>

          {/* Fixed buttons at bottom */}
          {selectedModelId && (
            <div className="shrink-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] pr-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({});
                    formRef.current?.reset();
                  }}
                  disabled={isGenerating}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (formRef.current) {
                      await formRef.current.submit();
                    }
                  }}
                  disabled={isGenerating}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Генерация...' : 'Создать'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="flex items-center justify-center shrink-0" style={{ width: '64px' }}>
          <div className="w-px h-full bg-[#2f2f2f]" />
        </div>

        {/* RIGHT PANEL - OUTPUT */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pl-0 pr-20">
          <div className="mb-6 animate-fade-in-up">
            <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
              OUTPUT
            </h2>
          </div>

          <div className="animate-fade-in-up animate-delay-200">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px] text-[#959595]">
                  Загрузка результатов...
                </div>
              }
            >
              <OutputPanel
                generationId={currentGenerationId}
                onRegenerate={handleRegenerate}
                sessionGenerations={sessionGenerations}
                onSelectGeneration={handleSelectSessionGeneration}
                onGenerationUpdate={updateSessionGeneration}
                cachedGeneration={sessionGenerations.find(g => g.id === currentGenerationId) || null}
              />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col min-h-0">
        {showStartScreen ? (
          <MobileStartScreen mode="image" onStartGeneration={() => setMobileShowForm(true)} />
        ) : (
          <>
            <div className="mb-4 px-4 pt-4 shrink-0">
              <MobileTabSwitcher 
                activeTab={mobileActiveTab}
                onTabChange={setMobileActiveTab}
                label="IMAGE GENERATION"
              />
            </div>

            {mobileActiveTab === 'input' ? (
              <div className="flex-1 flex flex-col gap-3 px-4 pb-[120px] overflow-y-auto scrollbar-hide">
                <div className="animate-fade-in-up">
                  <ActionSelector
                    value={selectedAction}
                    onChange={(action) => {
                      setSelectedAction(action);
                      setSelectedModelId('');
                    }}
                  />
                </div>

                <div className="animate-fade-in-up animate-delay-200">
                  <ModelSelector
                    action={selectedAction}
                    value={selectedModelId}
                    onChange={handleModelChange}
                  />
                </div>

                {selectedModelId && (
                  <div className="animate-fade-in-up animate-delay-300">
                    <Suspense fallback={<div className="p-4 text-center text-[#959595]">Загрузка настроек...</div>}>
                      <SettingsForm
                        modelId={selectedModelId}
                        onGenerationCreated={handleGenerationCreated}
                        onFormDataChange={setFormData}
                        onSubmitStart={() => setIsGenerating(true)}
                        onSubmitEnd={() => setIsGenerating(false)}
                        onError={() => setIsGenerating(false)}
                        initialData={formData}
                        formRef={formRef}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col px-4 pb-[120px] overflow-y-auto scrollbar-hide">
                <div className="animate-fade-in-up">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[400px] text-[#959595]">
                        Загрузка результатов...
                      </div>
                    }
                  >
                    <OutputPanel
                      generationId={currentGenerationId}
                      onRegenerate={handleRegenerate}
                      sessionGenerations={sessionGenerations}
                      onSelectGeneration={handleSelectSessionGeneration}
                      onGenerationUpdate={updateSessionGeneration}
                      cachedGeneration={sessionGenerations.find(g => g.id === currentGenerationId) || null}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </>
        )}

        {mobileActiveTab === 'input' && selectedModelId && (
          <div className="shrink-0 bg-[#101010] p-4 border-t border-[#1f1f1f]">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({});
                  formRef.current?.reset();
                }}
                disabled={isGenerating}
                className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (formRef.current) {
                    await formRef.current.submit();
                  }
                }}
                disabled={isGenerating}
                className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Генерация...' : 'Создать'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#101010] text-white">Загрузка...</div>}>
      <HomeContent />
    </Suspense>
  );
}
