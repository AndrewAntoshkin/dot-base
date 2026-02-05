'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { useLimitToast } from '@/components/limit-toast';
import { CREATE_MODELS_LITE, VIDEO_CREATE_MODELS_LITE, type ModelLite } from '@/lib/models-lite';
import { BrainstormImageSheet } from '@/components/brainstorm-image-sheet';
import { ChevronDown, Send, RefreshCw, Loader2, ZoomIn, ZoomOut, Image as ImageIcon, Video } from 'lucide-react';

// Media type for brainstorm
type MediaType = 'image' | 'video';

// Check icon matching the design
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface BrainstormGeneration {
  id: string;
  modelId: string;
  modelName: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  resultUrl?: string;
  error?: string;
  position: { x: number; y: number };
  imageSize?: { width: number; height: number };
  prompt?: string;
  mediaType: MediaType;
}

// Base card dimensions
const BASE_CARD_WIDTH = 200;
const CARD_MARGIN = 20;

// Calculate card dimensions based on image aspect ratio
function getCardDimensions(imageSize?: { width: number; height: number }): { width: number; height: number } {
  if (!imageSize || !imageSize.width || !imageSize.height) {
    // Default 1:1 aspect ratio
    return { width: BASE_CARD_WIDTH, height: BASE_CARD_WIDTH + 20 }; // +20 for label
  }
  
  const aspectRatio = imageSize.width / imageSize.height;
  const imageWidth = BASE_CARD_WIDTH;
  const imageHeight = imageWidth / aspectRatio;
  
  return {
    width: imageWidth + 8, // padding
    height: imageHeight + 28, // label + padding
  };
}

// Canvas size (virtual)
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 3000;

// Zoom limits
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

// Max models limit
const MAX_MODELS = 5;

// Grid layout settings
const GRID_COLS = 5;

// Default card size for overlap calculations
const DEFAULT_CARD_SIZE = { width: BASE_CARD_WIDTH + 8, height: BASE_CARD_WIDTH + 28 };

// Generate grid position for new cards (5 per row, centered on canvas)
function generateGridPosition(index: number): { x: number; y: number } {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  
  // Calculate grid dimensions
  const gridWidth = GRID_COLS * DEFAULT_CARD_SIZE.width + (GRID_COLS - 1) * CARD_MARGIN;
  
  // Center grid on canvas
  const startX = (CANVAS_WIDTH - gridWidth) / 2;
  const startY = CANVAS_HEIGHT / 2 - 200; // Start slightly above center
  
  return {
    x: startX + col * (DEFAULT_CARD_SIZE.width + CARD_MARGIN),
    y: startY + row * (DEFAULT_CARD_SIZE.height + CARD_MARGIN),
  };
}

const STORAGE_KEY = 'brainstorm_generations';

export default function BrainstormPageClient() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addGeneration } = useGenerations();
  const { selectedWorkspaceId, isAdmin } = useUser();
  const { showLimitToast } = useLimitToast();
  
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [isAspectRatioSelectorOpen, setIsAspectRatioSelectorOpen] = useState(false);
  const [generations, setGenerations] = useState<BrainstormGeneration[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>('image');
  
  // Aspect ratios depend on media type
  const IMAGE_ASPECT_RATIOS = [
    { value: '1:1', label: '1:1' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
  ];
  
  const VIDEO_ASPECT_RATIOS = [
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '1:1', label: '1:1' },
  ];
  
  const ASPECT_RATIOS = mediaType === 'video' ? VIDEO_ASPECT_RATIOS : IMAGE_ASPECT_RATIOS;
  
  // Get models based on media type (filter adminOnly if not admin)
  const availableModels: ModelLite[] = (mediaType === 'video' ? VIDEO_CREATE_MODELS_LITE : CREATE_MODELS_LITE)
    .filter(m => isAdmin || !m.adminOnly);
  
  // Reset selected models when media type changes
  const handleMediaTypeChange = useCallback((newType: MediaType) => {
    setMediaType(newType);
    setSelectedModels([]);
    // Set default aspect ratio for media type
    setSelectedAspectRatio(newType === 'video' ? '16:9' : '1:1');
  }, []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [modalGeneration, setModalGeneration] = useState<BrainstormGeneration | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Drag state for cards
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  
  // Refs for drag tracking (to avoid closure issues in click handlers)
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  // Center canvas on mount
  useEffect(() => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setPan({
        x: (containerRect.width - CANVAS_WIDTH * zoom) / 2,
        y: (containerRect.height - CANVAS_HEIGHT * zoom) / 2,
      });
    }
  }, []);
  
  // Load generations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BrainstormGeneration[];
        // Add default mediaType for backward compatibility
        const withMediaType = parsed.map(g => ({
          ...g,
          mediaType: g.mediaType || 'image' as MediaType,
        }));
        setGenerations(withMediaType);
      } catch (e) {
        console.error('Failed to load brainstorm generations:', e);
      }
    }
  }, []);
  
  // Save generations to localStorage when they change
  useEffect(() => {
    if (generations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generations));
    }
  }, [generations]);
  
  // Refs for zoom calculation (to access current values in event handler)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  
  // Zoom towards cursor position
  const zoomTowardsCursor = useCallback((clientX: number, clientY: number, zoomDelta: number) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    
    // Calculate cursor position relative to container
    const cursorX = clientX - rect.left;
    const cursorY = clientY - rect.top;
    
    // Calculate new zoom
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + zoomDelta));
    
    if (newZoom === currentZoom) return;
    
    // Calculate the point on canvas under cursor (before zoom)
    const canvasX = (cursorX - currentPan.x) / currentZoom;
    const canvasY = (cursorY - currentPan.y) / currentZoom;
    
    // Calculate new pan to keep the same canvas point under cursor
    const newPanX = cursorX - canvasX * newZoom;
    const newPanY = cursorY - canvasY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);
  
  // Attach native wheel listener with passive: false to prevent browser zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on trackpad sends wheel events with ctrlKey
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Smaller step for smoother zoom
        const delta = e.deltaY > 0 ? -ZOOM_STEP * 0.5 : ZOOM_STEP * 0.5;
        zoomTowardsCursor(e.clientX, e.clientY, delta);
      }
    };
    
    // Handle gesture events (Safari)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };
    
    let lastScale = 1;
    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      const gestureEvent = e as unknown as { scale: number; clientX: number; clientY: number };
      if (gestureEvent.scale) {
        const scaleDelta = (gestureEvent.scale - lastScale) * 0.5;
        lastScale = gestureEvent.scale;
        zoomTowardsCursor(gestureEvent.clientX || window.innerWidth / 2, gestureEvent.clientY || window.innerHeight / 2, scaleDelta);
      }
    };
    
    const handleGestureEnd = () => {
      lastScale = 1;
    };
    
    // passive: false is required to call preventDefault()
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('gesturestart', handleGestureStart, { passive: false });
    container.addEventListener('gesturechange', handleGestureChange, { passive: false });
    container.addEventListener('gestureend', handleGestureEnd);
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturestart', handleGestureStart);
      container.removeEventListener('gesturechange', handleGestureChange);
      container.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [zoomTowardsCursor]);
  
  // Handle zoom buttons - zoom towards center of viewport
  const handleZoomIn = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      zoomTowardsCursor(rect.left + rect.width / 2, rect.top + rect.height / 2, ZOOM_STEP);
    }
  }, [zoomTowardsCursor]);
  
  const handleZoomOut = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      zoomTowardsCursor(rect.left + rect.width / 2, rect.top + rect.height / 2, -ZOOM_STEP);
    }
  }, [zoomTowardsCursor]);
  
  // Handle pan start
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Only start panning if clicking on empty canvas (not on a card)
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);
  
  // Handle pan move
  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);
  
  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  // Handle mouse move for dragging cards
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    
    setHasDragged(true);
    hasDraggedRef.current = true;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left) / zoom - dragOffset.x;
    const newY = (e.clientY - canvasRect.top) / zoom - dragOffset.y;
    
    // Clamp to canvas bounds using default card size
    const clampedX = Math.max(0, Math.min(newX, CANVAS_WIDTH - DEFAULT_CARD_SIZE.width));
    const clampedY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - DEFAULT_CARD_SIZE.height));
    
    setGenerations(prev => prev.map(g => {
      if (g.id === draggingId) {
        return { ...g, position: { x: clampedX, y: clampedY } };
      }
      return g;
    }));
  }, [draggingId, dragOffset, zoom]);
  
  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setDraggingId(null);
    setTimeout(() => {
      setHasDragged(false);
      hasDraggedRef.current = false;
    }, 100);
  }, []);
  
  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);
  
  // Start dragging a card
  const handleDragStart = useCallback((e: React.MouseEvent, generationId: string) => {
    // Only prevent default to stop text selection, don't stop propagation
    e.preventDefault();
    
    const generation = generations.find(g => g.id === generationId);
    if (!generation || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left) / zoom;
    const mouseY = (e.clientY - canvasRect.top) / zoom;
    
    const offsetX = mouseX - generation.position.x;
    const offsetY = mouseY - generation.position.y;
    
    setHasDragged(false);
    hasDraggedRef.current = false;
    isDraggingRef.current = true;
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggingId(generationId);
  }, [generations, zoom]);
  
  // Polling for generation status updates
  useEffect(() => {
    // Include generations that are processing OR succeeded but don't have resultUrl yet
    const generationsToCheck = generations.filter(
      g => !g.id.startsWith('temp-') && (
        g.status === 'pending' || 
        g.status === 'processing' ||
        (g.status === 'succeeded' && !g.resultUrl)
      )
    );
    
    if (generationsToCheck.length === 0) {
      setIsGenerating(false);
      return;
    }
    
    const pollInterval = setInterval(async () => {
      for (const gen of generationsToCheck) {
        try {
          const response = await fetch(`/api/generations/${gen.id}`);
          if (response.ok) {
            const data = await response.json();

            // Use first output_url from the array
            const mediaUrl = data.output_urls?.[0] || gen.resultUrl;
            
            // If we have a new media URL
            if (mediaUrl && mediaUrl !== gen.resultUrl) {
              // For video, just update directly (no need to load for dimensions)
              if (gen.mediaType === 'video') {
                setGenerations(prev => prev.map(g => {
                  if (g.id === gen.id) {
                    return {
                      ...g,
                      status: data.status,
                      resultUrl: mediaUrl,
                      error: data.error_message,
                    };
                  }
                  return g;
                }));
              } else {
                // For images, load to get dimensions
                const img = new Image();
                img.onload = () => {
                  setGenerations(prev => prev.map(g => {
                    if (g.id === gen.id) {
                      return {
                        ...g,
                        status: data.status,
                        resultUrl: mediaUrl,
                        imageSize: { width: img.naturalWidth, height: img.naturalHeight },
                        error: data.error_message,
                      };
                    }
                    return g;
                  }));
                };
                img.onerror = () => {
                  setGenerations(prev => prev.map(g => {
                    if (g.id === gen.id) {
                      return {
                        ...g,
                        status: data.status,
                        resultUrl: mediaUrl,
                        error: data.error_message,
                      };
                    }
                    return g;
                  }));
                };
                img.src = mediaUrl;
              }
            } else {
              setGenerations(prev => prev.map(g => {
                if (g.id === gen.id) {
                  return {
                    ...g,
                    status: data.status,
                    resultUrl: mediaUrl,
                    error: data.error_message,
                  };
                }
                return g;
              }));
            }
          }
        } catch (error) {
          console.error('Error polling generation:', error);
        }
      }
    }, 3000); // Оптимизировано для Disk IO (было 2000)
    
    return () => clearInterval(pollInterval);
  }, [generations]);
  
  const handleModelToggle = useCallback((modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        // Always allow deselecting
        return prev.filter(id => id !== modelId);
      }
      // Only allow adding if under limit
      if (prev.length >= MAX_MODELS) {
        return prev;
      }
      return [...prev, modelId];
    });
  }, []);
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;
    
    setIsGenerating(true);
    
    // Create generation entries for each selected model with grid positions
    const newGenerations: BrainstormGeneration[] = [];
    const existingCount = generations.length;
    
    // Calculate imageSize based on selected aspect ratio
    const getImageSizeForAspectRatio = (ratio: string) => {
      const baseWidth = BASE_CARD_WIDTH;
      switch (ratio) {
        case '16:9':
          return { width: baseWidth, height: Math.round(baseWidth / (16/9)) };
        case '9:16':
          return { width: baseWidth, height: Math.round(baseWidth / (9/16)) };
        case '1:1':
        default:
          return { width: baseWidth, height: baseWidth };
      }
    };
    
    const imageSize = getImageSizeForAspectRatio(selectedAspectRatio);
    
    for (let i = 0; i < selectedModels.length; i++) {
      const modelId = selectedModels[i];
      const model = availableModels.find(m => m.id === modelId);
      
      // Calculate grid position based on total index (existing + new)
      const position = generateGridPosition(existingCount + i);
      
      newGenerations.push({
        id: `temp-${Date.now()}-${i}`,
        modelId,
        modelName: model?.displayName || modelId,
        status: 'pending' as const,
        position,
        prompt: prompt.trim(),
        imageSize,
        mediaType,
      });
    }
    
    setGenerations(prev => [...prev, ...newGenerations]);
    
    // Helper function to create a single generation with retry
    const createGeneration = async (modelId: string, tempId: string, currentMediaType: MediaType, retryCount = 0): Promise<void> => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds
      
      try {
        // Skip models that require reference images (can't work in brainstorm without them)
        if (modelId === 'gen4-image-turbo') {
          setGenerations(prev => prev.map(g => {
            if (g.id === tempId) {
              return { ...g, status: 'failed' as const, error: 'Требуются референсы' };
            }
            return g;
          }));
          return;
        }
        
        // Default settings - aspect_ratio for all models as base
        const defaultSettings: Record<string, any> = {
          aspect_ratio: selectedAspectRatio,
        };
        
        // Determine action based on media type
        const action = currentMediaType === 'video' ? 'video_create' : 'create';
        
        // Add model-specific settings based on media type
        if (currentMediaType === 'video') {
          // Video-specific settings
          defaultSettings.duration = '5'; // Default 5 seconds
          // Some video models need specific settings
          if (modelId.includes('veo')) {
            defaultSettings.resolution = '1080p';
            defaultSettings.generate_audio = true;
          } else if (modelId.includes('hailuo')) {
            defaultSettings.resolution = '768p';
          }
        } else {
          // Image-specific settings
          if (modelId.includes('recraft')) {
            defaultSettings.size = '1024x1024';
            defaultSettings.style = 'any';
          } else if (modelId.includes('seedream')) {
            defaultSettings.size = '2K';
          } else if (modelId === 'nano-banana-pro') {
            defaultSettings.resolution = '2K';
          } else if (modelId === 'z-image-turbo') {
            defaultSettings.width = 1024;
            defaultSettings.height = 1024;
            defaultSettings.num_inference_steps = 8;
          } else if (modelId === 'imagen-4-ultra') {
            defaultSettings.safety_filter_level = 'block_only_high';
          }
        }
        
        const response = await fetch('/api/generations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action,
            model_id: modelId,
            prompt: prompt.trim(),
            settings: defaultSettings,
            workspace_id: selectedWorkspaceId,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Update the temporary generation with real data
          setGenerations(prev => prev.map(g => {
            if (g.id === tempId) {
              // Handle immediate completion (e.g., Google AI returns result immediately)
              if (result.status === 'completed' && result.output_urls?.[0]) {
                return {
                  ...g,
                  id: result.id,
                  status: 'succeeded' as const,
                  resultUrl: result.output_urls[0],
                };
              }
              return {
                ...g,
                id: result.id,
                status: result.status || 'processing',
              };
            }
            return g;
          }));
          
          // Add to global context for header indicator
          const model = (currentMediaType === 'video' ? VIDEO_CREATE_MODELS_LITE : CREATE_MODELS_LITE).find(m => m.id === modelId);
          addGeneration({
            id: result.id,
            model_name: model?.displayName || modelId,
            action: currentMediaType === 'video' ? 'video_create' : 'create',
            status: result.status || 'processing',
            created_at: new Date().toISOString(),
            viewed: false,
            output_urls: result.output_urls,
          });
        } else if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          
          // Check if it's concurrent limit (not rate limit)
          if (errorData.code === 'CONCURRENT_LIMIT_EXCEEDED') {
            showLimitToast(errorData.error);
            // Remove the pending generation from canvas
            setGenerations(prev => prev.filter(g => g.id !== tempId));
            return;
          }
          
          // Rate limit - wait and retry
          if (retryCount < MAX_RETRIES) {
            console.log(`Rate limit hit for ${modelId}, retrying in ${RETRY_DELAY}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return createGeneration(modelId, tempId, currentMediaType, retryCount + 1);
          }
          
          // Max retries exceeded
          setGenerations(prev => prev.map(g => {
            if (g.id === tempId) {
              return { ...g, status: 'failed' as const, error: errorData.error || 'Ошибка при создании' };
            }
            return g;
          }));
        } else {
          // Mark as failed
          const errorData = await response.json().catch(() => ({}));
          setGenerations(prev => prev.map(g => {
            if (g.id === tempId) {
              return { ...g, status: 'failed' as const, error: errorData.error || 'Ошибка при создании' };
            }
            return g;
          }));
        }
      } catch (error) {
        console.error('Error creating generation:', error);
        setGenerations(prev => prev.map(g => {
          if (g.id === tempId) {
            return { ...g, status: 'failed' as const, error: 'Ошибка сети' };
          }
          return g;
        }));
      }
    };
    
    // Start generations with staggered delays to avoid rate limiting
    const STAGGER_DELAY = 500; // 500ms between each request
    const currentMediaType = mediaType; // Capture current media type
    
    for (let i = 0; i < selectedModels.length; i++) {
      const modelId = selectedModels[i];
      const tempId = newGenerations[i].id;
      
      // Add delay between requests to avoid hitting rate limit
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
      }
      
      // Don't await - start in background so UI updates faster
      createGeneration(modelId, tempId, currentMediaType);
    }
  }, [prompt, selectedModels, generations, addGeneration, selectedWorkspaceId, selectedAspectRatio, mediaType, availableModels]);
  
  const handleClear = useCallback(() => {
    setGenerations([]);
    setSelectedGenerationId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  const handleGenerationClick = useCallback((generation: BrainstormGeneration) => {
    console.log('Click on generation:', {
      id: generation.id,
      status: generation.status,
      hasResultUrl: !!generation.resultUrl,
      isTemp: generation.id.startsWith('temp-'),
    });
    
    // Open modal for succeeded generations with resultUrl
    if (generation.resultUrl && !generation.id.startsWith('temp-')) {
      console.log('Opening modal');
      setModalGeneration(generation);
    } else {
      console.log('Toggling selection');
      setSelectedGenerationId(prev => prev === generation.id ? null : generation.id);
    }
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setModalGeneration(null);
  }, []);
  
  const handleNavigateToGeneration = useCallback((generation: BrainstormGeneration) => {
    setModalGeneration(generation);
    setSelectedGenerationId(generation.id);
  }, []);
  
  const handleScrollToGeneration = useCallback((generation: BrainstormGeneration) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate new pan to center the generation
    const newPanX = centerX - (generation.position.x + DEFAULT_CARD_SIZE.width / 2) * zoom;
    const newPanY = centerY - (generation.position.y + DEFAULT_CARD_SIZE.height / 2) * zoom;
    
    setPan({ x: newPanX, y: newPanY });
  }, [zoom]);
  
  const activeGenerationsCount = generations.filter(
    g => g.status === 'pending' || g.status === 'processing'
  ).length;
  
  return (
    <div className="h-screen flex flex-col bg-[#101010] relative overflow-hidden">
      <Header />
      
      {/* Canvas container - full screen below header */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Zoomable/pannable canvas */}
        <div
          ref={canvasRef}
          className="absolute canvas-background"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            backgroundImage: `radial-gradient(circle, #444 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            transition: isPanning || draggingId ? 'none' : 'transform 0.05s linear',
          }}
        >
          {/* Generation cards on the canvas */}
          {generations.map((generation) => {
            const cardDims = getCardDimensions(generation.imageSize);
            const imageWidth = cardDims.width - 8;
            const imageHeight = cardDims.height - 28;
            
            return (
              <div
                key={generation.id}
                onMouseDown={(e) => handleDragStart(e, generation.id)}
                onClick={() => {
                  console.log('Card clicked, isDragging:', isDraggingRef.current, 'hasDragged:', hasDraggedRef.current);
                  // Use refs to check drag state (avoids closure issues)
                  if (!hasDraggedRef.current) {
                    handleGenerationClick(generation);
                  }
                }}
                className={`absolute p-1 flex flex-col gap-1 select-none ${
                  draggingId === generation.id 
                    ? 'cursor-grabbing z-50 scale-105' 
                    : 'cursor-grab hover:scale-[1.02]'
                } transition-transform ${
                  selectedGenerationId === generation.id ? 'ring-2 ring-white rounded' : ''
                }`}
                style={{
                  left: generation.position.x,
                  top: generation.position.y,
                }}
              >
                <p className="font-inter font-normal text-[10px] leading-4 text-white uppercase pointer-events-none flex items-center gap-1">
                  {generation.mediaType === 'video' && <Video className="w-3 h-3" />}
                  {generation.modelName}
                </p>
<div 
                                  className="relative bg-[#1a1a1a] rounded overflow-hidden pointer-events-none"
                                  style={{ width: imageWidth, height: imageHeight }}
                                >
                                  {/* Show media if we have URL, regardless of status */}
                                  {generation.resultUrl ? (
                                    generation.mediaType === 'video' ? (
                                      <video
                                        src={generation.resultUrl}
                                        className="w-full h-full object-contain"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        onError={(e) => {
                                          console.error('Video load error:', generation.resultUrl);
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={generation.resultUrl}
                                        alt={`Generated by ${generation.modelName}`}
                                        className="w-full h-full object-contain"
                                        draggable={false}
                                        onLoad={(e) => {
                                          // Update image size if not set yet
                                          if (!generation.imageSize) {
                                            const img = e.target as HTMLImageElement;
                                            setGenerations(prev => prev.map(g => {
                                              if (g.id === generation.id && !g.imageSize) {
                                                return {
                                                  ...g,
                                                  imageSize: { width: img.naturalWidth, height: img.naturalHeight },
                                                };
                                              }
                                              return g;
                                            }));
                                          }
                                        }}
                                        onError={(e) => {
                                          console.error('Image load error:', generation.resultUrl);
                                          (e.target as HTMLImageElement).src = '';
                                        }}
                                      />
                                    )
                                  ) : generation.status === 'pending' || generation.status === 'processing' ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                                    </div>
                                  ) : generation.status === 'failed' ? (
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                      <p className="text-red-400 text-xs text-center">{generation.error || 'Ошибка'}</p>
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                                    </div>
                                  )}
                                </div>
              </div>
            );
          })}
          
          {/* Empty state - centered on canvas */}
          {generations.length === 0 && (
            <div 
              className="absolute flex flex-col items-center justify-center gap-4"
              style={{
                left: CANVAS_WIDTH / 2,
                top: CANVAS_HEIGHT / 2,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Image from Figma */}
              <img 
                src="/images/brainstorm-empty.png" 
                alt=""
                className="w-[255px] h-auto"
                draggable={false}
              />
              
              <p className="font-inter text-[#6D6D6D] text-sm whitespace-nowrap">
                Напишите промпт и выберите модели для генерации
              </p>
            </div>
          )}
        </div>
        
        {/* Zoom controls - bottom left */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#191919] rounded-lg p-1 z-30">
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a2a] transition-colors"
            title="Уменьшить"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <span className="font-inter text-xs text-[#bbbbbb] min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a2a] transition-colors"
            title="Увеличить"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      {/* Bottom input area - floating above canvas */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 lg:px-0 pb-8 z-30 pointer-events-none">
        {/* Active generations indicator */}
        {activeGenerationsCount > 0 && (
          <div className="mb-2 bg-[#191919] px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto">
            <Loader2 className="w-4 h-4 text-[#bbbbbb] animate-spin" />
            <span className="font-inter font-medium text-xs text-[#bbbbbb]">
              Генерация ({activeGenerationsCount})
            </span>
          </div>
        )}
        
        {/* Input container */}
        <div className="w-full max-w-[600px] flex flex-col gap-2 items-center pointer-events-auto">
          <div className="w-full bg-[#191919] rounded-3xl p-5 flex flex-col gap-2">
            {/* Text area */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Напишите промпт и выберите модели"
              className="w-full min-h-[72px] bg-transparent text-white font-inter text-sm placeholder:text-[#656565] resize-none outline-none"
              rows={3}
            />
            
            {/* Actions row */}
            <div className="flex items-center justify-between">
              {/* Left side - Media type toggle, Model selector and Aspect Ratio */}
              <div className="flex items-center gap-2">
                {/* Media type toggle */}
                <div className="h-9 bg-[#212121] rounded-lg flex items-center p-1">
                  <button
                    onClick={() => handleMediaTypeChange('image')}
                    className={`h-7 px-2 rounded-md flex items-center gap-1 transition-colors ${
                      mediaType === 'image' 
                        ? 'bg-[#333] text-white' 
                        : 'text-[#888] hover:text-[#bbb]'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="font-inter font-medium text-xs hidden sm:inline">Image</span>
                  </button>
                  <button
                    onClick={() => handleMediaTypeChange('video')}
                    className={`h-7 px-2 rounded-md flex items-center gap-1 transition-colors ${
                      mediaType === 'video' 
                        ? 'bg-[#333] text-white' 
                        : 'text-[#888] hover:text-[#bbb]'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span className="font-inter font-medium text-xs hidden sm:inline">Video</span>
                  </button>
                </div>
                
                {/* Models selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className="h-9 px-2 bg-[#212121] rounded-lg flex items-center gap-1 hover:bg-[#2a2a2a] transition-colors"
                  >
                    <span className="font-inter font-medium text-xs text-[#bbbbbb]">
                      Модели {selectedModels.length > 0 && `(${selectedModels.length})`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#bbbbbb]" />
                  </button>
                  
                  {/* Models dropdown */}
                  {isModelSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsModelSelectorOpen(false)}
                      />
                      <div className="absolute bottom-full left-0 mb-2 w-[313px] max-h-[480px] overflow-hidden bg-neutral-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-20 flex flex-col p-4 gap-2">
                        {/* Header with limit info and Reset */}
                        <div className="flex items-center justify-between font-inter font-medium text-xs text-[#bbbbbb]">
                          <span className={selectedModels.length >= MAX_MODELS ? 'text-yellow-500' : ''}>
                            Выбрано: {selectedModels.length}/{MAX_MODELS}
                          </span>
                          <button
                            onClick={() => setSelectedModels([])}
                            className="hover:text-white transition-colors"
                          >
                            Сбросить
                          </button>
                        </div>
                        
                        {/* Models list */}
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px]">
                          {availableModels.map((model) => {
                            const isSelected = selectedModels.includes(model.id);
                            const isDisabled = !isSelected && selectedModels.length >= MAX_MODELS;
                            return (
                              <button
                                key={model.id}
                                onClick={() => handleModelToggle(model.id)}
                                disabled={isDisabled}
                                className={`w-full h-12 rounded-xl px-4 py-2 flex items-center gap-3 transition-colors text-left bg-[#232323] ${
                                  isDisabled 
                                    ? 'opacity-40 cursor-not-allowed' 
                                    : 'hover:bg-[#2a2a2a]'
                                } ${
                                  isSelected ? 'border border-[#d6d6d6]' : ''
                                }`}
                              >
                                {isSelected && (
                                  <div className="shrink-0">
                                    <CheckIcon />
                                  </div>
                                )}
                                <span className="flex-1 font-inter font-normal text-sm text-white">
                                  {model.displayName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Aspect Ratio selector */}
                <div className="relative">
                  <button
                    onClick={() => setIsAspectRatioSelectorOpen(!isAspectRatioSelectorOpen)}
                    className="h-9 px-2 bg-[#212121] rounded-lg flex items-center gap-1 hover:bg-[#2a2a2a] transition-colors"
                  >
                    <span className="font-inter font-medium text-xs text-[#bbbbbb]">
                      {selectedAspectRatio}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#bbbbbb]" />
                  </button>
                  
                  {/* Aspect Ratio dropdown */}
                  {isAspectRatioSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10"
                        onClick={() => setIsAspectRatioSelectorOpen(false)}
                      />
                      <div className="absolute bottom-full left-0 mb-2 w-[100px] bg-neutral-900 rounded-xl shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-20 flex flex-col p-2 gap-1">
                        {ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio.value}
                            onClick={() => {
                              setSelectedAspectRatio(ratio.value);
                              setIsAspectRatioSelectorOpen(false);
                            }}
                            className={`w-full h-8 rounded-lg px-3 py-1 flex items-center justify-center transition-colors text-center ${
                              selectedAspectRatio === ratio.value 
                                ? 'bg-[#333] text-white' 
                                : 'bg-[#232323] hover:bg-[#2a2a2a] text-[#bbbbbb]'
                            }`}
                          >
                            <span className="font-inter font-medium text-xs">
                              {ratio.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right side - Clear and Generate */}
              <div className="flex items-center gap-2">
                {/* Clear button */}
                <button
                  onClick={handleClear}
                  disabled={generations.length === 0}
                  className="w-9 h-9 border border-[#7d7d7d] rounded-lg flex items-center justify-center hover:bg-[#212121] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Очистить доску"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
                
                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || selectedModels.length === 0 || isGenerating}
                  className="h-9 px-2 bg-white rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Helper text */}
          <p className="font-inter font-medium text-[11px] leading-5 text-[#414141] text-center">
            Генерация {mediaType === 'video' ? 'видео' : 'изображений'} в нескольких моделях одновременно
          </p>
        </div>
      </div>
      
      {/* Image Sheet */}
      <BrainstormImageSheet
        generation={modalGeneration}
        allGenerations={generations}
        isOpen={!!modalGeneration}
        onClose={handleCloseModal}
        onNavigate={handleNavigateToGeneration}
        onScrollToGeneration={handleScrollToGeneration}
      />
    </div>
  );
}
