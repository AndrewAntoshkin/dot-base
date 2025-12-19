'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';

interface ImageUploadAreaProps {
  onFileSelect: (file: File) => void;
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable image upload area component with:
 * - Drag & drop support
 * - Click to select file
 * - Paste from clipboard (Cmd+V / Ctrl+V)
 */
export function ImageUploadArea({
  onFileSelect,
  isDragging: externalDragging,
  onDragStateChange,
  disabled = false,
  className = '',
}: ImageUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalDragging, setInternalDragging] = useState(false);
  
  // Use external dragging state if provided, otherwise use internal
  const isDragging = externalDragging ?? internalDragging;
  
  const setDragging = useCallback((value: boolean) => {
    setInternalDragging(value);
    onDragStateChange?.(value);
  }, [onDragStateChange]);

  // Process file
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragging(true);
    }
  }, [disabled, setDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, [setDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [disabled, processFile, setDragging]);

  // Handle paste from clipboard
  const handlePaste = useCallback(async (e?: ClipboardEvent) => {
    if (disabled) return;
    
    if (e?.clipboardData?.items) {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            return;
          }
        }
      }
    } else {
      // Fallback - use Clipboard API directly
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted-image.png', { type: imageType });
            processFile(file);
            return;
          }
        }
      } catch (err) {
        console.log('Clipboard read failed:', err);
      }
    }
  }, [disabled, processFile]);

  // Listen for paste events
  useEffect(() => {
    if (disabled) return;
    
    const onPaste = (e: ClipboardEvent) => handlePaste(e);
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [disabled, handlePaste]);

  // Click handler
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer border border-dashed rounded-lg flex flex-col items-center justify-center gap-3 p-6 transition-colors ${
          isDragging 
            ? 'border-white bg-white/10' 
            : 'border-[#656565] bg-transparent hover:border-white/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <ImagePlus className="w-8 h-8 text-[#959595]" />
        <p className="font-inter text-sm text-white text-center">
          Перетащите или выберите на устройстве
        </p>
        <p className="font-inter text-xs text-[#959595] text-center">
          PNG, JPG, WEBP
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </>
  );
}
