'use client';

import { memo, useCallback, useState, useMemo, useEffect } from 'react';
import { Handle, Position, useEdges, useNodes } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { ReactFlowNodeData, FlowNodeStatus } from '@/lib/flow/types';
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, Plus, Play, RefreshCw, Expand, Download, Video as VideoIcon, Link, ArrowLeftRight } from 'lucide-react';
import Image from 'next/image';
import { NodeAuthorBadge } from './node-author-badge';

type FlowVideoNodeType = Node<ReactFlowNodeData, 'flow-video'>;

// T2V models (Text to Video) - used when only text/prompt is provided
// supportsAspectRatio - whether the model accepts aspect_ratio parameter
const T2V_MODELS = [
  { id: 'seedance-1.5-pro-t2v', label: 'Seedance 1.5 Pro', supportsAspectRatio: false },
  { id: 'kling-v2.5-turbo-pro-t2v', label: 'Kling 2.5 Pro', supportsAspectRatio: true },
  { id: 'kling-v2.1-master-t2v', label: 'Kling 2.1 Master', supportsAspectRatio: true },
  { id: 'hailuo-2.3-t2v', label: 'Hailuo 2.3', supportsAspectRatio: false },
  { id: 'hailuo-02-t2v', label: 'Hailuo 02', supportsAspectRatio: false },
  { id: 'wan-2.5-t2v', label: 'Wan 2.5', supportsAspectRatio: false },
  { id: 'kling-v2.0-t2v', label: 'Kling 2.0', supportsAspectRatio: true },
  { id: 'veo-3.1-fast', label: 'Veo 3.1 Fast', supportsAspectRatio: true },
];

// I2V models (Image to Video) - used when 1 image is connected
// For I2V, aspect ratio is determined by the input image
const I2V_MODELS = [
  { id: 'seedance-1.5-pro-i2v', label: 'Seedance 1.5 Pro', supportsAspectRatio: false },
  { id: 'kling-v2.5-turbo-pro-i2v', label: 'Kling 2.5 Pro', supportsAspectRatio: false },
  { id: 'kling-v2.1-master-i2v', label: 'Kling 2.1 Master', supportsAspectRatio: false },
  { id: 'hailuo-2.3-fast-i2v', label: 'Hailuo 2.3 Fast', supportsAspectRatio: false },
  { id: 'hailuo-02-i2v', label: 'Hailuo 02', supportsAspectRatio: false },
  { id: 'wan-2.5-i2v-fast', label: 'Wan 2.5 Fast', supportsAspectRatio: false },
  { id: 'gen4-turbo-i2v', label: 'Runway Gen4', supportsAspectRatio: false },
  { id: 'seedance-1-pro-fast', label: 'Seedance 1 Pro Fast', supportsAspectRatio: false },
];

// Keyframe models (First + Last frame) - used when 2 images are connected
// For keyframes, aspect ratio is determined by input images
const KEYFRAME_MODELS = [
  { id: 'kling-v2.5-turbo-pro-i2v', label: 'Kling 2.5 Pro', supportsAspectRatio: false },
  { id: 'kling-v2.1-master-i2v', label: 'Kling 2.1 Master', supportsAspectRatio: false },
  { id: 'kling-1.0-i2v-fal', label: 'Kling 1.0', supportsAspectRatio: false },
];

const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const QUALITY_OPTIONS = ['4k', '2k', '1k'];
const DURATION_OPTIONS = [
  { id: '5', label: '5 сек' },
  { id: '10', label: '10 сек' },
  { id: '15', label: '15 сек' },
];

function FlowVideoNodeComponent({ id, data, selected }: NodeProps<FlowVideoNodeType>) {
  const { selectNode, updateNodeData, runGeneration } = useFlowStore();
  const [isHovered, setIsHovered] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Initialize from saved state
  const [framesSwapped, setFramesSwapped] = useState(data.settings?.framesSwapped || false);
  
  // Get connected source nodes to show inherited prompt
  const edges = useEdges();
  const nodes = useNodes();
  
  // Get inherited data from connected nodes (supports multiple images for keyframes)
  const { inheritedPrompt, connectedImages } = useMemo(() => {
    const inputEdges = edges.filter(e => e.target === id);
    let prompt: string | undefined;
    const images: string[] = [];
    
    console.log('[Flow Video Node] Checking connections for node:', id, 'edges:', inputEdges.length);
    
    for (const edge of inputEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode?.data) {
        console.log('[Flow Video Node] Source node not found for edge:', edge.source);
        continue;
      }
      
      const nodeData = sourceNode.data as ReactFlowNodeData;
      console.log('[Flow Video Node] Source node:', edge.source, 'type:', nodeData.blockType, 'outputUrl:', nodeData.outputUrl, 'output:', nodeData.output);
      
      // Get prompt from text node
      if (nodeData.blockType === 'text' && !prompt) {
        prompt = nodeData.outputText || nodeData.prompt || nodeData.output as string;
      }
      
      // Get ALL images from image nodes (for keyframes support)
      if (nodeData.blockType === 'image') {
        const imageUrl = nodeData.outputUrl || nodeData.output as string;
        if (imageUrl) {
          images.push(imageUrl);
          console.log('[Flow Video Node] ✓ Found connected image:', imageUrl);
        } else {
          console.log('[Flow Video Node] ✗ Image node found but no outputUrl. Status:', nodeData.status, 'Full data:', nodeData);
        }
      }
    }
    
    console.log('[Flow Video Node] Final connectedImages:', images.length, images);
    return { inheritedPrompt: prompt, connectedImages: images };
  }, [edges, nodes, id]);
  
  // Determine frames based on swap state
  const firstFrameUrl = framesSwapped ? connectedImages[1] : connectedImages[0];
  const lastFrameUrl = framesSwapped ? connectedImages[0] : connectedImages[1];
  const inheritedImageUrl = firstFrameUrl; // For single image mode, use first frame
  
  // Handle frame swap - also save to node data for generation
  const handleSwapFrames = useCallback(() => {
    setFramesSwapped((prev: boolean) => {
      const newValue = !prev;
      updateNodeData(id, { 
        settings: { ...data.settings, framesSwapped: newValue } 
      });
      return newValue;
    });
  }, [id, data.settings, updateNodeData]);
  
  const handleClick = useCallback(() => {
    selectNode(id);
  }, [id, selectNode]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { prompt: e.target.value });
  }, [id, updateNodeData]);

  const handleSettingChange = useCallback((key: string, value: string) => {
    updateNodeData(id, { 
      settings: { ...data.settings, [key]: value },
      modelId: key === 'model' ? value : data.modelId,
    });
    setOpenDropdown(null);
  }, [id, data.settings, data.modelId, updateNodeData]);

  const handleStartGeneration = useCallback(async () => {
    await runGeneration(id);
  }, [id, runGeneration]);

  // Regenerate - run generation again
  const handleRegenerate = useCallback(async () => {
    await runGeneration(id);
  }, [id, runGeneration]);

  // Download the output video
  const handleDownload = useCallback(async () => {
    const url = data.outputUrl;
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${id}.mp4`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [id, data.outputUrl]);

  // Open video fullscreen
  const handleFullscreen = useCallback(() => {
    const video = document.querySelector(`#video-${id}`) as HTMLVideoElement;
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      }
    }
  }, [id]);

  // Determine mode: keyframe (2 images), i2v (1 image), t2v (no images)
  const isKeyframeMode = connectedImages.length >= 2;
  const isI2VMode = connectedImages.length === 1;
  const availableModels = isKeyframeMode ? KEYFRAME_MODELS : (isI2VMode ? I2V_MODELS : T2V_MODELS);
  
  // Debug logging
  useEffect(() => {
    if (connectedImages.length > 0) {
      console.log('[Flow Video Node] Connected images:', connectedImages.length, connectedImages);
      console.log('[Flow Video Node] isI2VMode:', isI2VMode, 'inheritedImageUrl:', inheritedImageUrl);
    }
  }, [connectedImages.length, isI2VMode, inheritedImageUrl]);
  
  // Find current model in available models, or use first one as default
  const currentModel = availableModels.find(m => m.id === (data.settings?.model || data.modelId)) || availableModels[0];
  const currentRatio = data.settings?.aspectRatio || '16:9';
  const currentQuality = data.settings?.quality || '2k';
  const currentDuration = DURATION_OPTIONS.find(d => d.id === (data.settings?.duration || '5')) || DURATION_OPTIONS[0];
  
  // Display prompt: own prompt or inherited from connected node
  const displayPrompt = data.prompt || inheritedPrompt || '';

  const statusColors: Record<FlowNodeStatus, string> = {
    idle: 'border-transparent',
    pending: 'border-transparent',
    processing: 'border-transparent',
    running: 'border-transparent',
    succeeded: 'border-transparent',
    completed: 'border-transparent',
    failed: 'border-red-500',
  };

  const hasOutput = !!(data.outputUrl || data.output);

  return (
    <div
      className="relative"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={(e) => {
        // Don't hide if moving to plus icons or settings bar
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !(relatedTarget instanceof Node)) {
          setIsHovered(false);
          setOpenDropdown(null);
          return;
        }
        // Check if related target is within our expanded hover area
        const container = e.currentTarget;
        if (container instanceof Node && !container.contains(relatedTarget)) {
          setIsHovered(false);
          setOpenDropdown(null);
        }
      }}
      style={{ 
        padding: '0 60px 80px 60px', 
        margin: '0 -60px 0 -60px',
        // Expanded hover area
        pointerEvents: 'auto'
      }}
    >
      {/* Author badge - показываем сверху ноды */}
      {data.createdByEmail && (
        <div className="mb-1.5 flex justify-center">
          <NodeAuthorBadge email={data.createdByEmail} />
        </div>
      )}

      {/* Main block */}
      <div
        className={cn(
          'w-[356px] rounded-2xl bg-[#1C1C1C] p-3 relative',
          'shadow-[0px_9px_30px_0px_rgba(0,0,0,0.16)]',
          'backdrop-blur-[20px]',
          'border-2 transition-colors',
          selected ? 'border-white/30' : statusColors[data.status || 'idle'],
          data.status === 'running' && 'animate-pulse-glow'
        )}
      >
        {/* Handles for connections - positioned on block border, visible on hover */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ left: '0', transform: 'translate(-50%, -50%)' }}
          className={cn(
            "!w-6 !h-6 !rounded-full !bg-transparent !border-none !cursor-crosshair transition-opacity duration-200",
            isHovered ? "!opacity-100" : "!opacity-0"
          )}
        />
        <div 
          className={cn(
            "absolute top-1/2 left-0 w-6 h-6 rounded-full border border-white/30 bg-white/5 pointer-events-none transition-opacity duration-200 z-30",
            "transform -translate-x-1/2 -translate-y-1/2",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Plus className="w-6 h-6 text-white/50 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" strokeWidth={2} />
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ right: '0', transform: 'translate(50%, -50%)' }}
          className={cn(
            "!w-6 !h-6 !rounded-full !bg-transparent !border-none !cursor-crosshair transition-opacity duration-200",
            isHovered ? "!opacity-100" : "!opacity-0"
          )}
        />
        <div 
          className={cn(
            "absolute top-1/2 right-0 w-6 h-6 rounded-full border border-white/30 bg-white/5 pointer-events-none transition-opacity duration-200 z-30",
            "transform translate-x-1/2 -translate-y-1/2",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Plus className="w-6 h-6 text-white/50 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" strokeWidth={2} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-1">
            <VideoIcon className="w-3 h-3 text-white" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
              видео
            </span>
            {isKeyframeMode && (
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-purple-400 ml-1">
                keyframe
              </span>
            )}
            {isI2VMode && (
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-green-400 ml-1">
                i2v
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white">
              {currentModel.label}
            </span>
            {data.status === 'running' && (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            )}
          </div>
        </div>

        {/* Video output - only show when generation is complete, adapts to aspect ratio */}
        {hasOutput && (
          <div 
            className="relative w-full rounded-lg overflow-hidden mb-3 bg-black group"
            style={{ 
              // Only set aspect ratio if model supports it, otherwise use auto (video determines its own size)
              aspectRatio: currentModel.supportsAspectRatio ? currentRatio.replace(':', '/') : 'auto'
            }}
            onMouseEnter={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) {
                video.play();
              }
            }}
            onMouseLeave={(e) => {
              const video = e.currentTarget.querySelector('video');
              if (video) {
                video.pause();
                video.currentTime = 0;
              }
            }}
          >
            <video
              id={`video-${id}`}
              src={data.outputUrl || data.output || ''}
              className="w-full h-full object-contain"
              controls={false}
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-200">
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" fill="white" />
              </div>
            </div>
          </div>
        )}

        {/* Prompt field */}
        <div className="bg-[#101010] rounded-lg p-3 min-h-[80px] relative">
          {inheritedPrompt ? (
            // Show inherited prompt from connected text node
            <div className="text-white text-sm leading-6">
              <div className="flex items-center gap-1 text-[10px] text-[#959595] mb-1">
                <Link className="w-3 h-3" />
                <span>из связанного нода:</span>
              </div>
              <p className="whitespace-pre-wrap">{inheritedPrompt}</p>
            </div>
          ) : (
            <textarea
              value={data.prompt || ''}
              onChange={handlePromptChange}
              placeholder="Напишите промпт для начала генерации..."
              className="nodrag w-full bg-transparent text-white text-sm resize-none outline-none placeholder:text-[#656565] leading-6"
              rows={3}
            />
          )}
        </div>

        {/* Keyframe mode: show first and last frames with swap button */}
        {isKeyframeMode && firstFrameUrl && lastFrameUrl && (
          <div className="flex items-center gap-2 mt-3">
            {/* First frame */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#101010] flex-shrink-0">
                <Image
                  src={firstFrameUrl}
                  alt="First frame"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-[10px] text-[#959595] uppercase tracking-wider">1-й кадр</span>
            </div>
            
            {/* Swap button */}
            <button
              onClick={handleSwapFrames}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Поменять местами"
            >
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </button>
            
            {/* Last frame */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#101010] flex-shrink-0">
                <Image
                  src={lastFrameUrl}
                  alt="Last frame"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-[10px] text-[#959595] uppercase tracking-wider">посл. кадр</span>
            </div>
          </div>
        )}
        
        {/* Single image mode: show one thumbnail */}
        {isI2VMode && (
          <div className="mt-3">
            {inheritedImageUrl ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#101010] flex-shrink-0">
                <Image
                  src={inheritedImageUrl}
                  alt="Source image"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#101010] flex-shrink-0 flex items-center justify-center border border-dashed border-[#333]">
                <span className="text-[10px] text-[#666] text-center px-2">Ожидание картинки...</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom hint with start button */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-[#959595] leading-[1.7142857142857142em]">
            {isKeyframeMode 
              ? 'переход между кадрами' 
              : (isI2VMode ? 'анимировать картинку' : 'напиши промпт для создания видео')}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartGeneration();
            }}
            disabled={(!data.prompt && !inheritedPrompt && !inheritedImageUrl) || data.status === 'running'}
            className={cn(
              "w-6 h-6 rounded-full border border-white/[0.02] flex items-center justify-center",
              "hover:bg-white/5 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-95"
            )}
            style={{ 
              padding: '4.235294342041016px',
              gap: '7.058823585510254px'
            }}
          >
            <Play 
              className={cn(
                "w-4 h-4 text-white",
                data.status === 'running' && "animate-pulse"
              )} 
              fill="white"
            />
          </button>
        </div>

        {/* Settings bar on hover - fade in, 16px gap */}
        <div 
          className={cn(
            "absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 flex items-center gap-1 transition-opacity duration-200 z-40",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onMouseEnter={() => setIsHovered(true)}
        >
        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
            className={cn(
              'flex items-center h-10 p-1 rounded-xl bg-[#212121]',
              openDropdown === 'model' && 'ring-1 ring-white'
            )}
          >
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] leading-[1.4em] text-white whitespace-nowrap">
                {currentModel.label}
              </span>
              <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
            </div>
          </button>
          {openDropdown === 'model' && (
            <div className="absolute top-full mt-2 left-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] min-w-[200px] z-50">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2">
                {isI2VMode ? 'Картинка → Видео' : 'Текст → Видео'}
              </p>
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSettingChange('model', model.id)}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-xl text-sm text-white',
                    'bg-[#232323] hover:bg-[#2a2a2a] mb-2 last:mb-0',
                    currentModel.id === model.id && 'ring-1 ring-[#D6D6D6]'
                  )}
                >
                  {model.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aspect ratio - only show for models that support it */}
        {currentModel.supportsAspectRatio && (
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'ratio' ? null : 'ratio')}
              className={cn(
                'flex items-center h-10 p-1 rounded-xl bg-[#212121]',
                openDropdown === 'ratio' && 'ring-1 ring-white'
              )}
            >
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] leading-[1.4em] text-white">
                  {currentRatio}
                </span>
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            </button>
            {openDropdown === 'ratio' && (
              <div className="absolute top-full mt-2 left-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-50">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2">
                  Формат
                </p>
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => handleSettingChange('aspectRatio', ratio)}
                    className={cn(
                      'w-full text-left px-4 py-2 rounded-xl text-sm text-white',
                      'bg-[#232323] hover:bg-[#2a2a2a] mb-2 last:mb-0',
                      currentRatio === ratio && 'ring-1 ring-[#D6D6D6]'
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quality */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'quality' ? null : 'quality')}
            className={cn(
              'flex items-center h-10 p-1 rounded-xl bg-[#212121]',
              openDropdown === 'quality' && 'ring-1 ring-white'
            )}
          >
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] leading-[1.4em] text-white">
                {currentQuality}
              </span>
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </button>
          {openDropdown === 'quality' && (
            <div className="absolute top-full mt-2 left-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-50">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2">
                качество
              </p>
              {QUALITY_OPTIONS.map((quality) => (
                <button
                  key={quality}
                  onClick={() => handleSettingChange('quality', quality)}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-xl text-sm text-white',
                    'bg-[#232323] hover:bg-[#2a2a2a] mb-2 last:mb-0',
                    currentQuality === quality && 'ring-1 ring-[#D6D6D6]'
                  )}
                >
                  {quality}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'duration' ? null : 'duration')}
            className={cn(
              'flex items-center h-10 p-1 rounded-xl bg-[#212121]',
              openDropdown === 'duration' && 'ring-1 ring-white'
            )}
          >
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] leading-[1.4em] text-white whitespace-nowrap">
                {currentDuration.label}
              </span>
              <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
            </div>
          </button>
          {openDropdown === 'duration' && (
            <div className="absolute top-full mt-2 left-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-50">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2">
                длительность
              </p>
              {DURATION_OPTIONS.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => handleSettingChange('duration', duration.id)}
                  className={cn(
                    'w-full text-left px-4 py-2 rounded-xl text-sm text-white',
                    'bg-[#232323] hover:bg-[#2a2a2a] mb-2 last:mb-0',
                    currentDuration.id === duration.id && 'ring-1 ring-[#D6D6D6]'
                  )}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons when output exists */}
        {hasOutput && (
          <div className="flex items-center h-10 rounded-xl bg-[#212121] overflow-hidden">
            <button 
              onClick={handleRegenerate}
              className="h-full px-3 hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
              title="Сгенерировать заново"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
            <div className="w-px h-4 bg-[#2F2F2F]" />
            <button 
              onClick={handleFullscreen}
              className="h-full px-3 hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
              title="Открыть на весь экран"
            >
              <Expand className="w-4 h-4 text-white" />
            </button>
            <div className="w-px h-4 bg-[#2F2F2F]" />
            <button 
              onClick={handleDownload}
              className="h-full px-3 hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
              title="Скачать"
            >
              <Download className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
        </div>

      </div>
    </div>
  );
}

export const FlowVideoNode = memo(FlowVideoNodeComponent);
