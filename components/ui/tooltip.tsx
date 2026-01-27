"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

/**
 * Tooltip component - показывает подсказку при наведении
 */
export function Tooltip({
  text,
  children,
  position = 'bottom',
  delay = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate position to keep tooltip in viewport
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const padding = 8;

      let newPosition = position;

      // Check if tooltip goes outside viewport
      if (position === 'bottom' && triggerRect.bottom + tooltipRect.height + padding > window.innerHeight) {
        newPosition = 'top';
      } else if (position === 'top' && triggerRect.top - tooltipRect.height - padding < 0) {
        newPosition = 'bottom';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width + padding > window.innerWidth) {
        newPosition = 'left';
      } else if (position === 'left' && triggerRect.left - tooltipRect.width - padding < 0) {
        newPosition = 'right';
      }

      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-[60] px-3 py-2 rounded-lg',
            'bg-[#212121] text-white text-xs whitespace-nowrap',
            'shadow-[0px_4px_12px_0px_rgba(0,0,0,0.5)]',
            'animate-in fade-in zoom-in-95 duration-150',
            'pointer-events-none',
            positionClasses[actualPosition]
          )}
        >
          {text}
        </div>
      )}
    </div>
  );
}
