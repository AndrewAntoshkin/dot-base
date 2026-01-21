'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '@/lib/flow/store';
import { FlowTextNode } from './flow-text-node';
import { FlowImageNode } from './flow-image-node';
import { FlowVideoNode } from './flow-video-node';
import { FlowBlockModal } from './flow-block-modal';
import { FlowSaveModal } from './flow-save-modal';
import { Plus, Minus, ChevronDown, Clock, Magnet, GitBranch, X, Loader2, Trash2, FilePlus, Share2 } from 'lucide-react';
import { FlowShareModal } from './flow-share-modal';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// Navigation items for section dropdown
const NAV_SECTIONS = [
  { href: '/', label: 'Image' },
  { href: '/video', label: 'Video' },
  { href: '/keyframes', label: 'Keyframes' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/brainstorm', label: 'Brainstorm' },
  { href: '/inpaint', label: 'Inpaint' },
  { href: '/expand', label: 'Outpaint' },
  { href: '/lora', label: 'LoRA' },
];

// Регистрация типов узлов
const nodeTypes = {
  'flow-text': FlowTextNode,
  'flow-image': FlowImageNode,
  'flow-video': FlowVideoNode,
} as const;

// Grid configuration
const GRID_SIZE = 20; // Size of grid cells for snapping

function FlowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const [isFlowSelectorOpen, setIsFlowSelectorOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true); // Snap to grid enabled by default
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  const {
    nodes,
    edges,
    viewport,
    hasUnsavedChanges,
    flowId,
    flowName,
    isSaving,
    userFlows,
    isLoadingFlows,
    onNodesChange,
    onEdgesChange,
    onConnect,
    openBlockModal,
    selectNode,
    setViewport: setStoreViewport,
    setFlowName,
    resetFlow,
    clearFlow,
    saveFlow,
    createNewFlow,
    loadFlowFromServer,
    fetchUserFlows,
  } = useFlowStore();

  // Обработка клика на пустое место
  const onPaneClick = useCallback(() => {
    selectNode(null);
    // Close dropdowns when clicking on canvas
    setIsSectionDropdownOpen(false);
    setIsFlowSelectorOpen(false);
    setIsHistoryOpen(false);
  }, [selectNode]);

  // Синхронизация viewport со store
  const onMoveEnd = useCallback(() => {
    const newViewport = getViewport();
    setStoreViewport(newViewport);
  }, [getViewport, setStoreViewport]);

  // Восстановление viewport при загрузке
  useEffect(() => {
    if (viewport.x !== 0 || viewport.y !== 0 || viewport.zoom !== 1) {
      setViewport(viewport);
    }
  }, []);

  // Polling для обновления статуса нодов с активными генерациями
  useEffect(() => {
    const activeNodes = nodes.filter(n => 
      n.data.status === 'running' || n.data.status === 'processing'
    );
    
    if (activeNodes.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const node of activeNodes) {
        // Если у нода есть generation_id, проверяем статус через API
        if (node.data.generationId) {
          try {
            const response = await fetch(`/api/generations/${node.data.generationId}`);
            if (response.ok) {
              const gen = await response.json();
              const { updateNodeData } = useFlowStore.getState();
              
              if (gen.status === 'completed' && gen.output_urls?.[0]) {
                updateNodeData(node.id, {
                  status: 'completed',
                  outputUrl: gen.output_urls[0],
                  outputType: node.data.blockType === 'video' ? 'video' : 'image',
                });
              } else if (gen.status === 'failed') {
                updateNodeData(node.id, {
                  status: 'failed',
                  errorMessage: gen.error_message || 'Генерация не удалась',
                });
              }
            }
          } catch (error) {
            console.error('Error polling generation status:', error);
          }
        }
      }
    }, 3000); // Poll каждые 3 секунды для быстрого обновления

    return () => clearInterval(pollInterval);
  }, [nodes]);

  // Проверка, нужно ли показывать приветственное сообщение
  useEffect(() => {
    const isWelcomeMessageHidden = localStorage.getItem('flow-welcome-message-hidden');
    if (!isWelcomeMessageHidden) {
      setShowWelcomeMessage(true);
    }
  }, []);

  // Обработчик закрытия приветственного сообщения
  const handleCloseWelcomeMessage = useCallback(() => {
    setShowWelcomeMessage(false);
    localStorage.setItem('flow-welcome-message-hidden', 'true');
  }, []);

  const handleZoomIn = useCallback(() => zoomIn(), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut(), [zoomOut]);
  const handleFitView = useCallback(() => fitView({ padding: 0.2 }), [fitView]);

  // Fetch user flows when dropdown opens
  useEffect(() => {
    if (isFlowSelectorOpen) {
      fetchUserFlows();
    }
  }, [isFlowSelectorOpen, fetchUserFlows]);

  // Handle creating new flow
  const handleCreateNewFlow = useCallback(async () => {
    setIsCreatingNew(true);
    clearFlow();
    setIsFlowSelectorOpen(false);
    setIsCreatingNew(false);
  }, [clearFlow]);

  // Handle saving current flow
  const handleSaveFlow = useCallback(async () => {
    // Если нет flowId, показываем модалку для ввода названия
    if (!flowId) {
      setIsSaveModalOpen(true);
      return;
    }
    const success = await saveFlow();
    if (success) {
      console.log('Flow saved successfully');
    }
  }, [flowId, saveFlow]);

  // Handle save from modal with name
  const handleSaveWithName = useCallback(async (name: string) => {
    setFlowName(name);
    const success = await saveFlow();
    if (success) {
      setIsSaveModalOpen(false);
      console.log('Flow saved successfully with name:', name);
    }
  }, [setFlowName, saveFlow]);

  // Handle loading a flow
  const handleLoadFlow = useCallback(async (selectedFlowId: string) => {
    const success = await loadFlowFromServer(selectedFlowId);
    if (success) {
      setIsFlowSelectorOpen(false);
    }
  }, [loadFlowFromServer]);

  // Handle name edit
  const handleStartEditName = useCallback(() => {
    setEditingNameValue(flowName);
    setIsEditingName(true);
  }, [flowName]);

  const handleSaveName = useCallback(() => {
    if (editingNameValue.trim()) {
      setFlowName(editingNameValue.trim());
    }
    setIsEditingName(false);
  }, [editingNameValue, setFlowName]);

  // Handle clear/reset flow with confirmation
  const handleClearFlow = useCallback(() => {
    if (nodes.length > 0 || edges.length > 0) {
      if (confirm('Очистить текущий Flow? Все несохранённые изменения будут потеряны.')) {
        clearFlow();
      }
    }
  }, [nodes.length, edges.length, clearFlow]);
  
  // Handle creating a new block from the plus button
  const handleCreateBlock = useCallback(() => {
    if (!reactFlowWrapper.current) return;
    
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const currentViewport = getViewport();
    
    // Position in center of visible canvas
    const canvasPosition = {
      x: (bounds.width / 2 - currentViewport.x) / currentViewport.zoom,
      y: (bounds.height / 2 - currentViewport.y) / currentViewport.zoom,
    };
    
    const screenPosition = {
      x: bounds.width / 2,
      y: bounds.height / 2,
    };
    
    openBlockModal(canvasPosition, screenPosition);
  }, [openBlockModal, getViewport]);

  // Обработчик двойного клика на обёртке для предотвращения зума
  const handleWrapperDoubleClick = useCallback((event: React.MouseEvent) => {
    // Если клик не на ноде и не на edge, открываем модал
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    if (!reactFlowWrapper.current) return;

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const currentViewport = getViewport();
    
    const canvasPosition = {
      x: (event.clientX - bounds.left - currentViewport.x) / currentViewport.zoom,
      y: (event.clientY - bounds.top - currentViewport.y) / currentViewport.zoom,
    };

    const screenPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    openBlockModal(canvasPosition, screenPosition);
  }, [openBlockModal, getViewport]);

  return (
    <div 
      ref={reactFlowWrapper} 
      className="w-full h-full relative"
      onDoubleClick={handleWrapperDoubleClick}
    >
      <ReactFlow
        nodes={nodes as any}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes as any}
        fitView={false}
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectNodesOnDrag={false}
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={viewport}
        className="bg-[#050505]"
        proOptions={{ hideAttribution: true }}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
      >
        {/* Dotted background pattern - visible grid for alignment */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={GRID_SIZE}
          size={1.5}
          color="#4a4a4a"
        />

        {/* Empty state - show when no nodes */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="!mt-[30vh]">
            <div className="flex flex-col items-center gap-4 max-w-[368px]">
              {/* Empty state illustration */}
              <Image 
                src="/flow-empty-state.svg" 
                alt="Empty flow" 
                width={202} 
                height={109}
                className="opacity-80"
              />
              
              {/* Instructions */}
              <p className="text-[#6D6D6D] text-sm text-center leading-5">
                Нажмите на кнопку ниже для создания первого блока или кликните два раза в любом месте
              </p>
              
              {/* Create button */}
              <button
                onClick={handleCreateBlock}
                className="h-10 px-4 rounded-xl bg-white hover:bg-gray-100 transition-colors text-black text-sm font-medium"
              >
                Создать
              </button>
            </div>
          </Panel>
        )}

        {/* Top-left: Section dropdown */}
        <Panel position="top-left" className="!m-4">
          <div className="relative">
            <button
              onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#171717] hover:bg-[#1f1f1f] transition-colors"
            >
              <Image src="/baseCRLogo.svg" alt="BASE CRAFT" width={65} height={18} />
              <ChevronDown className={`w-5 h-5 text-white transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Section dropdown */}
            {isSectionDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 py-2 min-w-[160px] rounded-xl bg-[#171717] border border-[#2F2F2F] shadow-lg z-50">
                {NAV_SECTIONS.map((section) => (
                  <button
                    key={section.href}
                    onClick={() => {
                      router.push(section.href);
                      setIsSectionDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Top-right: Reset, Share and Save buttons */}
        <Panel position="top-right" className="!m-4">
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearFlow}
              className="h-10 px-4 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] transition-colors text-white text-sm font-medium flex items-center gap-2"
              title="Очистить Flow"
            >
              <Trash2 className="w-4 h-4" />
              Сбросить
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] transition-colors text-white text-sm font-medium flex items-center gap-2"
              title="Поделиться Flow"
            >
              <Share2 className="w-4 h-4" />
              Поделиться
            </button>
            <button
              onClick={handleSaveFlow}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors text-black text-sm font-medium flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        </Panel>

        {/* Bottom-center: Flow controls */}
        <Panel position="bottom-center" className="!mb-4">
          <div className="flex items-center gap-1">
            {/* Plus button - create new block */}
            <button
              onClick={handleCreateBlock}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
              title="Создать блок"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
            
            <div className="w-px h-4 bg-[#2F2F2F]" />
            
            {/* Flow name selector */}
            <div className="relative">
              {isEditingName ? (
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  className="h-10 px-3 rounded-xl bg-[#212121] text-white text-sm outline-none border border-white/20 min-w-[150px]"
                  placeholder="Название Flow"
                />
              ) : (
                <button
                  onClick={() => setIsFlowSelectorOpen(!isFlowSelectorOpen)}
                  onDoubleClick={handleStartEditName}
                  className="flex items-center gap-2 h-10 px-3 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
                  title="Двойной клик для редактирования"
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white max-w-[150px] truncate">
                    {flowName || 'Без названия'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
                </button>
              )}
              
              {/* Flow selector dropdown */}
              {isFlowSelectorOpen && !isEditingName && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFlowSelectorOpen(false)} />
                  <div className="absolute bottom-full mb-2 left-0 bg-[#171717] rounded-xl p-2 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] min-w-[240px] max-w-[300px] z-50">
                    {/* New Flow button */}
                    <button 
                      onClick={handleCreateNewFlow}
                      disabled={isCreatingNew}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[#212121] transition-colors border-b border-[#2F2F2F] mb-2"
                    >
                      <FilePlus className="w-4 h-4 text-[#4ade80]" />
                      <span className="text-sm text-white">Новый Flow</span>
                    </button>

                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] px-3 py-2">
                      Ваши Flow ({userFlows.length})
                    </p>
                    
                    {isLoadingFlows ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    ) : userFlows.length === 0 ? (
                      <p className="text-sm text-[#656565] px-3 py-2">
                        Нет сохранённых Flow
                      </p>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto">
                        {userFlows.map((flow) => (
                          <button
                            key={flow.id}
                            onClick={() => handleLoadFlow(flow.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#212121] transition-colors text-left ${
                              flow.id === flowId ? 'bg-[#212121]' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white block truncate">
                                {flow.name}
                              </span>
                              <span className="text-[10px] text-[#656565]">
                                {new Date(flow.updated_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {flow.id === flowId && (
                              <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* History button */}
            <div className="relative">
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
                title="История изменений"
              >
                <Clock className="w-4 h-4 text-white" />
              </button>
              
              {/* History dropdown */}
              {isHistoryOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)} />
                  <div className="absolute bottom-full mb-2 right-0 bg-[#171717] rounded-xl p-2 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] min-w-[200px] z-50">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] px-3 py-2">
                      История изменений
                    </p>
                    <p className="text-sm text-[#656565] px-3 py-2">
                      Нет сохранённых версий
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>

        {/* Zoom controls & snap toggle - bottom left */}
        <Panel position="bottom-left" className="!m-4">
          <div className="flex items-center gap-2">
            {/* Snap to grid toggle */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                snapToGrid 
                  ? 'bg-white text-black' 
                  : 'bg-[#191919] text-white hover:bg-[#2F2F2F]'
              }`}
              title={snapToGrid ? 'Привязка к сетке включена' : 'Привязка к сетке выключена'}
            >
              <Magnet className="w-4 h-4" />
            </button>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#191919]">
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-[#2F2F2F] transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center text-xs text-white">
                {Math.round(getViewport().zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-[#2F2F2F] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Panel>

        {/* Status indicator - bottom right */}
        <Panel position="bottom-right" className="!m-4">
          <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#212121]">
            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-sm text-white">
              {isSaving ? 'Сохранение...' : hasUnsavedChanges ? 'Несохранённо' : 'Сохранено'}
            </span>
          </div>
        </Panel>

        {/* Welcome message - bottom center, below flow controls */}
        {showWelcomeMessage && (
          <Panel position="bottom-center" className="!mb-20">
            <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-[#212121] border border-transparent">
              {/* Icon */}
              <div className="flex-shrink-0">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              
              {/* Text content */}
              <div className="flex flex-col gap-0.5">
                <p className="text-sm text-white leading-[1.286em]">
                  Тестируем новый функционал FLOW.
                </p>
                <p className="text-xs text-[#959595] leading-[1.5em]">
                  По всем неточностям и доработкам пишите в группу в Telegram
                </p>
              </div>
              
              {/* Close button */}
              <button
                onClick={handleCloseWelcomeMessage}
                className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-[#2a2a2a] transition-colors flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-[#7E7E7E]" strokeWidth={1.8} />
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Block creation modal */}
      <FlowBlockModal />

      {/* Share modal */}
      <FlowShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />

      {/* Save modal - показывается при первом сохранении */}
      <FlowSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveWithName}
        initialName={flowName}
        isLoading={isSaving}
      />
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
