'use client';

import { useState, useRef, Suspense, useEffect, lazy } from 'react';
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

// Ленивая загрузка тяжёлых компонентов
const SettingsForm = lazy(() =>
  import('@/components/settings-form').then((m) => ({ default: m.SettingsForm }))
);
const TextOutputPanel = lazy(() =>
  import('@/components/text-output-panel').then((m) => ({ default: m.TextOutputPanel }))
);

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generationIdParam = searchParams.get('generationId');
  const startParam = searchParams.get('start');
  
  const [selectedAction, setSelectedAction] = useState<ActionType>('analyze_describe');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [mobileShowForm, setMobileShowForm] = useState(false);
  const { addGeneration } = useGenerations();
  const { selectedWorkspaceId } = useUser();
  
  const formRef = useRef<SettingsFormRef | null>(null);

  // Check URL param to show form
  useEffect(() => {
    if (startParam === '1') {
      setMobileShowForm(true);
      router.replace('/analyze', { scroll: false });
    }
  }, [startParam, router]);

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
  }, [generationIdParam]);

  const handleGenerationCreated = (generationId: string, generation: any) => {
    setCurrentGenerationId(generationId);
    setMobileActiveTab('output');
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

  const handleRegenerate = async (prompt: string, settings: Record<string, any>, modelId: string) => {
    setSelectedModelId(modelId);
    setFormData({ ...settings, prompt });
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
        
        addGeneration({
          id: result.id,
          model_name: model.name,
          action: model.action,
          status: result.status || 'processing',
          created_at: result.created_at || new Date().toISOString(),
          viewed: false,
        });
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
      {/* Desktop Layout - Independent scroll for each column */}
      <main className="hidden lg:flex flex-1 min-h-0 gap-6">
        {/* LEFT PANEL - INPUT (480px fixed) */}
        <div className="w-[480px] flex flex-col pl-6 pr-0">
          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-8 pr-4">
            {/* Header */}
            <div className="mb-6 shrink-0 animate-fade-in-up">
              <h2 className="font-inter font-medium text-sm text-[#959595] uppercase tracking-wide">
                INPUT
              </h2>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-6">
              {/* Action Selector */}
              <div className="animate-fade-in-up animate-delay-100">
                <ActionSelector
                  value={selectedAction}
                  onChange={(action) => {
                    setSelectedAction(action);
                    setSelectedModelId('');
                  }}
                  mode="analyze"
                />
              </div>

              {/* Model Selector */}
              <div className="animate-fade-in-up animate-delay-200">
                <ModelSelector
                  action={selectedAction}
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                />
              </div>

              {/* Settings Form */}
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

          {/* Fixed buttons at bottom (outside scroll area) */}
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
                    console.log('[Analyze Desktop] Click', { formRef: !!formRef.current, isGenerating });
                    if (!formRef.current) {
                      console.warn('[Analyze Desktop] formRef.current is null');
                      return;
                    }
                    if (isGenerating) {
                      console.warn('[Analyze Desktop] Already generating, ignoring click');
                      return;
                    }
                    setIsGenerating(true);
                    // Safety timeout - сбрасываем через 60 сек если что-то пошло не так
                    const safetyTimeout = setTimeout(() => {
                      console.warn('[Analyze Desktop] Safety timeout triggered');
                      setIsGenerating(false);
                    }, 60000);
                    try {
                      await formRef.current.submit();
                    } finally {
                      clearTimeout(safetyTimeout);
                      setIsGenerating(false);
                      console.log('[Analyze Desktop] Done');
                    }
                  }}
                  disabled={isGenerating}
                  className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Анализ...' : 'Анализировать'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIVIDER */}
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

          <div className="animate-fade-in-up animate-delay-200">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px] text-[#959595]">
                  Загрузка результатов...
                </div>
              }
            >
              <TextOutputPanel
                generationId={currentGenerationId}
                onRegenerate={handleRegenerate}
              />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Mobile Layout */}
      <main className="flex lg:hidden flex-1 flex-col p-4 pb-0">
        {showStartScreen ? (
          <MobileStartScreen mode="analyze" onStartGeneration={() => setMobileShowForm(true)} />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="mb-4">
              <MobileTabSwitcher 
                activeTab={mobileActiveTab}
                onTabChange={setMobileActiveTab}
                label="IMAGE ANALYSIS"
              />
            </div>

            {mobileActiveTab === 'input' ? (
              <div className="flex-1 flex flex-col gap-6 pb-[120px]">
                <div className="animate-fade-in-up">
                  <ActionSelector
                    value={selectedAction}
                    onChange={(action) => {
                      setSelectedAction(action);
                      setSelectedModelId('');
                    }}
                    mode="analyze"
                  />
                </div>

                <div className="animate-fade-in-up animate-delay-100">
                  <ModelSelector
                    action={selectedAction}
                    value={selectedModelId}
                    onChange={setSelectedModelId}
                  />
                </div>

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
                          console.log('[Analyze Mobile] Click', { formRef: !!formRef.current, isGenerating });
                          if (!formRef.current) {
                            console.warn('[Analyze Mobile] formRef.current is null');
                            return;
                          }
                          if (isGenerating) {
                            console.warn('[Analyze Mobile] Already generating, ignoring click');
                            return;
                          }
                          setIsGenerating(true);
                          // Safety timeout - сбрасываем через 60 сек если что-то пошло не так
                          const safetyTimeout = setTimeout(() => {
                            console.warn('[Analyze Mobile] Safety timeout triggered');
                            setIsGenerating(false);
                          }, 60000);
                          try {
                            await formRef.current.submit();
                          } finally {
                            clearTimeout(safetyTimeout);
                            setIsGenerating(false);
                            console.log('[Analyze Mobile] Done');
                          }
                        }}
                        disabled={isGenerating}
                        className="flex-1 h-10 px-4 rounded-xl bg-white font-inter font-medium text-sm text-black tracking-[-0.084px] hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? 'Анализ...' : 'Анализировать'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col pb-10">
                <div className="animate-fade-in-up">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center min-h-[200px] text-[#959595]">
                        Загрузка результатов...
                      </div>
                    }
                  >
                    <TextOutputPanel
                      generationId={currentGenerationId}
                      onRegenerate={handleRegenerate}
                      isMobile={true}
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

export default function AnalyzePageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}

