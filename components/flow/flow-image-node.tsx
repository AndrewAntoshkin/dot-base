'use client';

import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, useEdges, useNodes, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { ReactFlowNodeData, FlowNodeStatus } from '@/lib/flow/types';
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';
import { Loader2, ChevronDown, ImagePlus, RefreshCw, Expand, Download, FileImage, Play, Link, X } from 'lucide-react';
import Image from 'next/image';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { NodeAuthorBadge } from './node-author-badge';
import { FlowCommentMarker } from './flow-comment-marker';
import { FlowCommentThread } from './flow-comment-thread';
import { useCommentsStore } from '@/lib/flow/comments-store';

type FlowImageNodeType = Node<ReactFlowNodeData, 'flow-image'>;

// Draggable References Grid Component
interface DraggableReferencesGridProps {
  images: string[];
  maxImages: number;
  onReorder: (images: string[]) => void;
  onRemove: (index: number) => void;
}

function DraggableReferencesGrid({ images, maxImages, onReorder, onRemove }: DraggableReferencesGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);
    
    onReorder(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="mt-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2 flex items-center justify-between">
        <span>Загружено: {images.length} из {maxImages}</span>
        <span className="text-[9px] normal-case tracking-normal opacity-70">⌘V для вставки</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, index) => (
          <div 
            key={index} 
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative w-full aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150",
              draggedIndex === index && "opacity-50 scale-95",
              dragOverIndex === index && "ring-2 ring-white ring-offset-2 ring-offset-[#171717]"
            )}
          >
            <Image src={url} alt={`Reference ${index + 1}`} fill className="object-cover" />
            {/* Index badge */}
            <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-[9px] font-medium text-white">
              {index + 1}
            </div>
            <button
              className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Model options - must match ids from models-config.ts
// Models with reference image support
interface ImageModel {
  id: string;
  label: string;
  supportsReferences: boolean;
  maxReferences?: number;
  referenceField?: string; // API field name for references
}

const IMAGE_MODELS: ImageModel[] = [
  { id: 'nano-banana-pro', label: 'Nano Banana Pro', supportsReferences: true, maxReferences: 14, referenceField: 'image_input' },
  { id: 'nano-banana', label: 'Nano Banana', supportsReferences: true, maxReferences: 3, referenceField: 'image_input' },
  { id: 'flux-2-max', label: 'FLUX 2 Max', supportsReferences: true, maxReferences: 8, referenceField: 'input_images' },
  { id: 'flux-2-pro', label: 'FLUX 2 Pro', supportsReferences: true, maxReferences: 8, referenceField: 'input_images' },
  { id: 'imagen-4-ultra', label: 'Imagen 4', supportsReferences: false },
  { id: 'ideogram-v3-turbo', label: 'Ideogram V3', supportsReferences: true, maxReferences: 5, referenceField: 'style_reference_images' },
  { id: 'recraft-v3', label: 'Recraft V3', supportsReferences: false },
];

const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'];
const QUALITY_OPTIONS = ['4K', '2K', '1K'];

function FlowImageNodeComponent({ id, data, selected }: NodeProps<FlowImageNodeType>) {
  const { selectNode, updateNodeData, runGeneration, flowId } = useFlowStore();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  
  // Comments
  const { 
    comments, 
    currentUserId, 
    openThreadNodeId,
    startAddingComment, 
    openThread,
    closeThread,
  } = useCommentsStore();
  const nodeComments = comments.filter(c => c.node_id === id);
  const isThreadOpen = openThreadNodeId === id;
  
  // Update node internals after mount to sync handle positions
  // Use requestAnimationFrame to ensure CSS is applied first
  useEffect(() => {
    // Double RAF to ensure styles are computed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateNodeInternals(id);
      });
    });
  }, [id, updateNodeInternals]);
  
  // Get connected source nodes to show inherited prompt
  const edges = useEdges();
  const nodes = useNodes();
  
  const inheritedPrompt = useMemo(() => {
    const inputEdges = edges.filter(e => e.target === id);
    for (const edge of inputEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode?.data?.blockType === 'text') {
        const textData = sourceNode.data as ReactFlowNodeData;
        // Priority: AI output > manual prompt > legacy output
        return textData.outputText || textData.prompt || textData.output as string;
      }
    }
    return undefined;
  }, [edges, nodes, id]);
  
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

  // Download the output image
  const handleDownload = useCallback(async () => {
    const url = data.outputUrl;
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${id}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [id, data.outputUrl]);

  const currentModel = IMAGE_MODELS.find(m => m.id === (data.settings?.model || data.modelId)) || IMAGE_MODELS[0];
  const currentRatio = data.settings?.aspectRatio || '1:1';
  const currentQuality = data.settings?.quality || '2k';
  
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

  // Состояние hover для маркера комментариев
  const [isMarkerHovered, setIsMarkerHovered] = useState(false);
  const effectiveHover = isHovered || isMarkerHovered;

  return (
    <div
      ref={nodeRef}
      className="relative group pb-16 overflow-visible"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setOpenDropdown(null);
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
        {/* Left handle - styled via CSS */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
        />
        
        {/* Right handle - styled via CSS */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
        />
        {/* Header */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-1">
            <FileImage className="w-3 h-3 text-white" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
              изображение
            </span>
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

        {/* Image output if exists - adapts to aspect ratio */}
        {hasOutput && (
          <div 
            className="relative w-full rounded-lg overflow-hidden mb-3 bg-[#101010]"
            style={{ 
              aspectRatio: currentRatio.replace(':', '/') 
            }}
          >
            <Image
              src={data.outputUrl || data.output || ''}
              alt="Generated image"
              fill
              className="object-contain"
            />
            {data.status === 'running' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {/* Prompt field */}
        <div className="bg-[#101010] rounded-lg p-3 min-h-[80px] relative">
          {inheritedPrompt && !data.prompt ? (
            // Show inherited prompt from connected node
            <div className="text-white/70 text-sm leading-6">
              <div className="flex items-center gap-1 text-[10px] text-[#959595] mb-1">
                <Link className="w-3 h-3" />
                <span>из связанного нода:</span>
              </div>
              <p className="line-clamp-3">{inheritedPrompt}</p>
            </div>
          ) : (
            <textarea
              value={data.prompt || ''}
              onChange={handlePromptChange}
              placeholder={inheritedPrompt ? "Дополнительный промпт..." : "Напишите промпт для начала генерации..."}
              className="nodrag w-full bg-transparent text-white text-sm resize-none outline-none placeholder:text-[#656565] leading-6"
              rows={3}
            />
          )}
        </div>

        {/* Bottom hint with start button */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-[#959595] leading-[1.7142857142857142em]">
            напиши промпт для создания картинки
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartGeneration();
            }}
            disabled={(!data.prompt && !inheritedPrompt) || data.status === 'running'}
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

        {/* Settings bar on hover - fade in, 16px gap from block */}
        <div 
          className={cn(
            "absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 flex items-center gap-1 transition-opacity duration-200 z-40",
            "opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none"
          )}
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
          {/* Dropdown opens DOWN */}
          {openDropdown === 'model' && (
            <div className="absolute top-full mt-2 left-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] min-w-[200px] z-50">
              {IMAGE_MODELS.map((model) => (
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

        {/* Aspect ratio */}
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
                Формат (aspect ratio)
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

        {/* References button - only show if model supports references */}
        {currentModel.supportsReferences && (
          <div className="relative">
            <button 
              onClick={() => setIsReferencesOpen(!isReferencesOpen)}
              className={cn(
                "flex items-center h-10 p-0.5 rounded-xl bg-[#212121]",
                isReferencesOpen && "ring-1 ring-white"
              )}
            >
              {/* Show thumbnails if images are uploaded */}
              {data.referenceImages && data.referenceImages.length > 0 ? (
                <div className="flex items-center">
                  {data.referenceImages.slice(0, 4).map((url, index) => (
                    <div 
                      key={index}
                      className="w-9 h-9 rounded-[10px] overflow-hidden border-2 border-[#212121] -ml-[17.78px] first:ml-0"
                    >
                      <Image src={url} alt="" width={36} height={36} className="object-cover w-full h-full" />
                    </div>
                  ))}
                  {data.referenceImages.length > 4 && (
                    <div className="w-9 h-9 rounded-[10px] bg-[#101010] border-2 border-[#212121] -ml-[17.78px] flex items-center justify-center">
                      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white">
                        +{data.referenceImages.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2">
                  <ImagePlus className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] leading-[1.4em] text-white">
                    Референсы
                  </span>
                </div>
              )}
            </button>
            
            {/* References dropdown - same as quality dropdown */}
            {isReferencesOpen && (
              <div 
                className="absolute top-full mt-2 right-0 bg-[#171717] rounded-2xl p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-50 min-w-[320px]"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-4">
                  референсные изображения
                </p>
                
                {/* Drop zone */}
                <div 
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-lg border border-dashed border-[#656565] bg-[#101010] cursor-pointer hover:border-white/50 hover:bg-white/5 transition-colors"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'image/*';
                    input.onchange = async (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (!files) return;
                      const maxImages = currentModel.maxReferences || 8;
                      const currentImages = data.referenceImages || [];
                      const remainingSlots = maxImages - currentImages.length;
                      const filesToUpload = Array.from(files).slice(0, remainingSlots);
                      
                      const uploadedUrls = await Promise.all(
                        filesToUpload.map((file) => {
                          return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });
                        })
                      );
                      updateNodeData(id, { referenceImages: [...currentImages, ...uploadedUrls] });
                    };
                    input.click();
                  }}
                >
                  <ImagePlus className="w-6 h-6 text-white/50" />
                  <p className="text-sm font-medium text-white text-center">
                    Перетащите или выберите изображения
                  </p>
                  <p className="text-xs text-[#959595] text-center">
                    {(currentModel.maxReferences || 8) - (data.referenceImages?.length || 0)} из {currentModel.maxReferences || 8} доступно
                  </p>
                </div>
                
                {/* Uploaded images grid with drag-and-drop reordering */}
                {data.referenceImages && data.referenceImages.length > 0 && (
                  <DraggableReferencesGrid 
                    images={data.referenceImages}
                    maxImages={currentModel.maxReferences || 8}
                    onReorder={(newImages) => updateNodeData(id, { referenceImages: newImages })}
                    onRemove={(index) => {
                      const updatedImages = data.referenceImages?.filter((_, i) => i !== index) || [];
                      updateNodeData(id, { referenceImages: updatedImages });
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

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
              onClick={() => setIsFullscreenOpen(true)}
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

      {/* Comment marker - справа от ноды (через NodeToolbar) */}
      <FlowCommentMarker
        nodeId={id}
        comments={nodeComments}
        currentUserId={currentUserId || undefined}
        isHovered={effectiveHover}
        onAddComment={() => startAddingComment(id)}
        onOpenThread={() => openThread(id)}
        onMarkerHover={setIsMarkerHovered}
      />

      {/* Comment thread popup - через Portal */}
      {isThreadOpen && flowId && (
        <FlowCommentThread
          flowId={flowId}
          nodeId={id}
          nodeRef={nodeRef}
          onClose={closeThread}
        />
      )}
      
      {/* Fullscreen Image Viewer */}
      {data.outputUrl && (
        <ImageFullscreenViewer
          imageUrl={data.outputUrl}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          alt="Generated image"
        />
      )}
    </div>
  );
}

export const FlowImageNode = memo(FlowImageNodeComponent);
