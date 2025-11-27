'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActionSelector } from '@/components/action-selector';
import { ModelSelector } from '@/components/model-selector';
import { SettingsForm } from '@/components/settings-form';
import { OutputPanel } from '@/components/output-panel';
import { Header } from '@/components/header';
import { ActionType, getModelById } from '@/lib/models-config';
import { useGenerations } from '@/contexts/generations-context';

function HomeContent() {
  const searchParams = useSearchParams();
  const generationIdParam = searchParams.get('generationId');
  
  const [selectedAction, setSelectedAction] = useState<ActionType>('create');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { addGeneration } = useGenerations();

  // Load generation from URL parameter
  useEffect(() => {
    if (!generationIdParam) return;

    const loadGeneration = async () => {
      try {
        const response = await fetch(`/api/generations/${generationIdParam}`);
        if (response.ok) {
          const generation = await response.json();
          
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
        }
      } catch (error) {
        console.error('Error loading generation:', error);
      }
    };

    loadGeneration();
  }, [generationIdParam]);

  const handleGenerationCreated = (generationId: string, generation: any) => {
    setCurrentGenerationId(generationId);
    // Add to global context for header indicator
    if (generation) {
      addGeneration({
        id: generation.id,
        model_name: generation.model_name,
        status: generation.status,
        created_at: generation.created_at,
        viewed: false, // Новая генерация всегда непросмотренная
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
          model_name: result.model_name,
          status: result.status,
          created_at: result.created_at,
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

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <Header />

      <main className="flex-1 flex gap-6">
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
                    if (typeof window !== 'undefined' && (window as any).__settingsFormReset) {
                      (window as any).__settingsFormReset();
                    }
                  }}
                  disabled={isGenerating}
                  className="h-10 px-4 rounded-xl border border-[#2f2f2f] font-inter font-medium text-sm text-white tracking-[-0.084px] hover:bg-[#1f1f1f] transition-colors disabled:opacity-50"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window !== 'undefined' && (window as any).__settingsFormSubmit) {
                      setIsGenerating(true);
                      await (window as any).__settingsFormSubmit();
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
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-white">Загрузка...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

