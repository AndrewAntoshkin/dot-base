'use client';

import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

export interface FlowInlinePainterRef {
  exportMask: () => string | null;
  clear: () => void;
}

interface FlowInlinePainterProps {
  imageUrl: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * Lightweight inline brush canvas for inpaint masking.
 * Renders a green semi-transparent trail on top of an image.
 * Call exportMask() to get a black/white PNG data URL (white = areas to inpaint).
 */
export const FlowInlinePainter = forwardRef<FlowInlinePainterRef, FlowInlinePainterProps>(
  function FlowInlinePainter({ imageUrl, width, height, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const historyRef = useRef<ImageData[]>([]);

    // Save current state to history
    const saveToHistory = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(imageData);
      if (historyRef.current.length > 30) historyRef.current.shift();
    }, []);

    // Get position relative to canvas
    const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    }, []);

    // Draw a brush stroke
    const draw = useCallback((x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const radius = brushSize / 2;

      // Green semi-transparent with crosshatch pattern
      ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Smooth line between points
      if (lastPosRef.current) {
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // Draw small "+" crosshairs inside painted area
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      const crossSize = 3;
      ctx.beginPath();
      ctx.moveTo(x - crossSize, y);
      ctx.lineTo(x + crossSize, y);
      ctx.moveTo(x, y - crossSize);
      ctx.lineTo(x, y + crossSize);
      ctx.stroke();

      lastPosRef.current = { x, y };
    }, [brushSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      e.stopPropagation();
      saveToHistory();
      setIsDrawing(true);
      const pos = getPos(e);
      draw(pos.x, pos.y);
    }, [saveToHistory, getPos, draw]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      e.stopPropagation();
      const pos = getPos(e);
      draw(pos.x, pos.y);
    }, [isDrawing, getPos, draw]);

    const handleMouseUp = useCallback(() => {
      setIsDrawing(false);
      lastPosRef.current = null;
    }, []);

    // Adjust brush size with scroll wheel
    const handleWheel = useCallback((e: React.WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setBrushSize(prev => Math.max(5, Math.min(100, prev - e.deltaY * 0.1)));
    }, []);

    // Export mask as black/white PNG data URL
    const exportMask = useCallback((): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      // Black background (keep)
      tempCtx.fillStyle = 'black';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // White where painted (inpaint)
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = maskData.data;
      tempCtx.fillStyle = 'white';
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 10) { // Any non-transparent pixel
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);
          tempCtx.fillRect(x, y, 1, 1);
        }
      }

      return tempCanvas.toDataURL('image/png');
    }, []);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({ exportMask, clear }), [exportMask, clear]);

    // Reset canvas when image changes
    useEffect(() => {
      clear();
      historyRef.current = [];
    }, [imageUrl, clear]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn('absolute inset-0 z-10 nodrag cursor-crosshair', className)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
    );
  }
);
