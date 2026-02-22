'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActionSelector } from '@/components/action-selector';
import { ModelSelector } from '@/components/model-selector';
import { AppShell } from '@/components/app-shell';
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

function VideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generationIdParam = searchParams.get('generationId');
  const startParam = searchParams.get('start');
  const actionParam = searchParams.get('action');
  const imageUrlParam = searchParams.get('imageUrl');
  const videoUrlParam = searchParams.get('videoUrl');
  const modelParam = searchParams.get('model');
  
  // Видео режим - начинаем с video_create
  const [selectedAction, setSelectedAction] = useState<ActionType>('video_create');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [mobileShowForm, setMobileShowForm] = useState(false);
  // Сессионные генерации (только текущая сессия, не из БД)
  const [sessionGenerations, setSessionGenerations] = useState<SessionGeneration[]>([]);
  const { addGeneration } = useGenerations();
  const { selectedWorkspaceId, isAdmin } = useUser();
  
  // Form ref для управления формой без глобальных переменных
  const formRef = useRef<SettingsFormRef | null>(null);

  // Check URL param to show form
  useEffect(() => {
    if (startParam === '1') {
      setMobileShowForm(true);
      // Clear URL param
      router.replace('/video', { scroll: false });
    }
  }, [startParam, router]);

  // Ref to track if we've already handled the model param
  const modelParamHandledRef = useRef<string | null>(null);

  // Handle model param from banner/direct link (e.g. ?model=seedance-1.5-pro-t2v)
  useEffect(() => {
    if (!modelParam || modelParamHandledRef.current === modelParam) return;
    
    const loadModelFromParam = async () => {
      try {
        modelParamHandledRef.current = modelParam;
        
        // Get the model to determine its action
        const { getModelById } = await import('@/lib/models-config');
        const model = getModelById(modelParam);
        
        if (model && isVideoAction(model.action)) {
          setSelectedAction(model.action as ActionType);
          setSelectedModelId(modelParam);
          setMobileShowForm(true);
          
          // Clear URL param after setting
          router.replace('/video', { scroll: false });
        }
      } catch (error) {
        console.error('Error loading model from param:', error);
        modelParamHandledRef.current = null;
      }
    };
    
    loadModelFromParam();
  }, [modelParam, router]);

  // Ref to track if we've already handled the quick action params
  const quickActionHandledRef = useRef<string | null>(null);

  // Handle Quick Action params (action + imageUrl/videoUrl)
  useEffect(() => {
    if (!actionParam) return;
    
    // Create a unique key for these params to avoid re-processing
    const paramsKey = `${actionParam}-${imageUrlParam}-${videoUrlParam}`;
    if (quickActionHandledRef.current === paramsKey) return;
    
    const loadQuickAction = async () => {
      try {
        // Mark as handled BEFORE async work to prevent race conditions
        quickActionHandledRef.current = paramsKey;
        
        // Get first model for this action from LITE list (matches ModelSelector)
        const { getModelsByActionLite } = await import('@/lib/models-lite');
        const { getModelsByAction } = await import('@/lib/models-config');
        const modelsLite = getModelsByActionLite(actionParam as ActionType, isAdmin);
        const modelsFull = getModelsByAction(actionParam as ActionType, isAdmin);
        
        // Use first model from lite list for ID, but full list for settings
        const modelId = modelsLite[0]?.id;
        const model = modelsFull.find(m => m.id === modelId);
        
        if (modelId && model) {
          // Set media URL in form data using the correct field name from model settings
          let newFormData: Record<string, any> = {};
          if (imageUrlParam) {
            const fileField = model.settings.find(s => s.type === 'file' || s.type === 'file_array');
            const fieldName = fileField?.name || 'image';
            const value = fileField?.type === 'file_array' ? [imageUrlParam] : imageUrlParam;
            newFormData = { [fieldName]: value };
          } else if (videoUrlParam) {
            const fileField = model.settings.find(s => (s.type === 'file' || s.type === 'file_array') && s.name.toLowerCase().includes('video'));
            const fieldName = fileField?.name || 'video';
            const value = fileField?.type === 'file_array' ? [videoUrlParam] : videoUrlParam;
            newFormData = { [fieldName]: value };
          }
          
          // Set all state at once (React will batch these)
          if (isVideoAction(actionParam)) {
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
  }, [actionParam, imageUrlParam, videoUrlParam]);

  // Known image field names across different models
  const IMAGE_FIELD_NAMES = ['image', 'start_image', 'first_frame_image', 'img_cond_path', 'input_image'];
  const VIDEO_FIELD_NAMES = ['video', 'input_video'];

  // Handle model change - transfer image/video to correct field
  const handleModelChange = async (newModelId: string) => {
    if (!newModelId) {
      setSelectedModelId('');
      return;
    }

    // Get the new model to find correct field name
    const { getModelById } = await import('@/lib/models-config');
    const newModel = getModelById(newModelId);
    
    if (newModel) {
      // Find existing image/video in formData
      let existingImageUrl: string | null = null;
      let existingVideoUrl: string | null = null;
      
      for (const fieldName of IMAGE_FIELD_NAMES) {
        const value = formData[fieldName];
        if (value) {
          existingImageUrl = Array.isArray(value) ? value[0] : value;
          break;
        }
      }
      
      for (const fieldName of VIDEO_FIELD_NAMES) {
        const value = formData[fieldName];
        if (value) {
          existingVideoUrl = Array.isArray(value) ? value[0] : value;
          break;
        }
      }
      
      // If we have media, transfer it to the correct field
      if (existingImageUrl || existingVideoUrl) {
        const fileField = newModel.settings.find(s => s.type === 'file' || s.type === 'file_array');
        
        if (fileField && existingImageUrl) {
          const value = fileField.type === 'file_array' ? [existingImageUrl] : existingImageUrl;
          setFormData({ [fileField.name]: value });
        } else if (existingVideoUrl) {
          const videoField = newModel.settings.find(s => (s.type === 'file' || s.type === 'file_array') && s.name.toLowerCase().includes('video'));
          if (videoField) {
            const value = videoField.type === 'file_array' ? [existingVideoUrl] : existingVideoUrl;
            setFormData({ [videoField.name]: value });
          }
        }
      }
    }
    
    setSelectedModelId(newModelId);
  };

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
          
          // Если это image генерация - редирект на /
          if (!isVideoAction(generation.action)) {
            router.replace(`/?generationId=${generationIdParam}`);
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
    // Только video генерации добавляем в сессионные
    if (action.startsWith('video_')) {
      const newSessionGen: SessionGeneration = {
        id: generation.id,
        status: generation.status || 'processing',
        output_urls: generation.output_urls || null,
        model_name: generation.model_name,
        action: action,
        created_at: generation.created_at || new Date().toISOString(),
      };
      setSessionGenerations(prev => [newSessionGen, ...prev.slice(0, 15)]); // Max 16 in session
    }
    
    // Add to global context for header indicator
    if (generation) {
      addGeneration({
        id: generation.id,
        model_name: generation.model_name,
        action: action,
        status: generation.status,
        created_at: generation.created_at,
        viewed: false,
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
                // Сохраняем model_name - API может его не возвращать
                model_name: data.model_name || gen.model_name,
              });
            }
          }
        } catch (error) {
          console.error('[Session] Poll error for', gen.id, error);
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
    <AppShell>
      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 min-h-0 gap-6 pt-2 px-6">
        {/* LEFT PANEL - Settings (400px fixed) */}
        <div className="w-[400px] flex flex-col shrink-0">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-6">
            <div className="flex flex-col gap-3">
              <div className="animate-fade-in-up animate-delay-100">
                <ActionSelector
                  value={selectedAction}
                  onChange={(action) => {
                    setSelectedAction(action);
                    setSelectedModelId('');
                  }}
                  mode="video"
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

          {selectedModelId && (
            <div className="shrink-0 bg-[#101010] pt-4 pb-6">
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
                    if (!formRef.current || isGenerating) return;
                    setIsGenerating(true);
                    const safetyTimeout = setTimeout(() => setIsGenerating(false), 60000);
                    try {
                      await formRef.current.submit();
                    } catch (error) {
                      console.error('[Video Desktop] Submit error:', error);
                    } finally {
                      clearTimeout(safetyTimeout);
                      setIsGenerating(false);
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

        {/* RIGHT PANEL - Result */}
        <div className="flex-1 min-h-0 flex flex-col pb-6">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-[#050505] rounded-2xl p-6">
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
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-0">
        {/* Show Start Screen on mobile when no model selected and no generation */}
        {showStartScreen ? (
          <MobileStartScreen mode="video" onStartGeneration={() => setMobileShowForm(true)} />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="mb-4">
              <MobileTabSwitcher 
                activeTab={mobileActiveTab}
                onTabChange={setMobileActiveTab}
                label="VIDEO GENERATION"
              />
            </div>

            {/* Content based on active tab */}
            {mobileActiveTab === 'input' ? (
              /* INPUT TAB */
              <div className="flex-1 flex flex-col gap-6 pb-[120px]">
                {/* Action Selector - VIDEO MODE */}
                <div className="animate-fade-in-up">
                  <ActionSelector
                    value={selectedAction}
                    onChange={(action) => {
                      setSelectedAction(action);
                      setSelectedModelId('');
                    }}
                    mode="video"
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
                          console.log('[Video Mobile] Click', { formRef: !!formRef.current, isGenerating });
                          if (!formRef.current) {
                            console.warn('[Video Mobile] formRef.current is null');
                            return;
                          }
                          if (isGenerating) {
                            console.warn('[Video Mobile] Already generating, ignoring click');
                            return;
                          }
                          setIsGenerating(true);
                          // Safety timeout - сбрасываем через 60 сек если что-то пошло не так
                          const safetyTimeout = setTimeout(() => {
                            console.warn('[Video Mobile] Safety timeout triggered');
                            setIsGenerating(false);
                          }, 60000);
                          try {
                            await formRef.current.submit();
                          } catch (error) {
                            console.error('[Video Mobile] Submit error:', error);
                          } finally {
                            clearTimeout(safetyTimeout);
                            setIsGenerating(false);
                            console.log('[Video Mobile] Done');
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
    </AppShell>
  );
}

export default function VideoPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <VideoContent />
    </Suspense>
  );
}
