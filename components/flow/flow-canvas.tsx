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
import { FlowAssetNode } from './flow-asset-node';
import { FlowEdge } from './flow-edge';
import { FlowBlockModal } from './flow-block-modal';
import { FlowSaveModal } from './flow-save-modal';
import { Plus, Minus, ChevronDown, Clock, Magnet, GitBranch, X, Loader2, Trash2, FilePlus } from 'lucide-react';
import { FlowShareModal } from './flow-share-modal';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AssistantPanel } from '@/components/assistant-panel';
import { Tooltip } from '@/components/ui/tooltip';
import { useUser } from '@/contexts/user-context';

// Navigation items for section dropdown
const NAV_SECTIONS = [
  { href: '/', label: 'IMAGE' },
  { href: '/video', label: 'VIDEO' },
  { href: '/keyframes', label: 'KEYFRAMES' },
  { href: '/brainstorm', label: 'BRAINSTORM' },
  { href: '/lora', label: 'LORA' },
  { href: '/admin', label: 'DASHBOARD' },
  { href: '/docs', label: 'ДОКУМЕНТАЦИЯ' },
];

// Регистрация типов узлов
const nodeTypes = {
  'flow-text': FlowTextNode,
  'flow-image': FlowImageNode,
  'flow-video': FlowVideoNode,
  'flow-asset': FlowAssetNode,
} as const;

// Регистрация типов связей
const edgeTypes = {
  'default': FlowEdge,
} as const;

// Grid configuration
const GRID_SIZE = 20; // Size of grid cells for snapping

function FlowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { email, avatarUrl, displayName } = useUser();
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
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isUIReady, setIsUIReady] = useState(false);
  
  // Trigger UI entrance animations after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsUIReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
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

  // Fit all nodes into view when a flow is loaded
  useEffect(() => {
    if (flowId && nodes.length > 0) {
      // Small delay to ensure React Flow has rendered nodes
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 150);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

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

  // Handle delete flow
  const handleDeleteFlow = useCallback(async (deleteFlowId: string, flowName: string) => {
    if (!confirm(`Удалить Flow "${flowName}"? Это действие нельзя отменить.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/flow/${deleteFlowId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Если удаляем текущий flow, создаём новый
        if (deleteFlowId === flowId) {
          clearFlow();
        }
        // Обновляем список
        fetchUserFlows();
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
    }
  }, [flowId, clearFlow, fetchUserFlows]);
  
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
        edgeTypes={edgeTypes as any}
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
            <div className={`flex flex-col items-center gap-4 transition-all duration-500 ease-out delay-300 ${isUIReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Block preview with connection icons */}
              <div className="flex items-center gap-1.5">
                {/* Left connection icon */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="6" r="5" stroke="#717171" strokeWidth="1"/>
                  <path d="M6 3.5V8.5M3.5 6H8.5" stroke="#717171" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                
                {/* Block preview card */}
                <div className="w-[168px] p-1.5 bg-[#1C1C1C] rounded-lg shadow-[0px_4px_14px_0px_rgba(0,0,0,0.16)] backdrop-blur-[9px]">
                  <div className="flex items-center justify-between px-0.5 mb-1.5">
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4D4D4D]" />
                      <div className="w-8 h-1.5 rounded-sm bg-[#C7C7C7]" />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4D4D4D]" />
                  </div>
                  <div className="h-8 bg-[#101010] rounded" />
                </div>
                
                {/* Right connection icon */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="6" r="5" stroke="#717171" strokeWidth="1"/>
                  <path d="M6 3.5V8.5M3.5 6H8.5" stroke="#717171" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </div>
              
              {/* Instructions */}
              <p className="text-[#6D6D6D] text-sm text-center leading-5 max-w-[440px] px-10">
                Начните с выбора первого блока или кликните два раза в любом месте
              </p>
              
              {/* Block type buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!reactFlowWrapper.current) return;
                    const bounds = reactFlowWrapper.current.getBoundingClientRect();
                    const currentViewport = getViewport();
                    const canvasPosition = {
                      x: (bounds.width / 2 - currentViewport.x) / currentViewport.zoom,
                      y: (bounds.height / 2 - currentViewport.y) / currentViewport.zoom,
                    };
                    useFlowStore.getState().addNode('text', canvasPosition);
                  }}
                  className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#050505] border border-[#303030] hover:border-white/30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.66667 4.66667V2.66667H13.3333V4.66667M6 13.3333H10M8 2.66667V13.3333" stroke="white" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-medium text-white">Текст</span>
                </button>
                
                <button
                  onClick={() => {
                    if (!reactFlowWrapper.current) return;
                    const bounds = reactFlowWrapper.current.getBoundingClientRect();
                    const currentViewport = getViewport();
                    const canvasPosition = {
                      x: (bounds.width / 2 - currentViewport.x) / currentViewport.zoom,
                      y: (bounds.height / 2 - currentViewport.y) / currentViewport.zoom,
                    };
                    useFlowStore.getState().addNode('image', canvasPosition);
                  }}
                  className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#050505] border border-[#303030] hover:border-white/30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="1.33"/>
                    <circle cx="5.5" cy="5.5" r="1.5" stroke="white" strokeWidth="1"/>
                    <path d="M2 11L5.5 7.5L8 10L10.5 7L14 11" stroke="white" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-medium text-white">Изображение</span>
                </button>
                
                <button
                  onClick={() => {
                    if (!reactFlowWrapper.current) return;
                    const bounds = reactFlowWrapper.current.getBoundingClientRect();
                    const currentViewport = getViewport();
                    const canvasPosition = {
                      x: (bounds.width / 2 - currentViewport.x) / currentViewport.zoom,
                      y: (bounds.height / 2 - currentViewport.y) / currentViewport.zoom,
                    };
                    useFlowStore.getState().addNode('video', canvasPosition);
                  }}
                  className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#050505] border border-[#303030] hover:border-white/30 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1.33" y="3.33" width="10.67" height="9.33" rx="2" stroke="white" strokeWidth="1.33"/>
                    <path d="M12 6L14.67 4.67V11.33L12 10" stroke="white" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-medium text-white">Видео</span>
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Top-left: Home button + FLOW section dropdown */}
        <Panel position="top-left" className="!m-4">
          <div className={`flex items-center gap-2 transition-all duration-500 ease-out ${isUIReady ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            {/* Avatar - links to profile */}
            <Tooltip text="Профиль" position="bottom">
              <Link
                href="/profile"
                className="flex items-center justify-center w-11 h-11 rounded-xl overflow-hidden border-2 border-[#171717] hover:border-[#303030] transition-colors"
              >
                {avatarUrl ? (
                  <Image 
                    src={avatarUrl} 
                    alt="Avatar" 
                    width={44} 
                    height={44} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#7357FF] flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {(displayName || email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>
            </Tooltip>

            {/* FLOW dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#171717] hover:bg-[#1f1f1f] transition-colors"
              >
                <span className="font-inter font-medium text-xs uppercase tracking-[-0.01em] text-white">
                  FLOW
                </span>
                <ChevronDown className={`w-5 h-5 text-white transition-transform ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Section dropdown */}
              {isSectionDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSectionDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 p-3 min-w-[280px] rounded-2xl bg-[#171717] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] z-50">
                    {/* Navigation items */}
                    <div className="flex flex-col gap-2">
                      {NAV_SECTIONS.map((section) => (
                        <button
                          key={section.href}
                          onClick={() => {
                            router.push(section.href);
                            setIsSectionDropdownOpen(false);
                          }}
                          className="w-full px-3 py-3 text-left text-sm font-medium text-white rounded-[10px] transition-colors hover:bg-[#232323]"
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>

        {/* Top-right: Assistant, Share, Reset and Save buttons */}
        <Panel position="top-right" className="!m-4">
          <div className={`flex items-center gap-1 transition-all duration-500 ease-out delay-100 ${isUIReady ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            {/* Assistant button */}
            <Tooltip text="Ассистент" position="bottom">
              <button
                onClick={() => setIsAssistantOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors overflow-hidden"
              >
                <Image src="/icon-assistant-flow.svg" alt="Ассистент" width={36} height={36} />
              </button>
            </Tooltip>
            {/* Share button - icon only */}
            <Tooltip text="Поделиться" position="bottom">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors overflow-hidden"
              >
                <Image src="/icon-share-flow.svg" alt="Поделиться" width={36} height={36} />
              </button>
            </Tooltip>
            {/* Reset button */}
            <button
              onClick={handleClearFlow}
              className="h-9 px-4 rounded-xl bg-[#212121] border border-[#303030] hover:bg-[#2a2a2a] transition-colors text-white text-sm font-medium"
              title="Сбросить Flow"
            >
              Сбросить
            </button>
            {/* Save button */}
            <button
              onClick={handleSaveFlow}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors text-black text-sm font-medium flex items-center gap-2"
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
          <div className={`flex items-center gap-1 transition-all duration-500 ease-out delay-200 ${isUIReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
                  <div className="absolute bottom-full mb-2 left-0 bg-[#171717] rounded-xl p-2 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.9)] min-w-[280px] max-w-[340px] z-50">
                    {/* New Flow button */}
                    <button 
                      onClick={handleCreateNewFlow}
                      disabled={isCreatingNew}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[#212121] transition-colors border-b border-[#2F2F2F] mb-2"
                    >
                      <FilePlus className="w-4 h-4 text-white" />
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
                      <div className="max-h-[240px] overflow-y-auto">
                        {userFlows.map((flow) => (
                          <div
                            key={flow.id}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#212121] transition-colors ${
                              flow.id === flowId ? 'bg-[#212121]' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleLoadFlow(flow.id)}
                              className="flex-1 min-w-0 text-left"
                            >
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
                            </button>
                            {flow.id === flowId && (
                              <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFlow(flow.id, flow.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-[#2F2F2F] transition-all flex-shrink-0"
                              title="Удалить Flow"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-[#959595] hover:text-white" />
                            </button>
                          </div>
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
          <div className={`flex items-center gap-2 transition-all duration-500 ease-out delay-200 ${isUIReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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

        {/* Status indicator - bottom right, with extra margin for support button */}
        <Panel position="bottom-right" className="!mb-4 !mr-14">
          <div className={`flex items-center gap-2 px-4 h-10 rounded-xl bg-[#212121] transition-all duration-500 ease-out delay-200 ${isUIReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className={`w-2 h-2 rounded-full ${hasUnsavedChanges ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-sm text-white">
              {isSaving ? 'Сохранение...' : hasUnsavedChanges ? 'Несохранённо' : 'Сохранено'}
            </span>
          </div>
        </Panel>

        {/* Welcome message - bottom center, below flow controls */}
        {showWelcomeMessage && (
          <Panel position="bottom-center" className="!mb-20">
            <div className={`flex items-center gap-6 px-4 py-3 rounded-2xl bg-[#212121] transition-all duration-500 ease-out delay-400 ${isUIReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Text content */}
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-white leading-[1.286em]">
                  Тестируем новый функционал FLOW
                </p>
                <p className="text-xs text-[#959595] leading-[1.5em]">
                  По всем неточностям и доработкам пишите в группу в Telegram
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Documentation link */}
                <Link
                  href="/docs/flow"
                  className="flex items-center justify-center h-8 px-3 rounded-xl bg-[#050505] hover:bg-[#1a1a1a] transition-colors text-sm font-medium text-white"
                >
                  Подробнее
                </Link>
                
                {/* Close button */}
                <button
                  onClick={handleCloseWelcomeMessage}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4F4F4F] hover:bg-[#5a5a5a] transition-colors flex items-center justify-center"
                  aria-label="Закрыть"
                >
                  <X className="w-[9px] h-[9px] text-white" strokeWidth={1.8} />
                </button>
              </div>
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

      {/* Assistant Panel */}
      <AssistantPanel 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)}
        context={{
          currentAction: 'Flow редактор'
        }}
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
