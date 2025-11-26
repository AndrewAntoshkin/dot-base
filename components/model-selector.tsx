'use client';

import { useEffect, useState } from 'react';
import { ActionType, Model, getModelsByAction } from '@/lib/models-config';
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
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    const availableModels = getModelsByAction(action);
    setModels(availableModels);

    // Reset selection if current model is not in the list
    if (value && !availableModels.find((m) => m.id === value)) {
      onChange('');
    }
  }, [action]);

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
              {model.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value && (
        <p className="font-inter text-[14px] text-[#959595] mt-1">
          {models.find((m) => m.id === value)?.description}
        </p>
      )}
    </div>
  );
}

