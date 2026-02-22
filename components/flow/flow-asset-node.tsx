'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { ReactFlowNodeData } from '@/lib/flow/types';
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';
import {
  ImagePlus, Download, Expand, X, Maximize2, Crop, Paintbrush,
  Pencil, Loader2, ChevronDown, ArrowUp, Undo2,
} from 'lucide-react';
import Image from 'next/image';
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer';
import { NodeAuthorBadge } from './node-author-badge';
import { FlowInlinePainter, type FlowInlinePainterRef } from './flow-inline-painter';

type FlowAssetNodeType = Node<ReactFlowNodeData, 'flow-asset'>;

// ── Inline SVG icons ────────────────────────────────────────────────

function UpscaleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 10L2 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 6V2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function RemoveBgIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 2"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

// ── Model configs ───────────────────────────────────────────────────

const INPAINT_MODELS = [
  { id: 'flux-fill-pro', label: 'FLUX Fill Pro', needsPrompt: true },
  { id: 'bria-genfill-inpaint', label: 'Bria GenFill', needsPrompt: true },
  { id: 'bria-eraser-inpaint', label: 'Bria Eraser', needsPrompt: false },
];

const OUTPAINT_MODELS = [
  { id: 'bria-expand', label: 'Bria Expand' },
  { id: 'outpainter', label: 'Outpainter' },
];

const EDIT_MODELS = [
  { id: 'flux-kontext-max-edit', label: 'FLUX Kontext Max' },
  { id: 'nano-banana-pro-edit', label: 'Nano Banana Pro' },
  { id: 'reve-edit', label: 'Reve Edit' },
];

const ASPECT_RATIOS = [
  { value: 'auto', label: 'Auto' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
];

// ── Tooltip ─────────────────────────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-[#232323] border border-[#2F2F2F] whitespace-nowrap pointer-events-none z-50">
          <span className="text-[10px] font-medium text-white">{label}</span>
        </div>
      )}
    </div>
  );
}

// ── Asset Node Component ────────────────────────────────────────────

function FlowAssetNodeComponent({ id, data, selected }: NodeProps<FlowAssetNodeType>) {
  const { selectNode, removeNode, updateNodeData, runEditAction } = useFlowStore();
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const painterRef = useRef<FlowInlinePainterRef>(null);

  const hasImage = !!data.outputUrl;
  const isRunning = data.status === 'running' || data.status === 'processing' || data.status === 'pending';
  const editMode = data.editMode || null;
  const editPrompt = data.editPrompt || '';
  const editModelId = data.editModelId || '';
  const editAspectRatio = data.editAspectRatio || 'auto';
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number }>({ w: 512, h: 512 });

  // Load natural image dimensions for mask matching
  useEffect(() => {
    if (!data.outputUrl) return;
    const img = new window.Image();
    img.onload = () => setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = data.outputUrl;
  }, [data.outputUrl]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!data.outputUrl) return;
    const a = document.createElement('a');
    a.href = data.outputUrl;
    a.download = `asset-${id}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }, [data.outputUrl, id]);

  const handleUndo = useCallback(() => {
    if (data.previousOutputUrl) {
      updateNodeData(id, {
        outputUrl: data.previousOutputUrl,
        previousOutputUrl: undefined,
      });
    }
  }, [id, data.previousOutputUrl, updateNodeData]);

  // ── Enter edit mode ─────────────────────────────────────────────

  const enterEditMode = useCallback((mode: 'inpaint' | 'outpaint' | 'edit') => {
    const defaultModel = mode === 'inpaint'
      ? INPAINT_MODELS[0].id
      : mode === 'outpaint'
        ? OUTPAINT_MODELS[0].id
        : EDIT_MODELS[0].id;
    updateNodeData(id, {
      editMode: mode,
      editModelId: defaultModel,
      editPrompt: '',
      editAspectRatio: 'auto',
    });
    setOpenDropdown(null);
  }, [id, updateNodeData]);

  const cancelEditMode = useCallback(() => {
    updateNodeData(id, {
      editMode: null,
      editMaskDataUrl: undefined,
      editPrompt: undefined,
      editModelId: undefined,
      editAspectRatio: undefined,
    });
    painterRef.current?.clear();
    setOpenDropdown(null);
  }, [id, updateNodeData]);

  // ── One-click actions ─────────────────────────────────────────

  const handleUpscale = useCallback(() => {
    runEditAction(id, 'upscale', {
      modelId: 'google-upscaler',
      settings: { upscale_factor: 'x2' },
    });
  }, [id, runEditAction]);

  const handleRemoveBg = useCallback(() => {
    runEditAction(id, 'remove_bg', {
      modelId: 'bria-remove-background',
    });
  }, [id, runEditAction]);

  // ── Submit edit action ────────────────────────────────────────

  const handleSubmitEdit = useCallback(async () => {
    if (!editMode || !editModelId) return;

    if (editMode === 'inpaint') {
      // Export mask from painter
      const maskDataUrl = painterRef.current?.exportMask();
      if (!maskDataUrl) return;

      // Upload mask to get a URL
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [maskDataUrl] }),
        });
        const uploadResult = await res.json();
        if (!uploadResult.urls?.[0]) throw new Error('Mask upload failed');

        runEditAction(id, 'inpaint', {
          modelId: editModelId,
          prompt: editPrompt,
          maskUrl: uploadResult.urls[0],
        });
      } catch (err) {
        console.error('Mask upload error:', err);
      }
    } else if (editMode === 'outpaint') {
      const settings: Record<string, any> = {};
      if (editAspectRatio !== 'auto') {
        settings.aspect_ratio = editAspectRatio;
      }
      runEditAction(id, 'expand', {
        modelId: editModelId,
        prompt: editPrompt,
        settings,
      });
    } else if (editMode === 'edit') {
      runEditAction(id, 'edit', {
        modelId: editModelId,
        prompt: editPrompt,
      });
    }
  }, [id, editMode, editModelId, editPrompt, editAspectRatio, runEditAction]);

  // ── Get models for current mode ───────────────────────────────

  const getCurrentModels = () => {
    if (editMode === 'inpaint') return INPAINT_MODELS;
    if (editMode === 'outpaint') return OUTPAINT_MODELS;
    if (editMode === 'edit') return EDIT_MODELS;
    return [];
  };

  const currentModels = getCurrentModels();
  const currentModelLabel = currentModels.find(m => m.id === editModelId)?.label || 'Модель';

  // ── Toolbar is always visible in edit mode ────────────────────

  const toolbarAlwaysVisible = !!editMode || isRunning;

  return (
    <>
      <div
        onClick={() => selectNode(id)}
        className="relative group pb-16 overflow-visible"
      >
        {/* Main card */}
        <div
          className={cn(
            'rounded-2xl bg-[#0C0C0C] p-3 w-[280px] relative',
            'border-2 transition-colors',
            selected ? 'border-white/30' : 'border-[#2F2F2F]',
            isRunning && 'animate-pulse'
          )}
        >
          <Handle type="target" position={Position.Left} id="input" />
          <Handle type="source" position={Position.Right} id="output" />

          {/* Header */}
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-1">
              <ImagePlus className="w-3 h-3 text-white" />
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                ассет
              </span>
              {editMode && (
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4ADE80] ml-1">
                  {editMode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {data.createdByEmail && (
                <NodeAuthorBadge email={data.createdByEmail} />
              )}
              {editMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); cancelEditMode(); }}
                  className="p-1 rounded-md text-[#959595] hover:text-white hover:bg-white/5 transition-colors"
                  title="Отменить"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {!editMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeNode(id); }}
                  className="p-1 rounded-md text-[#656565] hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Image preview with optional paint overlay */}
          {hasImage ? (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[#171717]">
              <Image
                key={data.outputUrl}
                src={data.outputUrl!}
                alt="Asset"
                fill
                className="object-cover"
                sizes="260px"
                unoptimized
              />

              {/* Inpaint painter overlay */}
              {editMode === 'inpaint' && (
                <FlowInlinePainter
                  ref={painterRef}
                  imageUrl={data.outputUrl!}
                  width={imgNaturalSize.w}
                  height={imgNaturalSize.h}
                />
              )}

              {/* Running spinner overlay */}
              {isRunning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square rounded-xl border border-dashed border-[#2F2F2F] bg-[#101010] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#656565]">
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">Нет изображения</span>
              </div>
            </div>
          )}

          {/* ── Prompt input (when in edit mode) ── */}
          {editMode && editMode !== null && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={editPrompt}
                onChange={(e) => updateNodeData(id, { editPrompt: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitEdit(); }}
                placeholder={
                  editMode === 'inpaint' ? 'Describe what to generate...'
                    : editMode === 'outpaint' ? 'Describe the expanded area...'
                    : 'Describe the edit...'
                }
                className="nodrag flex-1 px-3 py-2 rounded-full bg-[#171717] border border-[#2F2F2F] text-sm text-white placeholder:text-[#656565] outline-none focus:border-[#4ADE80]/50 transition-colors"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSubmitEdit(); }}
                disabled={isRunning}
                className="w-9 h-9 rounded-full bg-[#4ADE80] hover:bg-[#4ADE80]/80 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
              >
                <ArrowUp className="w-4 h-4 text-black" />
              </button>
            </div>
          )}

          {/* ── Action bar ── */}
          {hasImage && (
            <div
              className={cn(
                'absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2',
                'flex items-center gap-0.5 p-1 rounded-xl bg-[#212121]',
                'transition-opacity duration-200 z-40',
                toolbarAlwaysVisible
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none'
              )}
            >
              {/* ── Edit mode dropdowns ── */}
              {editMode && (
                <>
                  {/* Model selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'model' ? null : 'model'); }}
                      className={cn(
                        'flex items-center gap-1 h-8 px-2 rounded-lg text-white text-[10px] font-medium uppercase tracking-wider',
                        openDropdown === 'model' ? 'bg-[#2F2F2F]' : 'hover:bg-[#2F2F2F]'
                      )}
                    >
                      <span className="max-w-[80px] truncate">{currentModelLabel}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {openDropdown === 'model' && (
                      <div className="absolute bottom-full mb-2 left-0 bg-[#171717] rounded-xl p-2 shadow-[0px_8px_24px_rgba(0,0,0,0.9)] min-w-[180px] z-50">
                        {currentModels.map((m) => (
                          <button
                            key={m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateNodeData(id, { editModelId: m.id });
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm text-white transition-colors',
                              editModelId === m.id ? 'bg-[#2F2F2F]' : 'hover:bg-[#232323]'
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Aspect ratio (outpaint only) */}
                  {editMode === 'outpaint' && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'ratio' ? null : 'ratio'); }}
                        className={cn(
                          'flex items-center gap-1 h-8 px-2 rounded-lg text-white text-[10px] font-medium uppercase tracking-wider',
                          openDropdown === 'ratio' ? 'bg-[#2F2F2F]' : 'hover:bg-[#2F2F2F]'
                        )}
                      >
                        <span>{editAspectRatio === 'auto' ? 'Auto' : editAspectRatio}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {openDropdown === 'ratio' && (
                        <div className="absolute bottom-full mb-2 left-0 bg-[#171717] rounded-xl p-2 shadow-[0px_8px_24px_rgba(0,0,0,0.9)] min-w-[120px] z-50 max-h-[300px] overflow-y-auto">
                          {ASPECT_RATIOS.map((r) => (
                            <button
                              key={r.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNodeData(id, { editAspectRatio: r.value });
                                setOpenDropdown(null);
                              }}
                              className={cn(
                                'w-full text-left px-3 py-2 rounded-lg text-sm text-white transition-colors',
                                editAspectRatio === r.value ? 'bg-[#2F2F2F]' : 'hover:bg-[#232323]'
                              )}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-px h-5 bg-[#2F2F2F] mx-0.5" />
                </>
              )}

              {/* ── Action icons ── */}
              <Tooltip label="Улучшить качество">
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpscale(); }}
                  disabled={isRunning}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40"
                >
                  <UpscaleIcon />
                </button>
              </Tooltip>

              <Tooltip label="Редактировать">
                <button
                  onClick={(e) => { e.stopPropagation(); enterEditMode('edit'); }}
                  disabled={isRunning}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40',
                    editMode === 'edit' && 'bg-[#2F2F2F] ring-1 ring-white/30'
                  )}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip label="Кроп">
                <button
                  disabled
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white/30 cursor-not-allowed"
                >
                  <Crop className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip label="Inpaint">
                <button
                  onClick={(e) => { e.stopPropagation(); enterEditMode('inpaint'); }}
                  disabled={isRunning}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40',
                    editMode === 'inpaint' && 'bg-[#2F2F2F] ring-1 ring-white/30'
                  )}
                >
                  <Paintbrush className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip label="Outpaint">
                <button
                  onClick={(e) => { e.stopPropagation(); enterEditMode('outpaint'); }}
                  disabled={isRunning}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40',
                    editMode === 'outpaint' && 'bg-[#2F2F2F] ring-1 ring-white/30'
                  )}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip label="Удалить фон">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveBg(); }}
                  disabled={isRunning}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40"
                >
                  <RemoveBgIcon />
                </button>
              </Tooltip>

              <div className="w-px h-5 bg-[#2F2F2F] mx-0.5" />

              {/* Undo */}
              {data.previousOutputUrl && (
                <Tooltip label="Вернуть">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUndo(); }}
                    disabled={isRunning}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors disabled:opacity-40"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}

              <Tooltip label="Скачать">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip label="На весь экран">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsFullscreenOpen(true); }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-[#2F2F2F] transition-colors"
                >
                  <Expand className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen viewer */}
      {data.outputUrl && (
        <ImageFullscreenViewer
          imageUrl={data.outputUrl}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </>
  );
}

export const FlowAssetNode = memo(FlowAssetNodeComponent);
