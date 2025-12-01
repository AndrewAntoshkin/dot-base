'use client';

import { useEffect, useState, useMemo } from 'react';
// Используем лёгкую версию для селектора (~140 строк вместо 3800+)
import { ActionType, ModelLite, getModelsByActionLite } from '@/lib/models-lite';
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
    <div className="flex flex-col gap-2">
      <label className="font-inter font-medium text-[14px] leading-[20px] text-white tracking-[-0.084px]">
        Модель
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
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

      {currentModel?.description && (
        <p className="font-inter text-[14px] text-[#959595] mt-1">
          {currentModel.description}
        </p>
      )}
    </div>
  );
}

