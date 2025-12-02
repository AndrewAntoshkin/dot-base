'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

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
 * 
 * Дизайн:
 * - При наведении появляется пунктирное подчёркивание
 * - Справа от label появляется тултип с описанием (отступ 12px)
 * - Тултип центрирован по вертикали относительно label
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
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);

  // Проверяем, есть ли что показывать в тултипе
  const hasTooltip = description || defaultValue;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Вычисляем позицию тултипа при hover
  useEffect(() => {
    if (isHovered && labelRef.current) {
      const rect = labelRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      const windowWidth = window.innerWidth;
      
      let left = rect.right + 12; // 12px отступ от конца заголовка
      
      // Если не помещается справа - показываем слева
      if (left + tooltipWidth > windowWidth - 20) {
        left = rect.left - tooltipWidth - 12;
      }
      
      setTooltipPos({
        top: rect.top + rect.height / 2, // Центр label по вертикали
        left: left,
      });
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
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          inline-flex items-center gap-1 font-inter font-medium text-[10px] leading-[14px] text-[#959595] uppercase tracking-[0.15px]
          cursor-help
          ${className}
        `}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span 
          ref={labelRef}
          className={`
            transition-all
            ${isHovered ? 'border-b border-dashed border-[#666666]' : ''}
          `}
        >
          {label}
        </span>
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>

      {/* Tooltip - через portal, позиционирован справа от label */}
      {mounted && isHovered && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${tooltipPos.top}px`,
            left: `${tooltipPos.left}px`,
            transform: 'translateY(-50%)',
            zIndex: 9999,
          }}
          className="bg-neutral-900 rounded-[16px] p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] w-[280px] animate-in fade-in duration-150 pointer-events-none"
        >
          <div className="flex flex-col gap-1.5">
            {description && (
              <p className="font-inter text-[14px] leading-[20px] text-[#959595]">
                {description}
              </p>
            )}
            {defaultValue && (
              <p className="font-inter font-medium text-[12px] leading-[16px] text-[#e0e0e0]">
                По умолчанию {defaultValue}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
