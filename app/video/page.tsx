'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActionSelector } from '@/components/action-selector';
import { ModelSelector } from '@/components/model-selector';
import { SettingsForm, SettingsFormRef } from '@/components/settings-form';
import { OutputPanel } from '@/components/output-panel';
import { Header } from '@/components/header';
import { MobileTabSwitcher } from '@/components/mobile-tab-switcher';
import { MobileStartScreen } from '@/components/mobile-start-screen';
import { ActionType, getModelById } from '@/lib/models-config';
import { useGenerations } from '@/contexts/generations-context';

// Проверка, является ли action видео действием
const isVideoAction = (action: string): boolean => {
  return action.startsWith('video_');
};

function VideoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generationIdParam = searchParams.get('generationId');
  const startParam = searchParams.get('start');
  
  // Видео режим - начинаем с video_create
  const [selectedAction, setSelectedAction] = useState<ActionType>('video_create');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [mobileActiveTab, setMobileActiveTab] = useState<'input' | 'output'>('input');
  const [mobileShowForm, setMobileShowForm] = useState(false);
  const { addGeneration } = useGenerations();
  
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

  // Load generation from URL parameter
  useEffect(() => {
    if (!generationIdParam) return;

    const loadGeneration = async () => {
      try {
        const response = await fetch(`/api/generations/${generationIdParam}`);
        if (response.ok) {
          const generation = await response.json();
          
          // Если это image генерация - редирект на /
          if (!isVideoAction(generation.action)) {
            router.replace(`/?generationId=${generationIdParam}`);
            return;
          }
          
          // Set action and model
          setSelectedAction(generation.action);
          setSelectedModelId(generation.model_id);
          
          // Fill form with generation data
          setFormData({
            prompt: generation.prompt,
            ...generation.settings,
          });
          
          // Show result in output panel
          setCurrentGenerationId(generation.id);
          // Switch to output tab on mobile
          setMobileActiveTab('output');
        }
      } catch (error) {
        console.error('Error loading generation:', error);
      }
    };

    loadGeneration();
  }, [generationIdParam, router]);

  const handleGenerationCreated = (generationId: string, generation: any) => {
    setCurrentGenerationId(generationId);
    // Switch to output tab on mobile when generation starts
    setMobileActiveTab('output');
    // Add to global context for header indicator
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
    // Set the form data from previous generation
    setSelectedModelId(modelId);
    setFormData({ ...settings, prompt });
    
    // Automatically start regeneration
    setIsGenerating(true);
    
    try {
      // Get the model info
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

  // Check if we should show start screen (no model selected and no generation, and not explicitly showing form)
  const showStartScreen = !selectedModelId && !currentGenerationId && !mobileShowForm;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
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

            {/* Form fields */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Action Selector - VIDEO MODE */}
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

              {/* Model Selector */}
              <div className="animate-fade-in-up animate-delay-200">
                <ModelSelector
                  action={selectedAction}
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                />
              </div>

              {/* Settings Form - только поля, без кнопок */}
              {selectedModelId && (
                <div className="animate-fade-in-up animate-delay-300">
                  <SettingsForm
                    modelId={selectedModelId}
                    onGenerationCreated={handleGenerationCreated}
                    onFormDataChange={setFormData}
                    onSubmitStart={() => setIsGenerating(true)}
                    onError={() => setIsGenerating(false)}
                    initialData={formData}
                    formRef={formRef}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sticky buttons at bottom of left panel (внутри формы) */}
          {selectedModelId && (
            <div className="sticky bottom-0 bg-[#050505] pt-4 pb-8 border-t border-[#1f1f1f] z-10">
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
                      await formRef.current.submit();
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
            <OutputPanel 
              generationId={currentGenerationId} 
              onRegenerate={handleRegenerate}
            />
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
                    onChange={setSelectedModelId}
                  />
                </div>

                {/* Settings Form */}
                {selectedModelId && (
                  <div className="animate-fade-in-up animate-delay-200">
                    <SettingsForm
                      modelId={selectedModelId}
                      onGenerationCreated={handleGenerationCreated}
                      onFormDataChange={setFormData}
                      onSubmitStart={() => setIsGenerating(true)}
                      onError={() => setIsGenerating(false)}
                      initialData={formData}
                      formRef={formRef}
                    />
                  </div>
                )}

                {/* Sticky buttons - Mobile */}
                {selectedModelId && (
                  <div className="fixed bottom-0 left-0 right-0 bg-[#050505] pt-4 pb-8 px-4 border-t border-[#1f1f1f] z-10">
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
                            await formRef.current.submit();
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
            ) : (
              /* OUTPUT TAB */
              <div className="flex-1 flex flex-col pb-10">
                <div className="animate-fade-in-up">
                  <OutputPanel 
                    generationId={currentGenerationId} 
                    onRegenerate={handleRegenerate}
                    isMobile={true}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <VideoContent />
    </Suspense>
  );
}
