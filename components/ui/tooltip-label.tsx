"use client";

import React, { useState, useRef, useEffect } from 'react';
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
 * Автоматически позиционируется сверху или снизу в зависимости от места на экране
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
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');
  const triggerRef = useRef<HTMLDivElement>(null);
  
  // Проверяем, есть ли что показывать в тултипе
  const hasTooltip = description || defaultValue;

  // Вычисляем позицию тултипа при наведении
  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = 120; // Примерная высота тултипа
      const spaceAbove = triggerRect.top;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      
      // Показываем сверху, если снизу мало места и сверху больше
      if (spaceBelow < tooltipHeight + 20 && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isHovered]);

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
    <div 
      ref={triggerRef}
      className="relative inline-block" 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
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

      {/* Tooltip - позиционируется сверху или снизу */}
      {isHovered && (
        <div
          className={`
            absolute left-0 z-50 bg-neutral-900 rounded-[16px] p-4 
            shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] w-[280px] 
            animate-in fade-in duration-150 pointer-events-none
            ${position === 'top' 
              ? 'bottom-full mb-2' 
              : 'top-full mt-2'
            }
          `}
        >
          {/* Arrow */}
          <div 
            className={`
              absolute left-4 w-3 h-3 bg-neutral-900 rotate-45
              ${position === 'top' 
                ? 'bottom-[-6px]' 
                : 'top-[-6px]'
              }
            `}
          />
          
          <div className="flex flex-col gap-1.5 relative z-10">
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
