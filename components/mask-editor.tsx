'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Brush, Eraser, Undo2, Redo2, RotateCcw, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface MaskEditorProps {
  imageUrl: string;
  onMaskChange: (maskDataUrl: string) => void;
  width?: number;
  height?: number;
}

interface HistoryState {
  imageData: ImageData;
}

export function MaskEditor({ imageUrl, onMaskChange, width = 660, height = 660 }: MaskEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(86);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState<'landscape' | 'portrait' | 'square'>('square');
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Load image and set up canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !maskCanvas || !container) return;

      // Save original dimensions for mask export
      setOriginalDimensions({ width: img.width, height: img.height });

      // Determine aspect ratio
      const ratio = img.width / img.height;
      let aspectType: 'landscape' | 'portrait' | 'square' = 'square';
      if (ratio > 1.1) aspectType = 'landscape';
      else if (ratio < 0.9) aspectType = 'portrait';
      setImageAspectRatio(aspectType);

      // Get container width
      const containerWidth = container.clientWidth || 800;
      const maxHeight = height; // 660px

      let imgWidth: number;
      let imgHeight: number;

      if (aspectType === 'landscape') {
        // Landscape: fill width, calculate height
        imgWidth = containerWidth;
        imgHeight = Math.round(containerWidth / ratio);
        // But don't exceed max height
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = Math.round(maxHeight * ratio);
        }
      } else {
        // Portrait or Square: fill height, calculate width
        imgHeight = maxHeight;
        imgWidth = Math.round(maxHeight * ratio);
        // But don't exceed container width
        if (imgWidth > containerWidth) {
          imgWidth = containerWidth;
          imgHeight = Math.round(containerWidth / ratio);
        }
      }

      setImageDimensions({ width: imgWidth, height: imgHeight });

      // Set canvas sizes (for display)
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      maskCanvas.width = imgWidth;
      maskCanvas.height = imgHeight;

      // Draw image on canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
      }

      // Initialize mask canvas as transparent
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, imgWidth, imgHeight);
        // Save initial state to history
        const initialState = maskCtx.getImageData(0, 0, imgWidth, imgHeight);
        setHistory([{ imageData: initialState }]);
        setHistoryIndex(0);
      }

      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl, width, height]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Remove any future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ imageData });
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
    exportMask();
   
  }, [historyIndex, history]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
    exportMask();
   
  }, [historyIndex, history]);

  // Clear mask
  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveToHistory();
    exportMask();
   
  }, [saveToHistory]);

  // Export mask as data URL (scaled to original image size)
  const exportMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || originalDimensions.width === 0) return;

    // First create mask at display size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fill with black (areas to keep)
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Get mask data
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw white where mask is painted (areas to inpaint)
    tempCtx.fillStyle = 'white';
    const data = maskData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // If pixel is not transparent
        const x = (i / 4) % maskCanvas.width;
        const y = Math.floor((i / 4) / maskCanvas.width);
        tempCtx.fillRect(x, y, 1, 1);
      }
    }

    // Now scale to original image size
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = originalDimensions.width;
    exportCanvas.height = originalDimensions.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Use nearest-neighbor for sharp mask edges
    exportCtx.imageSmoothingEnabled = false;
    exportCtx.drawImage(tempCanvas, 0, 0, originalDimensions.width, originalDimensions.height);

    const dataUrl = exportCanvas.toDataURL('image/png');
    onMaskChange(dataUrl);
  }, [onMaskChange, originalDimensions]);

  // Get canvas coordinates from mouse/touch event
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    const rect = maskCanvas.getBoundingClientRect();
    const scaleX = maskCanvas.width / rect.width;
    const scaleY = maskCanvas.height / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Draw on canvas
  const draw = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const radius = brushSize / 2;

    if (tool === 'brush') {
      // Yellow semi-transparent for visual feedback
      maskCtx.fillStyle = 'rgba(255, 230, 0, 0.5)';
      maskCtx.beginPath();
      maskCtx.arc(x, y, radius, 0, Math.PI * 2);
      maskCtx.fill();

      // Draw line between points for smoother strokes
      if (lastPosRef.current) {
        maskCtx.strokeStyle = 'rgba(255, 230, 0, 0.5)';
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.beginPath();
        maskCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        maskCtx.lineTo(x, y);
        maskCtx.stroke();
      }
    } else {
      // Eraser - clear area
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.beginPath();
      maskCtx.arc(x, y, radius, 0, Math.PI * 2);
      maskCtx.fill();
      maskCtx.globalCompositeOperation = 'source-over';
    }

    lastPosRef.current = { x, y };
  }, [tool, brushSize]);

  // Mouse/touch handlers
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    lastPosRef.current = coords;
    draw(coords.x, coords.y);
  }, [getCanvasCoords, draw]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    if (coords) {
      // Always update cursor position for visual indicator
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const rect = maskCanvas.getBoundingClientRect();
        // Convert canvas coords back to screen coords relative to canvas element
        const screenX = (coords.x / maskCanvas.width) * rect.width;
        const screenY = (coords.y / maskCanvas.height) * rect.height;
        setCursorPos({ x: screenX, y: screenY });
      }
    }
    
    if (!isDrawing) return;
    e.preventDefault();

    if (!coords) return;

    draw(coords.x, coords.y);
  }, [isDrawing, getCanvasCoords, draw]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setCursorPos(null);
  }, []);

  const handleEnd = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPosRef.current = null;
      saveToHistory();
      exportMask();
    }
  }, [isDrawing, saveToHistory, exportMask]);

  // Handle zoom
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar - Figma design */}
      <div className="flex items-center gap-2">
        {/* Brush/Eraser group */}
        <div className="bg-[#191919] flex items-center gap-[2px] p-1 rounded-lg">
          <button
            onClick={() => setTool('brush')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'brush' ? 'bg-white text-black' : 'text-white hover:bg-[#2f2f2f]'
            }`}
            title="Кисть"
          >
            <Brush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${
              tool === 'eraser' ? 'bg-white text-black' : 'text-white hover:bg-[#2f2f2f]'
            }`}
            title="Ластик"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="bg-[#2f2f2f] w-px h-4 mx-1" />
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors disabled:opacity-30"
            title="Отменить"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors disabled:opacity-30"
            title="Повторить"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Brush size group */}
        <div className="bg-[#191919] flex items-center gap-3 h-10 px-3 rounded-lg">
          <span className="font-inter text-xs text-white">Кисть</span>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min="5"
              max="200"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-[120px] h-1 accent-white bg-[#3f3f3f] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
            <span className="font-inter text-xs text-white w-10 text-right">{brushSize}px</span>
          </div>
        </div>

        {/* Zoom group */}
        <div className="bg-[#191919] flex items-center gap-[2px] p-1 rounded-lg">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors"
            title="Уменьшить"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-inter text-xs text-white text-center w-9">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors"
            title="Увеличить"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Reset group */}
        <div className="bg-[#191919] flex items-center p-1 rounded-lg">
          <button
            onClick={clearMask}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors"
            title="Сбросить маску"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Download group */}
        <div className="bg-[#191919] flex items-center p-1 rounded-lg">
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const link = document.createElement('a');
              link.download = `inpaint-${Date.now()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
            }}
            className="p-2 rounded-lg text-white hover:bg-[#2f2f2f] transition-colors"
            title="Скачать"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas container - full width, fixed height, image centered */}
      <div 
        ref={containerRef}
        className="bg-black rounded-2xl flex items-center justify-center overflow-hidden w-full"
        style={{ 
          height: height,
        }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
          }}
        >
          {/* Background image */}
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
            }}
          />
          
          {/* Mask overlay */}
          <canvas
            ref={maskCanvasRef}
            className="absolute inset-0 cursor-none touch-none"
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={(e) => { handleEnd(); handleMouseLeave(); }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          
          {/* Brush cursor indicator */}
          {isHovering && cursorPos && (
            <div
              className="absolute pointer-events-none rounded-full border-2 border-yellow-400"
              style={{
                width: brushSize / zoom,
                height: brushSize / zoom,
                left: cursorPos.x,
                top: cursorPos.y,
                transform: 'translate(-50%, -50%)',
                backgroundColor: tool === 'brush' ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255, 255, 255, 0.2)',
              }}
            />
          )}
        </div>
      </div>

      {/* Caption */}
      <p className="font-inter font-medium text-sm text-[#656565] text-start">
        Закрасьте область, которую хотите изменить. Жёлтая область будет заменена на то, что вы опишете в prompt.
      </p>
    </div>
  );
}

