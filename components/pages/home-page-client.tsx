'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActionSelector } from '@/components/action-selector';
import { ModelSelector } from '@/components/model-selector';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { MobileStartScreen } from '@/components/mobile-start-screen';
import { ActionType } from '@/lib/models-lite';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
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
  // Сессионные генерации (только текущая сессия, не из БД)
  const [sessionGenerations, setSessionGenerations] = useState<SessionGeneration[]>([]);
  const { addGeneration } = useGenerations();
  const { selectedWorkspaceId } = useUser();
  
  // Form ref для управления формой без глобальных переменных
  const formRef = useRef<SettingsFormRef | null>(null);

  // Check URL param to show form
  useEffect(() => {
    if (startParam === '1') {
      setMobileShowForm(true);
      // Clear URL param
      router.replace('/', { scroll: false });
    }
  }, [startParam, router]);

  // Ref to track if we've already handled the quick action params
  const quickActionHandledRef = useRef<string | null>(null);

  // Handle Quick Action params (action + imageUrl)
  useEffect(() => {
    if (!actionParam) return;
    
    // Create a unique key for these params to avoid re-processing
    const paramsKey = `${actionParam}-${imageUrlParam}`;
    if (quickActionHandledRef.current === paramsKey) return;
    
    const loadQuickAction = async () => {
      try {
        // Mark as handled BEFORE async work to prevent race conditions
        quickActionHandledRef.current = paramsKey;
        
        // Get first model for this action from LITE list (matches ModelSelector)
        const { getModelsByActionLite } = await import('@/lib/models-lite');
        const { getModelsByAction } = await import('@/lib/models-config');
        const modelsLite = getModelsByActionLite(actionParam as ActionType);
        const modelsFull = getModelsByAction(actionParam as ActionType);
        
        // Use first model from lite list for ID, but full list for settings
        const modelId = modelsLite[0]?.id;
        const model = modelsFull.find(m => m.id === modelId);
        
        if (modelId && model) {
          // Set image URL in form data using the correct field name from model settings
          let newFormData: Record<string, any> = {};
          if (imageUrlParam) {
            const fileField = model.settings.find(s => s.type === 'file' || s.type === 'file_array');
            const fieldName = fileField?.name || 'image';
            const value = fileField?.type === 'file_array' ? [imageUrlParam] : imageUrlParam;
            newFormData = { [fieldName]: value };
          }
          
          // Set all state at once (React will batch these)
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

  // Known image field names across different models
  const IMAGE_FIELD_NAMES = ['image', 'start_image', 'first_frame_image', 'img_cond_path', 'input_image', 'image_input'];

  // Handle model change - transfer image to correct field
  const handleModelChange = async (newModelId: string) => {
    if (!newModelId) {
      setSelectedModelId('');
      return;
    }

    // Get the new model to find correct field name
    const { getModelById } = await import('@/lib/models-config');
    const newModel = getModelById(newModelId);
    
    if (newModel) {
      // Find existing image in formData
      let existingImageUrl: string | null = null;
      
      for (const fieldName of IMAGE_FIELD_NAMES) {
        const value = formData[fieldName];
        if (value) {
          existingImageUrl = Array.isArray(value) ? value[0] : value;
          break;
        }
      }
      
      // If we have image, transfer it to the correct field
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

  // Handle model param from announcement banner
  useEffect(() => {
    if (!modelParam) return;
    
    const loadModel = async () => {
      // Dynamic import для избежания загрузки тяжёлого models-config на старте
      const { getModelById } = await import('@/lib/models-config');
      const model = getModelById(modelParam);
      
      if (model) {
        setSelectedAction(model.action);
        setSelectedModelId(model.id);
        setMobileShowForm(true);
      }
      
      // Clear URL param
      router.replace('/', { scroll: false });
    };
    
    loadModel();
  }, [modelParam, router]);

  // Load generation from URL parameter
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
          
          // Если это видео генерация - редирект на /video
          if (isVideoAction(generation.action)) {
            router.replace(`/video?generationId=${generationIdParam}`);
            return;
          }
          
          // Batch all state updates together
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
    // Switch to output tab on mobile when generation starts
    setMobileActiveTab('output');
    
    // Add to session generations (for Recent Generations strip)
    const action = generation.action || selectedAction;
    
    // Только image и video генерации добавляем в сессионные
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
    
    // Add to global context for header indicator
    if (generation) {
      addGeneration({
        id: generation.id,
        model_name: generation.model_name,
        action: generation.action || selectedAction,
        status: generation.status,
        created_at: generation.created_at,
        viewed: false, // Новая генерация всегда непросмотренная
      });
    }
  };

  // Обработчик выбора генерации из Recent strip
  const handleSelectSessionGeneration = (id: string) => {
    setCurrentGenerationId(id);
    setMobileActiveTab('output');
  };

  // Обновление сессионной генерации при получении результата
  const updateSessionGeneration = (id: string, updates: Partial<SessionGeneration>) => {
    setSessionGenerations(prev =>
      prev.map(g => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  // Polling для обновления всех processing генераций в сессии
  useEffect(() => {
    const processingGens = sessionGenerations.filter(
      g => g.status === 'pending' || g.status === 'processing'
    );
    
    if (processingGens.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const gen of processingGens) {
        // Пропускаем текущую генерацию - она обновляется через OutputPanel
        if (gen.id === currentGenerationId) continue;
        
        try {
          const response = await fetch(`/api/generations/${gen.id}`, {
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            // Update if status changed or output appeared
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
          // Тихо игнорируем сетевые ошибки - они не критичны для polling
          if (error?.name !== 'TypeError' && !error?.message?.includes('network')) {
            console.warn('[Session] Poll error for', gen.id);
          }
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [sessionGenerations, currentGenerationId]);

  const handleRegenerate = async (prompt: string, settings: Record<string, any>, modelId: string) => {
    // Set the form data from previous generation
    setSelectedModelId(modelId);
    setFormData({ ...settings, prompt });
    
    // Automatically start regeneration
    setIsGenerating(true);
    
    try {
      // Dynamic import для избежания загрузки тяжёлого models-config на старте
      const { getModelById } = await import('@/lib/models-config');
      const model = getModelById(modelId);
      if (!model) {
        console.error('Model not found:', modelId);
        setIsGenerating(false);
        return;
      }
      
      const response = await fetch('/api/generations/create', {
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
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentGenerationId(result.id);
        
        // Add to global context
        addGeneration({
          id: result.id,
          model_name: model.name,
          action: model.action,
          status: result.status || 'processing',
          created_at: result.created_at || new Date().toISOString(),
          viewed: false,
        });
        
        // Scroll to output
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

  // Убираем стартовый экран - сразу показываем форму как на десктопе
  const showStartScreen = false;

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
              {/* Action Selector */}
              <div className="animate-fade-in-up animate-delay-100">
                <ActionSelector
                  value={selectedAction}
                  onChange={(action) => {
                    setSelectedAction(action);
                    setSelectedModelId('');
                  }}
                />
              </div>

              {/* Model Selector */}
              <div className="animate-fade-in-up animate-delay-200">
                <ModelSelector
                  action={selectedAction}
                  value={selectedModelId}
                  onChange={handleModelChange}
                />
              </div>

              {/* Settings Form - только поля, без кнопок */}
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
          </div>

          {/* Sticky buttons at bottom of left panel (внутри формы) */}
          {selectedModelId && (
            <div className="sticky bottom-0 bg-[#101010] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
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
                      setIsGenerating(true);
                      try {
                        await formRef.current.submit();
                      } finally {
                        setIsGenerating(false);
                      }
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

        {/* DIVIDER (64px включая отступы) */}
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
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-0">
        {/* Show Start Screen on mobile when no model selected and no generation */}
        {showStartScreen ? (
          <MobileStartScreen mode="image" onStartGeneration={() => setMobileShowForm(true)} />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="mb-4">
              <MobileTabSwitcher 
                activeTab={mobileActiveTab}
                onTabChange={setMobileActiveTab}
                label="IMAGE GENERATION"
              />
            </div>

            {/* Content based on active tab */}
            {mobileActiveTab === 'input' ? (
              /* INPUT TAB - 12px gap between cards */
              <div className="flex-1 flex flex-col gap-3 pb-[120px]">
                {/* Action Selector */}
                <div className="animate-fade-in-up">
                  <ActionSelector
                    value={selectedAction}
                    onChange={(action) => {
                      setSelectedAction(action);
                      setSelectedModelId('');
                    }}
                  />
                </div>

                {/* Model Selector */}
                <div className="animate-fade-in-up animate-delay-100">
                  <ModelSelector
                    action={selectedAction}
                    value={selectedModelId}
                    onChange={handleModelChange}
                  />
                </div>

                {/* Settings Form */}
                {selectedModelId && (
                  <div className="animate-fade-in-up animate-delay-200">
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

                {/* Sticky buttons - Mobile */}
                {selectedModelId && (
                  <div className="fixed bottom-0 left-0 right-0 bg-[#101010] pt-4 pb-8 px-4 border-t border-[#1f1f1f] z-10">
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
                            setIsGenerating(true);
                            try {
                              await formRef.current.submit();
                            } finally {
                              setIsGenerating(false);
                            }
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
            ) : (
              /* OUTPUT TAB */
              <div className="flex-1 flex flex-col pb-10">
                <div className="animate-fade-in-up">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[200px] text-[#959595]">
                        Загрузка результатов...
                      </div>
                    }
                  >
                    <OutputPanel
                      generationId={currentGenerationId}
                      onRegenerate={handleRegenerate}
                      isMobile={true}
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
      </main>
    </div>
  );
}

export default function HomePageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
