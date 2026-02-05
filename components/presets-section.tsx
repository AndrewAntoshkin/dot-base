'use client';

import { useState, useMemo, useRef } from 'react';
import { ChevronDown, ChevronRight, Video } from 'lucide-react';
import { TooltipLabel } from '@/components/ui/tooltip-label';
import { createPortal } from 'react-dom';
import { 
  getPresetsForModel, 
  getPresetCategories, 
  applyPreset,
  Preset,
} from '@/lib/presets-config';

interface PresetsSectionProps {
  modelId: string;
  formData: Record<string, any>;
  onApplyPreset: (updatedFormData: Record<string, any>) => void;
}

interface PresetButtonProps {
  preset: Preset;
  isActive: boolean;
  onClick: () => void;
}

function PresetButton({ preset, isActive, onClick }: PresetButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (buttonRef.current && preset.description) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          px-3 py-1.5 rounded-[8px] text-[13px] font-inter transition-all
          ${isActive
            ? 'bg-white text-black font-medium'
            : 'bg-[#1a1a1a] text-[#959595] hover:bg-[#252525] hover:text-white'
          }
        `}
      >
        {preset.label}
      </button>
      {/* Tooltip через portal - рендерится в body */}
      {isHovered && preset.description && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-50%)',
            zIndex: 9999,
          }}
          className="px-3 py-2 bg-neutral-900 rounded-lg shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] w-[280px] pointer-events-none animate-in fade-in duration-150"
        >
          {/* Arrow слева */}
          <div 
            className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-neutral-900 rotate-45"
          />
          <p className="text-[13px] text-[#e0e0e0] leading-relaxed relative z-10">
            {preset.description}
          </p>
        </div>,
        document.body
      )}
    </>
  );
}

export function PresetsSection({ modelId, formData, onApplyPreset }: PresetsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Получаем категории пресетов для текущей модели
  const categories = useMemo(() => getPresetCategories(modelId), [modelId]);
  const config = useMemo(() => getPresetsForModel(modelId), [modelId]);

  // Если модель не поддерживает пресеты - не показываем секцию
  if (!config || categories.length === 0) {
    return null;
  }

  const handlePresetClick = (preset: Preset) => {
    const updatedData = applyPreset(modelId, preset, formData);
    onApplyPreset(updatedData);
  };

  // Определяем текущий активный пресет по motion параметру из formData
  // Это работает и когда motion выбран через пресет, и когда через обычный select
  const currentMotion = formData.motion;
  const allPresets = categories.flatMap(c => c.presets);
  const effectiveActivePreset = currentMotion 
    ? allPresets.find(p => p.motion === currentMotion)?.id 
    : null;

  return (
    <div className="border border-[#252525] rounded-[16px] p-4 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TooltipLabel
            label="Движение камеры"
            description="Выберите тип движения камеры для анимации"
            icon={Video}
          />
          {effectiveActivePreset && (
            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] text-[#959595]">
              {allPresets.find(p => p.id === effectiveActivePreset)?.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 -m-1 rounded hover:bg-white/10 transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[#959595]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#959595]" />
          )}
        </button>
      </div>

      {/* Content - пресеты */}
      {isOpen && (
        <div className="pt-2">
          {/* Все пресеты в одном блоке */}
          <div className="flex flex-wrap gap-2">
            {allPresets.map((preset) => (
              <PresetButton
                key={preset.id}
                preset={preset}
                isActive={effectiveActivePreset === preset.id}
                onClick={() => handlePresetClick(preset)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
