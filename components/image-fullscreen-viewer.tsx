'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface ImageFullscreenViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageFullscreenViewer({ imageUrl, isOpen, onClose, alt = 'Image' }: ImageFullscreenViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset zoom and pan when image changes, and auto-enter fullscreen
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      
      // Автоматически входим в fullscreen при открытии
      // Небольшая задержка чтобы DOM успел отрендериться
      const timer = setTimeout(() => {
        if (containerRef.current && !document.fullscreenElement) {
          if (containerRef.current.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {
              // Игнорируем ошибку если fullscreen заблокирован
            });
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            (containerRef.current as any).webkitRequestFullscreen();
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [imageUrl, isOpen]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const newZoom = Math.max(z - 0.25, 0.5);
      // Reset pan if zoomed out too much
      if (newZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => {
      const newZoom = Math.max(0.5, Math.min(5, z + delta));
      // Reset pan if zoomed out too much
      if (newZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  // Pan with mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Pinch zoom for touch
  const lastTouchDistanceRef = useRef<number | null>(null);

  const handleTouchStartPinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistanceRef.current = distance;
    }
  }, []);

  const handleTouchMovePinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / lastTouchDistanceRef.current;
      setZoom(z => Math.max(0.5, Math.min(5, z * scale)));
      lastTouchDistanceRef.current = distance;
    }
  }, []);

  const handleTouchEndPinch = useCallback(() => {
    lastTouchDistanceRef.current = null;
  }, []);

  // Global mouse listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset, toggleFullscreen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onWheel={handleWheel}
      onTouchStart={(e) => {
        handleTouchStart(e);
        handleTouchStartPinch(e);
      }}
      onTouchMove={(e) => {
        handleTouchMove(e);
        handleTouchMovePinch(e);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd();
        handleTouchEndPinch();
      }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          // Выходим из fullscreen и закрываем
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          onClose();
        }}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2 bg-black/50 rounded-lg p-1">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in"
            title="Увеличить (+)"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-2 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out"
            title="Уменьшить (-)"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            aria-label="Reset zoom"
            title="Сбросить (0)"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            aria-label="Toggle fullscreen"
            title="Полноэкранный режим (F)"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
        <div className="bg-black/50 rounded-lg px-3 py-1.5">
          <span className="text-white text-sm font-mono">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Image container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        style={{ cursor: zoom > 1 ? 'move' : 'default' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          className="max-w-none select-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            maxWidth: zoom > 1 ? 'none' : '100%',
            maxHeight: zoom > 1 ? 'none' : '100%',
          }}
          draggable={false}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-lg px-4 py-2">
        <p className="text-white/70 text-xs text-center">
          Используйте колесико мыши для зума • Перетаскивайте для перемещения • ESC для закрытия
        </p>
      </div>
    </div>
  );
}
