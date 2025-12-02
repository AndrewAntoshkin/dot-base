"use client";

import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface TooltipLabelProps {
  label: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  icon?: LucideIcon;
  className?: string;
}

/**
 * TooltipLabel component - показывает тултип при наведении на label
 * Использует CSS вместо портала для избежания гидрации ошибок
 */
export function TooltipLabel({
  label,
  description,
  defaultValue,
  required,
  icon: Icon,
  className = '',
}: TooltipLabelProps) {
  const [isHovered, setIsHovered] = useState(false);
  // Проверяем, есть ли что показывать в тултипе
  const hasTooltip = description || defaultValue;

  // Если нет тултипа, просто рендерим label
  if (!hasTooltip) {
    return (
      <div className={`flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px] ${className}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>
    );
  }

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div
        className={`
          inline-flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]
          cursor-help
          ${className}
        `}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span 
          className={`
            transition-all
            ${isHovered ? 'border-b border-dashed border-[#666666]' : ''}
          `}
        >
          {label}
        </span>
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>

      {/* Tooltip - абсолютно позиционирован относительно контейнера */}
      {isHovered && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 bg-neutral-900 rounded-[16px] p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] w-[280px] animate-in fade-in duration-150 pointer-events-none"
        >
          <div className="flex flex-col gap-1.5">
            {description && (
              <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
                {description}
              </p>
            )}
            {defaultValue && (
              <p className="font-inter font-medium text-[12px] leading-[16px] text-[#e0e0e0]">
                По умолчанию: {defaultValue}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
