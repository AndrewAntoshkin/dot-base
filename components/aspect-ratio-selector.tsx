'use client';

import React, { useMemo } from 'react';

interface AspectRatioOption {
  value: string;
  label: string;
}

interface AspectRatioSelectorProps {
  value: string;
  options: AspectRatioOption[];
  onChange: (value: string) => void;
  description?: string;
  defaultLabel?: string;
}

// Парсим соотношение сторон из строки вида "16:9" в числа
function parseAspectRatio(ratio: string): { width: number; height: number } | null {
  // Специальные случаи
  if (ratio === 'match_input_image' || ratio === 'custom' || ratio === 'Not set' || ratio === 'None') {
    return null;
  }
  
  const match = ratio.match(/^(\d+):(\d+)$/);
  if (match) {
    return { width: parseInt(match[1]), height: parseInt(match[2]) };
  }
  
  return null;
}

// Вычисляем размеры превью для заданного соотношения сторон
function getPreviewDimensions(ratio: { width: number; height: number }, containerSize: number): { width: number; height: number } {
  const aspectRatio = ratio.width / ratio.height;
  
  if (aspectRatio >= 1) {
    // Горизонтальный или квадратный
    return {
      width: containerSize,
      height: containerSize / aspectRatio,
    };
  } else {
    // Вертикальный
    return {
      height: containerSize,
      width: containerSize * aspectRatio,
    };
  }
}

export function AspectRatioSelector({
  value,
  options,
  onChange,
  description,
  defaultLabel,
}: AspectRatioSelectorProps) {
  const parsedRatio = parseAspectRatio(value);
  
  // Фильтруем опции - оставляем только те, которые можно визуализировать как форматы
  // Специальные опции (match_input_image, custom) не показываем как чипсы
  const visualOptions = options.filter(opt => parseAspectRatio(opt.value) !== null);
  
  // Размер контейнера для превью (по Figma)
  const containerHeight = 120;
  const maxWidth = 213;
  
  // Получаем все рамки для отображения (для dashed borders)
  const allRatios = useMemo(() => visualOptions.map(opt => {
    const parsed = parseAspectRatio(opt.value);
    if (!parsed) return null;
    return {
      value: opt.value,
      label: opt.label,
      ...getPreviewDimensions(parsed, containerHeight),
    };
  }).filter(Boolean) as { value: string; label: string; width: number; height: number }[], [visualOptions]);

  // Вычисляем размеры для анимированной выбранной рамки
  // Если выбрана специальная опция (match_input_image, custom) - не показываем рамку
  const selectedDimensions = useMemo(() => {
    if (parsedRatio) {
      return getPreviewDimensions(parsedRatio, containerHeight);
    }
    // Для специальных опций не показываем выбранную рамку
    return null;
  }, [parsedRatio]);

  // Получаем label для текущего значения
  const currentLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="flex flex-col gap-2">
      {/* Visual preview container - bg-[#101010] по Figma, py-[32px], gap-[24px] */}
      <div className="bg-[#101010] rounded-[20px] py-8 flex flex-col gap-6 items-center justify-center">
        {/* Aspect ratio preview box */}
        <div 
          className="relative flex items-center justify-center"
          style={{ height: containerHeight, width: maxWidth }}
        >
          {/* Dashed borders для всех возможных форматов (статичные, серые) */}
          {allRatios.map((ratio) => (
            <div
              key={ratio.value}
              className="absolute rounded-[9px] border-[1.5px] border-dashed border-[#353535]"
              style={{
                width: ratio.width,
                height: ratio.height,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
          
          {/* Анимированная выбранная рамка - плавно меняет размер */}
          {/* Показываем только если выбран конкретный формат (не специальная опция) */}
          {selectedDimensions && (
            <div
              className="absolute rounded-[9px] border-[1.5px] border-solid border-white transition-all duration-500 ease-out"
              style={{
                width: selectedDimensions.width,
                height: selectedDimensions.height,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          
          {/* Label в центре */}
          <span className="font-inter text-[14px] text-[#a4a4a4] z-10 pointer-events-none transition-opacity duration-300">
            {parsedRatio ? value : currentLabel}
          </span>
        </div>
        
        {/* Chips row - только конкретные форматы (без специальных опций типа "Как входное изображение") */}
        <div className="flex flex-wrap gap-1 items-center justify-center w-full px-4">
          {/* Только визуальные форматы (1:1, 16:9, 9:16, и т.д.) */}
          {visualOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-3 py-1.5 rounded-[100px] text-[14px] font-inter leading-[20px] transition-all duration-200 ${
                value === option.value
                  ? 'bg-[#1a1a1a] border border-[#f8f8f8] text-white'
                  : 'bg-[#1a1a1a] border border-transparent text-white hover:border-[#555]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Description and default value - outside the dark box */}
      {(description || defaultLabel) && (
        <div className="flex flex-col gap-1.5">
          {description && (
            <p className="font-inter text-[14px] text-[#959595] leading-[20px]">
              {description}
            </p>
          )}
          {defaultLabel && (
            <p className="font-inter font-medium text-[12px] text-[#e0e0e0] leading-[16px]">
              По умолчанию {defaultLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
