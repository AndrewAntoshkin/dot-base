'use client';

import { ActionType, getActionLabel } from '@/lib/models-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';

interface ActionSelectorProps {
  value: ActionType;
  onChange: (action: ActionType) => void;
}

type MediaMode = 'image' | 'video';

const IMAGE_ACTIONS: ActionType[] = ['create', 'edit', 'upscale', 'remove_bg'];
const VIDEO_ACTIONS: ActionType[] = ['video_create', 'video_i2v', 'video_edit', 'video_upscale'];

export function ActionSelector({ value, onChange }: ActionSelectorProps) {
  // Определяем текущий режим по значению
  const isVideoAction = value.startsWith('video_');
  const [mode, setMode] = useState<MediaMode>(isVideoAction ? 'video' : 'image');

  // Синхронизируем mode с value при изменении извне
  useEffect(() => {
    const newMode = value.startsWith('video_') ? 'video' : 'image';
    if (newMode !== mode) {
      setMode(newMode);
    }
  }, [value, mode]);

  const handleModeChange = (newMode: MediaMode) => {
    setMode(newMode);
    // При переключении режима выбираем первое действие
    if (newMode === 'image' && mode !== 'image') {
      onChange('create');
    } else if (newMode === 'video' && mode !== 'video') {
      onChange('video_create');
    }
  };

  const currentActions = mode === 'image' ? IMAGE_ACTIONS : VIDEO_ACTIONS;

  return (
    <div className="flex flex-col gap-3">
      {/* Переключатель Image/Video */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('image')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'image'
              ? 'bg-white text-black'
              : 'bg-[#1f1f1f] text-gray-400 hover:bg-[#2f2f2f] hover:text-white'
          }`}
        >
          🖼️ Image
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('video')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === 'video'
              ? 'bg-white text-black'
              : 'bg-[#1f1f1f] text-gray-400 hover:bg-[#2f2f2f] hover:text-white'
          }`}
        >
          🎬 Video
        </button>
      </div>

      {/* Селектор действия */}
      <div className="flex flex-col gap-2">
        <label className="font-inter font-medium text-[14px] leading-[20px] text-white tracking-[-0.084px]">
          Действие
        </label>
        <Select value={value} onValueChange={(v) => onChange(v as ActionType)}>
          <SelectTrigger>
            <SelectValue placeholder="Выбрать из списка" />
          </SelectTrigger>
          <SelectContent className="bg-[#101010] border-[#2f2f2f]">
            {currentActions.map((action) => (
              <SelectItem 
                key={action} 
                value={action}
                className="font-inter text-[14px] text-white focus:bg-[#1f1f1f]"
              >
                {getActionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

