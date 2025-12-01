'use client';

import { useEffect, useMemo } from 'react';
// Используем лёгкую версию для селектора (~140 строк вместо 3800+)
import { ActionType, getModelsByActionLite } from '@/lib/models-lite';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModelSelectorProps {
  action: ActionType;
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ action, value, onChange }: ModelSelectorProps) {
  // Мемоизируем список моделей - пересчитывается только при смене action
  const models = useMemo(() => getModelsByActionLite(action), [action]);

  useEffect(() => {
    // Reset selection if current model is not in the list
    if (value && !models.find((m) => m.id === value)) {
      onChange('');
    }
  }, [action, models, value, onChange]);

  // Находим текущую модель для описания
  const currentModel = value ? models.find((m) => m.id === value) : null;

  return (
    <div className="bg-[#1a1a1a] rounded-[16px] p-4 flex flex-col gap-2">
      {/* Label - 10px uppercase */}
      <label className="font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
        Модель
      </label>
      
      {/* Select field with dark inner background */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-[#101010] border-0 h-12 rounded-[8px] pl-3 pr-2">
          <SelectValue placeholder="Выбрать из списка" />
        </SelectTrigger>
        <SelectContent className="bg-[#101010] border-[#2f2f2f]">
          {models.map((model) => (
            <SelectItem 
              key={model.id} 
              value={model.id}
              className="font-inter text-[14px] text-white focus:bg-[#1f1f1f]"
            >
              <span className="flex items-center gap-2">
                {model.displayName}
                {model.id === 'nano-banana-pro' && (
                  <span className="bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    HOT 🔥
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Model description outside card or inside - keep inside for consistency */}
      {currentModel?.description && (
        <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
          {currentModel.description}
        </p>
      )}
    </div>
  );
}
