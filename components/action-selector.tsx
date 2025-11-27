'use client';

import { ActionType, getActionLabel } from '@/lib/models-config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActionSelectorProps {
  value: ActionType;
  onChange: (action: ActionType) => void;
  mode?: 'image' | 'video';
}

const IMAGE_ACTIONS: ActionType[] = ['create', 'edit', 'upscale', 'remove_bg'];
const VIDEO_ACTIONS: ActionType[] = ['video_create', 'video_i2v', 'video_edit', 'video_upscale'];

export function ActionSelector({ value, onChange, mode = 'image' }: ActionSelectorProps) {
  const actions = mode === 'video' ? VIDEO_ACTIONS : IMAGE_ACTIONS;

  return (
    <div className="flex flex-col gap-2">
      <label className="font-inter font-medium text-[14px] leading-[20px] text-white tracking-[-0.084px]">
        Действие
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as ActionType)}>
        <SelectTrigger>
          <SelectValue placeholder="Выбрать из списка" />
        </SelectTrigger>
        <SelectContent className="bg-[#101010] border-[#2f2f2f]">
          {actions.map((action) => (
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
  );
}

