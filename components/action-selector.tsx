'use client';

import { ActionType, getActionLabel } from '@/lib/models-lite';
import { Command } from 'lucide-react';

interface ActionSelectorProps {
  value: ActionType;
  onChange: (action: ActionType) => void;
  mode?: 'image' | 'video' | 'analyze';
}

const IMAGE_ACTIONS: ActionType[] = ['create', 'edit', 'upscale', 'remove_bg'];
const VIDEO_ACTIONS: ActionType[] = ['video_create', 'video_edit', 'video_i2v', 'video_upscale'];
const ANALYZE_ACTIONS: ActionType[] = ['analyze_describe', 'analyze_ocr', 'analyze_prompt'];

export function ActionSelector({ value, onChange, mode = 'image' }: ActionSelectorProps) {
  const actions = mode === 'video' ? VIDEO_ACTIONS : mode === 'analyze' ? ANALYZE_ACTIONS : IMAGE_ACTIONS;

  // Разбиваем на 2 ряда по 2 кнопки
  const row1 = actions.slice(0, 2);
  const row2 = actions.slice(2, 4);

  return (
    <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
      {/* Label - 10px uppercase with icon */}
      <label className="flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]">
        <Command className="w-3 h-3" />
        Действие
      </label>
      
      {/* Action buttons grid */}
      <div className="flex flex-col gap-2">
        {/* Row 1 */}
        <div className="flex gap-2">
          {row1.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onChange(action)}
              className={`
                flex-1 h-[56px] px-6 py-2 rounded-[16px] 
                font-inter text-[13px] leading-[18px] text-center text-white
                transition-all bg-neutral-900
                ${value === action 
                  ? 'border border-white' 
                  : 'border border-transparent hover:border-[#404040]'
                }`}
            >
              {getActionLabel(action)}
            </button>
          ))}
        </div>
        
        {/* Row 2 */}
        {row2.length > 0 && (
          <div className="flex gap-2">
            {row2.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onChange(action)}
                className={`
                  flex-1 h-[56px] px-6 py-2 rounded-[16px] 
                  font-inter text-[13px] leading-[18px] text-center text-white
                  transition-all bg-neutral-900
                  ${value === action 
                    ? 'border border-white' 
                    : 'border border-transparent hover:border-[#404040]'
                  }`}
              >
                {getActionLabel(action)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
