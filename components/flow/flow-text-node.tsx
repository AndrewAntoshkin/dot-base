'use client';

import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, useEdges, useNodes, useUpdateNodeInternals } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { ReactFlowNodeData, FlowNodeStatus } from '@/lib/flow/types';
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';
import { Loader2, FileText, Play, ImagePlus, X, Video, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { NodeAuthorBadge } from './node-author-badge';
import { FlowCommentMarker } from './flow-comment-marker';
import { FlowCommentThread } from './flow-comment-thread';
import { useCommentsStore } from '@/lib/flow/comments-store';

type FlowTextNodeType = Node<ReactFlowNodeData, 'flow-text'>;

// Fixed model for text generation
const TEXT_MODEL = { id: 'gemini-2.5-flash', label: 'Gemini 3 Pro' };

// Media item type
interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

function FlowTextNodeComponent({ id, data, selected }: NodeProps<FlowTextNodeType>) {
  const { selectNode, updateNodeData, runGeneration, flowId } = useFlowStore();
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  // Copy text to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);
  
  // Get connected source nodes to detect images/videos
  const edges = useEdges();
  const nodes = useNodes();
  
  // Get data from connected nodes (text, images, videos)
  const { connectedMedia, inheritedText } = useMemo(() => {
    const inputEdges = edges.filter(e => e.target === id);
    const media: MediaItem[] = [];
    let text: string | undefined;
    
    for (const edge of inputEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode?.data) continue;
      
      const nodeData = sourceNode.data as ReactFlowNodeData;
      
      // Get text from text node (AI output or manual prompt)
      if (nodeData.blockType === 'text' && !text) {
        text = nodeData.outputText || nodeData.prompt;
      }
      
      // Get image from image node
      if (nodeData.blockType === 'image' && nodeData.outputUrl) {
        media.push({ url: nodeData.outputUrl, type: 'image' });
      }
      
      // Get video from video node
      if (nodeData.blockType === 'video' && nodeData.outputUrl) {
        media.push({ url: nodeData.outputUrl, type: 'video' });
      }
    }
    
    return { connectedMedia: media, inheritedText: text };
  }, [edges, nodes, id]);
  
  // Uploaded media stored in node data
  const uploadedMedia: MediaItem[] = data.uploadedMedia || [];
  
  // Combined media for display
  const allMedia = [...connectedMedia, ...uploadedMedia];
  const hasMedia = allMedia.length > 0;
  
  const handleClick = useCallback(() => {
    selectNode(id);
  }, [id, selectNode]);

  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { prompt: e.target.value });
  }, [id, updateNodeData]);

  const handleStartGeneration = useCallback(async () => {
    await runGeneration(id);
  }, [id, runGeneration]);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newMedia: MediaItem[] = [];
    
    for (const file of Array.from(files)) {
      // Check file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) continue;
      
      // Convert to data URL for now (could upload to storage later)
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      newMedia.push({ url, type: isImage ? 'image' : 'video' });
    }
    
    if (newMedia.length > 0) {
      updateNodeData(id, { 
        uploadedMedia: [...uploadedMedia, ...newMedia]
      });
    }
    
    setIsUploading(false);
  }, [id, uploadedMedia, updateNodeData]);
  
  // Remove uploaded media
  const handleRemoveMedia = useCallback((index: number) => {
    const updated = uploadedMedia.filter((_, i) => i !== index);
    updateNodeData(id, { uploadedMedia: updated });
  }, [id, uploadedMedia, updateNodeData]);

  const statusColors: Record<FlowNodeStatus, string> = {
    idle: 'border-transparent',
    pending: 'border-transparent',
    processing: 'border-transparent',
    running: 'border-transparent',
    succeeded: 'border-transparent',
    completed: 'border-transparent',
    failed: 'border-red-500',
  };
  
  // Dynamic placeholder based on attached media
  const placeholder = hasMedia 
    ? 'Задай вопрос по картинке/видео...' 
    : 'Напиши текст или промпт для AI...';

  // Состояние hover для маркера комментариев
  const [isMarkerHovered, setIsMarkerHovered] = useState(false);
  const effectiveHover = isHovered || isMarkerHovered;

  return (
    <div
      ref={nodeRef}
      className="relative group overflow-visible"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
            <FileText className="w-3 h-3 text-white" />
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
              текст
            </span>
            {hasMedia && (
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-blue-400 ml-1">
                + медиа
              </span>
            )}
            {inheritedText && !hasMedia && (
              <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-yellow-400 ml-1">
                + текст
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white">
              {TEXT_MODEL.label}
            </span>
            {data.status === 'running' && (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            )}
          </div>
        </div>

        {/* Output text display (when AI generated) */}
        {data.outputText && (
          <div className="bg-[#101010] rounded-lg p-3 mb-3 relative group/output">
            {/* Copy button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(data.outputText || '');
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors opacity-0 group-hover/output:opacity-100"
              title="Копировать"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/70" />
              )}
            </button>
            {/* Scrollable text area */}
            <div className="max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-6">
              <p className="nodrag text-white text-sm leading-6 whitespace-pre-wrap select-text cursor-text">
                {data.outputText}
              </p>
            </div>
          </div>
        )}

        {/* Media thumbnails */}
        {allMedia.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Connected media (not removable) */}
            {connectedMedia.map((media, idx) => (
              <div 
                key={`connected-${idx}`} 
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/50 border border-white/10"
              >
                {media.type === 'image' ? (
                  <Image
                    src={media.url}
                    alt="Connected"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-white/50" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center text-white/70 py-0.5">
                  связь
                </div>
              </div>
            ))}
            
            {/* Uploaded media (removable) */}
            {uploadedMedia.map((media, idx) => (
              <div 
                key={`uploaded-${idx}`} 
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/50 border border-white/10 group"
              >
                {media.type === 'image' ? (
                  <Image
                    src={media.url}
                    alt="Uploaded"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-white/50" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMedia(idx);
                  }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            
            {/* Add media button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
              ) : (
                <ImagePlus className="w-5 h-5 text-white/50" />
              )}
            </button>
          </div>
        )}

        {/* Inherited text from connected text node */}
        {inheritedText && (
          <div className="bg-[#101010] rounded-lg p-3 mb-3 relative group/inherited">
            <div className="flex items-center gap-1 text-[10px] text-[#959595] mb-1">
              <FileText className="w-3 h-3" />
              <span>из связанного нода:</span>
            </div>
            {/* Copy button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(inheritedText);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors opacity-0 group-hover/inherited:opacity-100"
              title="Копировать"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/70" />
              )}
            </button>
            <div className="max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-6">
              <p className="text-white text-sm leading-6 whitespace-pre-wrap select-text cursor-text">
                {inheritedText}
              </p>
            </div>
          </div>
        )}

        {/* Text input field */}
        <div className="bg-[#101010] rounded-lg p-3 min-h-[80px] relative group/input">
          {/* Copy prompt button (if has prompt) */}
          {data.prompt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(data.prompt || '');
              }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors opacity-0 group-hover/input:opacity-100 z-10"
              title="Копировать промпт"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/70" />
              )}
            </button>
          )}
          <textarea
            value={data.prompt || ''}
            onChange={handlePromptChange}
            placeholder={inheritedText ? 'что сделать с текстом выше?' : placeholder}
            className="nodrag w-full bg-transparent text-white text-sm resize-none outline-none placeholder:text-[#656565] leading-6 select-text pr-8"
            rows={3}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {/* Upload media button (if no media yet) */}
            {!hasMedia && !inheritedText && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="flex items-center gap-1 text-xs text-[#959595] hover:text-white transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <span>добавить медиа</span>
              </button>
            )}
            {hasMedia && (
              <p className="text-xs text-[#959595]">
                {data.outputText ? 'AI проанализировал' : 'задай вопрос по медиа'}
              </p>
            )}
            {inheritedText && !hasMedia && (
              <p className="text-xs text-[#959595]">
                {data.outputText ? 'AI обработал текст' : 'обработать текст из связи'}
              </p>
            )}
            {!hasMedia && !data.outputText && !inheritedText && (
              <p className="text-xs text-[#959595]">
                текст передаётся напрямую
              </p>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartGeneration();
            }}
            disabled={(!data.prompt && !hasMedia && !inheritedText) || data.status === 'running'}
            title={hasMedia ? "Проанализировать медиа" : inheritedText ? "Обработать текст из связанного нода" : "Обработать текст через AI"}
            className={cn(
              "w-6 h-6 rounded-full border border-white/[0.02] flex items-center justify-center",
              "hover:bg-white/5 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-95"
            )}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
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
    </div>
  );
}

export const FlowTextNode = memo(FlowTextNodeComponent);
