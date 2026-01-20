'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ReferencesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages: number;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function ReferencesPopover({
  isOpen,
  onClose,
  images,
  onImagesChange,
  maxImages,
  anchorRef,
}: ReferencesPopoverProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Calculate position directly from anchor
  const getPopoverPosition = useCallback(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      return {
        left: rect.left + rect.width / 2,
        top: rect.bottom + 8,
      };
    }
    return { left: window.innerWidth / 2, top: window.innerHeight / 2 };
  }, [anchorRef]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      await uploadFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (const file of files) {
        if (images.length + newUrls.length >= maxImages) break;
        
        // Convert to base64 data URL for now (in production, upload to storage)
        const dataUrl = await fileToDataUrl(file);
        newUrls.push(dataUrl);
      }
      
      onImagesChange([...images, ...newUrls]);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = useCallback((index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  }, [images, onImagesChange]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          'fixed z-50 rounded-2xl bg-[#171717] p-4',
          'shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)]',
          'min-w-[320px] max-w-[356px]'
        )}
        style={{
          ...getPopoverPosition(),
          transform: 'translateX(-50%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-5">
          {/* Upload area */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
              референсные изображения
            </p>
            
            <div
              className={cn(
                'flex flex-col items-center gap-3 p-8 rounded-lg',
                'bg-[#101010] border border-dashed border-[#656565]',
                'cursor-pointer transition-colors',
                isDragging && 'border-white bg-white/5',
                isUploading && 'opacity-50 pointer-events-none'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-5 h-5 text-white" />
              <div className="flex flex-col gap-1 text-center">
                <p className="text-sm font-medium text-white">
                  {isUploading ? 'Загрузка...' : 'Перетащите или выберите изображения'}
                </p>
                <p className="text-xs text-[#959595]">
                  {maxImages > 1 
                    ? `5-${maxImages} фотографий для лучшего результата`
                    : '1 изображение'
                  }
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Uploaded images */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                Загружено: {images.length} из {maxImages}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {images.map((url, index) => (
                  <div 
                    key={index}
                    className="relative w-[50px] h-[50px] rounded-lg overflow-hidden group"
                  >
                    <Image
                      src={url}
                      alt={`Reference ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className={cn(
                        'absolute top-0.5 right-0.5 w-4 h-4 rounded-full',
                        'bg-black/70 flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-opacity'
                      )}
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                
                {/* Add more button if under limit */}
                {images.length < maxImages && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'w-[50px] h-[50px] rounded-lg',
                      'bg-[#101010] border border-dashed border-[#656565]',
                      'flex items-center justify-center',
                      'hover:border-white/50 transition-colors'
                    )}
                  >
                    <ImagePlus className="w-4 h-4 text-[#656565]" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
