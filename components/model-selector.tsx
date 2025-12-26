'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ActionType, getModelsByActionLite } from '@/lib/models-lite';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { AlignRight } from 'lucide-react';

interface ModelSelectorProps {
  action: ActionType;
  value: string;
  onChange: (modelId: string) => void;
}

// HOT иконка молнии
const LightningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.83333 1.33334L2.5 9.33334H8L7.16667 14.6667L13.5 6.66668H8L8.83333 1.33334Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function ModelSelector({ action, value, onChange }: ModelSelectorProps) {
  // Мемоизируем список моделей - пересчитывается только при смене action
  const models = useMemo(() => getModelsByActionLite(action), [action]);

  // Преобразуем модели в опции для MobileSelect
  const selectOptions: SelectOption[] = useMemo(() => {
    return models.map((model) => ({
      value: model.id,
      label: model.displayName,
      badge: model.id === 'nano-banana-pro' ? {
        text: 'HOT',
        icon: <LightningIcon />,
        className: 'bg-[#573417]',
      } : undefined,
    }));
  }, [models]);

  // Track previous action to detect USER-initiated action changes
  const prevActionRef = useRef(action);
  
  useEffect(() => {
    const prevAction = prevActionRef.current;
    prevActionRef.current = action;
    
    // Only reset model if:
    // 1. Action explicitly changed (user clicked different action)
    // 2. Current value is not in the new action's models
    // 3. Value is not empty (nothing to reset)
    if (prevAction !== action && value && !models.find((m) => m.id === value)) {
      onChange('');
    }
  }, [action, models, value, onChange]);

  // Находим текущую модель для описания
  const currentModel = value ? models.find((m) => m.id === value) : null;

  return (
    <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
      {/* Label */}
      <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
        <AlignRight className="w-3 h-3" />
        Модель
      </label>
      
      {/* MobileSelect */}
      <MobileSelect
        value={value}
        onValueChange={onChange}
        options={selectOptions}
        placeholder="Выбрать из списка"
        title="Модель"
      />

      {/* Model description */}
      {currentModel?.description && (
        <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
          {currentModel.description}
        </p>
      )}
    </div>
  );
}
