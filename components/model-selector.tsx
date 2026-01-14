'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionType, getModelsByActionLite, ModelLite } from '@/lib/models-lite';
import { MobileSelect, SelectOption } from '@/components/ui/mobile-select';
import { useUser } from '@/contexts/user-context';
import { AlignRight } from 'lucide-react';

interface UserLora {
  id: string;
  name: string;
  description: string | null;
  trigger_word: string | null;
  lora_url: string | null;
  replicate_model_url: string | null;
  status: string;
}

interface ModelSelectorProps {
  action: ActionType;
  value: string;
  onChange: (modelId: string) => void;
  onLoraSelect?: (lora: UserLora | null) => void;
}

// HOT иконка молнии
const LightningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.83333 1.33334L2.5 9.33334H8L7.16667 14.6667L13.5 6.66668H8L8.83333 1.33334Z" fill="#FFD700" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// LoRA иконка звезды
const LoraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L9.79611 5.52786H14.6085L10.6062 8.44427L12.4023 12.9721L8 10.0557L3.59772 12.9721L5.39383 8.44427L1.39155 5.52786H6.20389L8 1Z" fill="#A855F7" stroke="#A855F7" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

export function ModelSelector({ action, value, onChange, onLoraSelect }: ModelSelectorProps) {
  const { isAdmin } = useUser();
  const [userLoras, setUserLoras] = useState<UserLora[]>([]);
  const [lorasLoaded, setLorasLoaded] = useState(false);

  // Загружаем пользовательские LoRA при action === 'create' (только для админов)
  useEffect(() => {
    if (action === 'create' && !lorasLoaded && isAdmin) {
      fetch('/api/loras')
        .then(res => res.json())
        .then(data => {
          if (data.loras) {
            // Фильтруем только готовые LoRA
            const completedLoras = data.loras.filter((l: UserLora) => l.status === 'completed');
            setUserLoras(completedLoras);
          }
          setLorasLoaded(true);
        })
        .catch(() => {
          setLorasLoaded(true);
        });
    }
  }, [action, lorasLoaded, isAdmin]);

  // Мемоизируем список моделей - пересчитывается только при смене action
  // Фильтруем flux-dev-lora для неадминов
  const models = useMemo(() => {
    const allModels = getModelsByActionLite(action);
    if (!isAdmin) {
      return allModels.filter(m => m.id !== 'flux-dev-lora');
    }
    return allModels;
  }, [action, isAdmin]);

  // Создаем комбинированный список моделей + LoRA (только для админов)
  const allModels = useMemo((): ModelLite[] => {
    if (action !== 'create' || userLoras.length === 0 || !isAdmin) {
      return models;
    }

    // Добавляем пользовательские LoRA как "модели"
    const loraModels: ModelLite[] = userLoras.map(lora => ({
      id: `lora:${lora.id}`,
      displayName: `🎨 ${lora.name}`,
      description: lora.description || `LoRA: ${lora.trigger_word || 'без trigger word'}`,
      action: 'create',
    }));

    // Вставляем LoRA после flux-dev-lora
    const fluxLoraIndex = models.findIndex(m => m.id === 'flux-dev-lora');
    if (fluxLoraIndex >= 0) {
      return [
        ...models.slice(0, fluxLoraIndex + 1),
        ...loraModels,
        ...models.slice(fluxLoraIndex + 1),
      ];
    }

    return [...loraModels, ...models];
  }, [action, models, userLoras]);

  // Преобразуем модели в опции для MobileSelect
  const selectOptions: SelectOption[] = useMemo(() => {
    return allModels.map((model) => ({
      value: model.id,
      label: model.displayName,
      badge: model.id === 'nano-banana-pro' ? {
        text: 'HOT',
        icon: <LightningIcon />,
        className: 'bg-[#573417]',
      } : model.id.startsWith('lora:') ? {
        text: 'LORA',
        icon: <LoraIcon />,
        className: 'bg-[#7C3AED]/30',
      } : model.id === 'flux-dev-lora' ? {
        text: 'LoRA',
        icon: <LoraIcon />,
        className: 'bg-[#7C3AED]/30',
      } : undefined,
    }));
  }, [allModels]);

  // Track previous action to detect USER-initiated action changes
  const prevActionRef = useRef(action);
  
  useEffect(() => {
    const prevAction = prevActionRef.current;
    prevActionRef.current = action;
    
    // Only reset model if:
    // 1. Action explicitly changed (user clicked different action)
    // 2. Current value is not in the new action's models
    // 3. Value is not empty (nothing to reset)
    if (prevAction !== action && value && !allModels.find((m) => m.id === value)) {
      onChange('');
    }
  }, [action, allModels, value, onChange]);

  // Обработка выбора модели
  const handleChange = (modelId: string) => {
    onChange(modelId);
    
    // Если выбрана пользовательская LoRA - передаем данные
    if (modelId.startsWith('lora:') && onLoraSelect) {
      const loraId = modelId.replace('lora:', '');
      const lora = userLoras.find(l => l.id === loraId);
      onLoraSelect(lora || null);
    } else if (onLoraSelect) {
      onLoraSelect(null);
    }
  };

  // Находим текущую модель для описания
  const currentModel = value ? allModels.find((m) => m.id === value) : null;

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
        onValueChange={handleChange}
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
