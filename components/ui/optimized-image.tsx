'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  // Для grid view обычно 256px достаточно
  quality?: number;
}

/**
 * Оптимизированный компонент изображения
 * - Использует Next.js Image для автоматической оптимизации
 * - Показывает shimmer placeholder пока загружается
 * - Graceful fallback при ошибках
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  quality = 75,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Fallback для ошибок
  if (hasError) {
    return (
      <div className={`bg-[#1a1a1a] flex items-center justify-center ${className}`}>
        <span className="text-[#656565] text-xs">Не загружено</span>
      </div>
    );
  }

  // Проверяем, поддерживается ли URL Next.js Image
  const isSupported = src.startsWith('http') || src.startsWith('/');
  
  if (!isSupported) {
    // Fallback для data URLs и прочего
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  return (
    <div className={`relative ${fill ? 'w-full h-full' : ''}`}>
      {/* Shimmer placeholder */}
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-[#1a1a1a] animate-pulse ${className}`}
          style={{ borderRadius: 'inherit' }}
        />
      )}
      
      <Image
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        // Для внешних изображений (Supabase) используем unoptimized
        // чтобы не платить за Image Optimization API Vercel
        unoptimized={src.includes('supabase.co')}
      />
    </div>
  );
}

/**
 * Простой img с оптимизациями
 * Для случаев когда Next.js Image не подходит
 */
export function LazyImage({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div 
          className="absolute inset-0 bg-[#1a1a1a] animate-pulse"
          style={{ borderRadius: 'inherit' }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
