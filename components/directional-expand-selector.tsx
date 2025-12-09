'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Move } from 'lucide-react';

export type ExpandDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' | 'all';

interface DirectionalExpandSelectorProps {
  value?: ExpandDirection;
  onChange: (direction: ExpandDirection) => void;
  expandAmount?: number; // Percentage (0-100)
  onExpandAmountChange?: (amount: number) => void;
  imageWidth?: number;
  imageHeight?: number;
  imageUrl?: string | null; // URL of the image to display
}

export function DirectionalExpandSelector({
  value = 'all',
  onChange,
  expandAmount = 20,
  onExpandAmountChange,
  imageWidth,
  imageHeight,
  imageUrl,
}: DirectionalExpandSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const currentExpandRef = useRef({ up: 0, down: 0, left: 0, right: 0 });
  const [currentExpand, setCurrentExpand] = useState({ up: 0, down: 0, left: 0, right: 0 });
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialExpandAmountRef = useRef(expandAmount);
  const initialValueRef = useRef(value);

  // Отладка для проверки передачи изображения
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DirectionalExpandSelector] imageUrl:', imageUrl ? `${imageUrl.substring(0, 50)}...` : 'null/undefined');
      console.log('[DirectionalExpandSelector] imageWidth:', imageWidth, 'imageHeight:', imageHeight);
    }
  }, [imageUrl, imageWidth, imageHeight]);

  // Calculate expand amounts from direction
  const getExpandFromDirection = useCallback((direction: ExpandDirection, amount: number) => {
    switch (direction) {
      case 'up':
        return { up: amount, down: 0, left: 0, right: 0 };
      case 'down':
        return { up: 0, down: amount, left: 0, right: 0 };
      case 'left':
        return { up: 0, down: 0, left: amount, right: 0 };
      case 'right':
        return { up: 0, down: 0, left: 0, right: amount };
      case 'up-left':
        return { up: amount, down: 0, left: amount, right: 0 };
      case 'up-right':
        return { up: amount, down: 0, left: 0, right: amount };
      case 'down-left':
        return { up: 0, down: amount, left: amount, right: 0 };
      case 'down-right':
        return { up: 0, down: amount, left: 0, right: amount };
      case 'all':
        return { up: amount, down: amount, left: amount, right: amount };
      default:
        return { up: 0, down: 0, left: 0, right: 0 };
    }
  }, []);

  // Update current expand from value and expandAmount
  useEffect(() => {
    const expand = getExpandFromDirection(value, expandAmount);
    currentExpandRef.current = expand;
    setCurrentExpand(expand);
  }, [value, expandAmount, getExpandFromDirection]);

  const handleMouseDown = useCallback((handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    // Store initial values when drag starts
    initialExpandAmountRef.current = expandAmount;
    initialValueRef.current = value;
  }, [expandAmount, value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragHandle || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const containerSize = Math.min(rect.width, rect.height);
    
    // Размер изображения в пикселях (50% от контейнера)
    const imageSizePx = containerSize * 0.5;
    
    // Calculate drag distance in pixels
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Конвертируем в проценты расширения (0-100%)
    // Максимальное перетаскивание = размер изображения (100% расширение)
    const maxDrag = imageSizePx;
    const scaleX = Math.min(Math.max(deltaX / maxDrag, -1), 1) * 100;
    const scaleY = Math.min(Math.max(deltaY / maxDrag, -1), 1) * 100;

    // Get current values from refs to avoid dependency issues
    const current = currentExpandRef.current;
    // Use initial expandAmount from when drag started, stored in ref
    const baseAmount = initialExpandAmountRef.current;
    
    let newExpand = { ...current };
    let newDirection: ExpandDirection = initialValueRef.current;
    let newAmount = baseAmount;

    switch (dragHandle) {
      case 'top':
        newExpand.up = Math.max(0, Math.min(100, baseAmount - scaleY));
        newDirection = 'up';
        newAmount = newExpand.up;
        break;
      case 'bottom':
        newExpand.down = Math.max(0, Math.min(100, baseAmount + scaleY));
        newDirection = 'down';
        newAmount = newExpand.down;
        break;
      case 'left':
        newExpand.left = Math.max(0, Math.min(100, baseAmount - scaleX));
        newDirection = 'left';
        newAmount = newExpand.left;
        break;
      case 'right':
        newExpand.right = Math.max(0, Math.min(100, baseAmount + scaleX));
        newDirection = 'right';
        newAmount = newExpand.right;
        break;
      case 'top-left':
        newExpand.up = Math.max(0, Math.min(100, baseAmount - scaleY));
        newExpand.left = Math.max(0, Math.min(100, baseAmount - scaleX));
        newDirection = 'up-left';
        newAmount = Math.max(newExpand.up, newExpand.left);
        break;
      case 'top-right':
        newExpand.up = Math.max(0, Math.min(100, baseAmount - scaleY));
        newExpand.right = Math.max(0, Math.min(100, baseAmount + scaleX));
        newDirection = 'up-right';
        newAmount = Math.max(newExpand.up, newExpand.right);
        break;
      case 'bottom-left':
        newExpand.down = Math.max(0, Math.min(100, baseAmount + scaleY));
        newExpand.left = Math.max(0, Math.min(100, baseAmount - scaleX));
        newDirection = 'down-left';
        newAmount = Math.max(newExpand.down, newExpand.left);
        break;
      case 'bottom-right':
        newExpand.down = Math.max(0, Math.min(100, baseAmount + scaleY));
        newExpand.right = Math.max(0, Math.min(100, baseAmount + scaleX));
        newDirection = 'down-right';
        newAmount = Math.max(newExpand.down, newExpand.right);
        break;
    }

    // Update ref immediately for next move
    currentExpandRef.current = newExpand;
    
    // Update state (visual only)
    setCurrentExpand(newExpand);
    
    // Debounce parent callbacks to prevent infinite loops
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      onChange(newDirection);
      if (onExpandAmountChange) {
        onExpandAmountChange(newAmount);
      }
    }, 16); // ~60fps
  }, [isDragging, dragHandle, onChange, onExpandAmountChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
    
    // Final update on mouse up
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    const current = currentExpandRef.current;
    const maxAmount = Math.max(current.up, current.down, current.left, current.right);
    
    // Determine direction from current expand state
    let finalDirection: ExpandDirection = value;
    if (current.up > 0 && current.left > 0 && current.up === current.left && current.down === 0 && current.right === 0) {
      finalDirection = 'up-left';
    } else if (current.up > 0 && current.right > 0 && current.up === current.right && current.down === 0 && current.left === 0) {
      finalDirection = 'up-right';
    } else if (current.down > 0 && current.left > 0 && current.down === current.left && current.up === 0 && current.right === 0) {
      finalDirection = 'down-left';
    } else if (current.down > 0 && current.right > 0 && current.down === current.right && current.up === 0 && current.left === 0) {
      finalDirection = 'down-right';
    } else if (current.up > 0 && current.down === 0 && current.left === 0 && current.right === 0) {
      finalDirection = 'up';
    } else if (current.down > 0 && current.up === 0 && current.left === 0 && current.right === 0) {
      finalDirection = 'down';
    } else if (current.left > 0 && current.up === 0 && current.down === 0 && current.right === 0) {
      finalDirection = 'left';
    } else if (current.right > 0 && current.up === 0 && current.down === 0 && current.left === 0) {
      finalDirection = 'right';
    }
    
    onChange(finalDirection);
    if (onExpandAmountChange && maxAmount > 0) {
      onExpandAmountChange(maxAmount);
    }
  }, [value, onChange, onExpandAmountChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate canvas size and position for Bria Expand
  const getBriaExpandParams = useCallback((direction: ExpandDirection, amount: number) => {
    if (!imageWidth || !imageHeight) return null;

    const expandRatio = amount / 100;
    let newWidth = imageWidth;
    let newHeight = imageHeight;
    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case 'up':
        newHeight = Math.round(imageHeight * (1 + expandRatio));
        offsetY = Math.round(imageHeight * expandRatio);
        break;
      case 'down':
        newHeight = Math.round(imageHeight * (1 + expandRatio));
        offsetY = 0;
        break;
      case 'left':
        newWidth = Math.round(imageWidth * (1 + expandRatio));
        offsetX = Math.round(imageWidth * expandRatio);
        break;
      case 'right':
        newWidth = Math.round(imageWidth * (1 + expandRatio));
        offsetX = 0;
        break;
      case 'all':
        newWidth = Math.round(imageWidth * (1 + expandRatio));
        newHeight = Math.round(imageHeight * (1 + expandRatio));
        offsetX = Math.round(imageWidth * expandRatio / 2);
        offsetY = Math.round(imageHeight * expandRatio / 2);
        break;
    }

    // Ensure max canvas size (25M pixels for Bria)
    const maxArea = 25_000_000;
    if (newWidth * newHeight > maxArea) {
      const scale = Math.sqrt(maxArea / (newWidth * newHeight));
      newWidth = Math.round(newWidth * scale);
      newHeight = Math.round(newHeight * scale);
      offsetX = Math.round(offsetX * scale);
      offsetY = Math.round(offsetY * scale);
    }

    return {
      canvas_size: [newWidth, newHeight],
      original_image_size: [imageWidth, imageHeight],
      original_image_location: [offsetX, offsetY],
    };
  }, [imageWidth, imageHeight]);

  // Get params for current selection
  const briaParams = getBriaExpandParams(value, expandAmount);

  // Максимальный размер изображения (50% от контейнера)
  const maxImageSizePercent = 50;
  
  // Вычисляем размеры расширенных областей в процентах
  // При 100% расширении = 25% от контейнера (половина от maxImageSizePercent)
  const maxExpandPercent = 25;
  const expandUpPercent = (currentExpand.up / 100) * maxExpandPercent;
  const expandDownPercent = (currentExpand.down / 100) * maxExpandPercent;
  const expandLeftPercent = (currentExpand.left / 100) * maxExpandPercent;
  const expandRightPercent = (currentExpand.right / 100) * maxExpandPercent;

  return (
    <div className="flex flex-col gap-4">
      {/* Visual selector */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Grid background - темный фон */}
        <div 
          ref={containerRef}
          className="aspect-square bg-[#101010] rounded-xl border border-[#656565] relative overflow-hidden"
        >
          {/* Расширенная область (серый фон вокруг изображения) */}
          {(currentExpand.up > 0 || currentExpand.down > 0 || currentExpand.left > 0 || currentExpand.right > 0) && (
            <div 
              className="absolute bg-[#212121] z-0"
              style={{
                top: `calc(50% - ${maxImageSizePercent / 2}% - ${expandUpPercent}%)`,
                left: `calc(50% - ${maxImageSizePercent / 2}% - ${expandLeftPercent}%)`,
                right: `calc(50% - ${maxImageSizePercent / 2}% - ${expandRightPercent}%)`,
                bottom: `calc(50% - ${maxImageSizePercent / 2}% - ${expandDownPercent}%)`,
              }}
            />
          )}

          {/* Линии сетки расширения - вертикальные */}
          <div 
            className="absolute w-px bg-[#d9d9d9] h-full z-10"
            style={{ left: `calc(50% - ${maxImageSizePercent / 2}% - ${expandLeftPercent}%)` }}
          />
          <div 
            className="absolute w-px bg-[#d9d9d9] h-full z-10"
            style={{ right: `calc(50% - ${maxImageSizePercent / 2}% - ${expandRightPercent}%)` }}
          />
          
          {/* Линии сетки расширения - горизонтальные */}
          <div 
            className="absolute h-px bg-[#d9d9d9] w-full z-10"
            style={{ top: `calc(50% - ${maxImageSizePercent / 2}% - ${expandUpPercent}%)` }}
          />
          <div 
            className="absolute h-px bg-[#d9d9d9] w-full z-10"
            style={{ bottom: `calc(50% - ${maxImageSizePercent / 2}% - ${expandDownPercent}%)` }}
          />

          {/* Изображение в центре - max 50% ширины и высоты */}
          <div 
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Original"
                className="object-contain"
                style={{ 
                  maxWidth: `${maxImageSizePercent}%`, 
                  maxHeight: `${maxImageSizePercent}%`,
                }}
              />
            ) : (
              <div 
                className="bg-[#252525] flex items-center justify-center"
                style={{ 
                  width: `${maxImageSizePercent}%`, 
                  height: `${maxImageSizePercent}%`,
                }}
              >
                <Move className="w-8 h-8 text-[#656565]" />
              </div>
            )}
          </div>

          {/* Drag handles - corners */}
          <div
            onMouseDown={(e) => handleMouseDown('top-left', e)}
            className="absolute w-5 h-5 bg-white rounded-full cursor-nwse-resize shadow-lg z-30"
            style={{ 
              top: `calc(50% - ${maxImageSizePercent / 2}% - ${expandUpPercent}%)`, 
              left: `calc(50% - ${maxImageSizePercent / 2}% - ${expandLeftPercent}%)`, 
              transform: 'translate(-50%, -50%)' 
            }}
          />
          <div
            onMouseDown={(e) => handleMouseDown('top-right', e)}
            className="absolute w-5 h-5 bg-white rounded-full cursor-nesw-resize shadow-lg z-30"
            style={{ 
              top: `calc(50% - ${maxImageSizePercent / 2}% - ${expandUpPercent}%)`, 
              right: `calc(50% - ${maxImageSizePercent / 2}% - ${expandRightPercent}%)`, 
              transform: 'translate(50%, -50%)' 
            }}
          />
          <div
            onMouseDown={(e) => handleMouseDown('bottom-left', e)}
            className="absolute w-5 h-5 bg-white rounded-full cursor-nesw-resize shadow-lg z-30"
            style={{ 
              bottom: `calc(50% - ${maxImageSizePercent / 2}% - ${expandDownPercent}%)`, 
              left: `calc(50% - ${maxImageSizePercent / 2}% - ${expandLeftPercent}%)`, 
              transform: 'translate(-50%, 50%)' 
            }}
          />
          <div
            onMouseDown={(e) => handleMouseDown('bottom-right', e)}
            className="absolute w-5 h-5 bg-white rounded-full cursor-nwse-resize shadow-lg z-30"
            style={{ 
              bottom: `calc(50% - ${maxImageSizePercent / 2}% - ${expandDownPercent}%)`, 
              right: `calc(50% - ${maxImageSizePercent / 2}% - ${expandRightPercent}%)`, 
              transform: 'translate(50%, 50%)' 
            }}
          />
        </div>
      </div>

      {/* Expand amount slider */}
      {onExpandAmountChange && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-[#656565]">Процент расширения</label>
            <span className="text-sm text-white font-mono">{expandAmount}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={expandAmount}
            onChange={(e) => onExpandAmountChange(Number(e.target.value))}
            className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>
      )}

      {/* Debug info (can be removed in production) */}
      {briaParams && process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-[#656565] font-mono p-2 bg-[#1a1a1a] rounded">
          <div>Canvas: {briaParams.canvas_size[0]}x{briaParams.canvas_size[1]}</div>
          <div>Original: {briaParams.original_image_size[0]}x{briaParams.original_image_size[1]}</div>
          <div>Offset: [{briaParams.original_image_location[0]}, {briaParams.original_image_location[1]}]</div>
        </div>
      )}
    </div>
  );
}
