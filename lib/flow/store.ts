/**
 * Zustand store для управления состоянием Flow
 */

import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Viewport,
} from '@xyflow/react';
import { FlowBlockType, FlowNodeData, ReactFlowNodeData, FlowNodeStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

interface FlowState {
  // Flow metadata
  flowId: string | null;
  flowName: string;
  
  // React Flow state
  nodes: Node<ReactFlowNodeData>[];
  edges: Edge[];
  viewport: Viewport;
  
  // UI state
  selectedNodeId: string | null;
  isSettingsPanelOpen: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Block creation modal
  isBlockModalOpen: boolean;
  blockModalPosition: { x: number; y: number } | null; // Canvas coordinates
  screenPosition: { x: number; y: number } | null; // Screen coordinates for modal
  
  // Actions
  setFlowId: (id: string | null) => void;
  setFlowName: (name: string) => void;
  
  // Node actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  addNode: (type: FlowBlockType, position: { x: number; y: number }, modelId?: string) => string;
  updateNodeData: (nodeId: string, data: Partial<ReactFlowNodeData>) => void;
  removeNode: (nodeId: string) => void;
  
  // Selection
  selectNode: (nodeId: string | null) => void;
  
  // Settings panel
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  
  // Block modal
  openBlockModal: (position: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  closeBlockModal: () => void;
  
  // Viewport
  setViewport: (viewport: Viewport) => void;
  
  // Persistence
  setIsSaving: (saving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // Load flow
  loadFlow: (nodes: Node<ReactFlowNodeData>[], edges: Edge[], name: string) => void;
  
  // Generation
  runGeneration: (nodeId: string) => Promise<void>;
  
  // Reset
  reset: () => void;
  
  // Flow management
  resetFlow: () => void;
  saveFlow: () => Promise<void>;
}

// Grid configuration - must match flow-canvas.tsx
const GRID_SIZE = 20;

// Utility to snap position to grid
const snapToGrid = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;

const initialState = {
  flowId: null,
  flowName: 'Без названия',
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  isSettingsPanelOpen: false,
  isSaving: false,
  hasUnsavedChanges: false,
  isBlockModalOpen: false,
  blockModalPosition: null,
  screenPosition: null,
};

export const useFlowStore = create<FlowState>((set, get) => ({
  ...initialState,

  setFlowId: (id) => set({ flowId: id }),
  setFlowName: (name) => set({ flowName: name, hasUnsavedChanges: true }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<ReactFlowNodeData>[],
      hasUnsavedChanges: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      hasUnsavedChanges: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      hasUnsavedChanges: true,
    });
  },

  addNode: (type, position, modelId) => {
    const id = uuidv4();
    // Snap position to grid for alignment
    const snappedPosition = {
      x: snapToGrid(position.x),
      y: snapToGrid(position.y),
    };
    const newNode: Node<ReactFlowNodeData> = {
      id,
      type: `flow-${type}`,
      position: snappedPosition,
      data: {
        blockType: type,
        modelId,
        status: 'idle' as FlowNodeStatus,
        prompt: '',
        settings: {},
      },
    };

    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      isSettingsPanelOpen: true,
      hasUnsavedChanges: true,
      isBlockModalOpen: false,
      blockModalPosition: null,
      screenPosition: null,
    });

    return id;
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
      hasUnsavedChanges: true,
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      isSettingsPanelOpen: get().selectedNodeId === nodeId ? false : get().isSettingsPanelOpen,
      hasUnsavedChanges: true,
    });
  },

  selectNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      isSettingsPanelOpen: nodeId !== null,
    });
  },

  openSettingsPanel: () => set({ isSettingsPanelOpen: true }),
  closeSettingsPanel: () => set({ isSettingsPanelOpen: false }),

  openBlockModal: (position, screenPos) => {
    set({
      isBlockModalOpen: true,
      blockModalPosition: position,
      screenPosition: screenPos,
    });
  },

  closeBlockModal: () => {
    set({
      isBlockModalOpen: false,
      blockModalPosition: null,
      screenPosition: null,
    });
  },

  setViewport: (viewport) => set({ viewport }),

  setIsSaving: (saving) => set({ isSaving: saving }),
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  loadFlow: (nodes, edges, name) => {
    set({
      nodes,
      edges,
      flowName: name,
      hasUnsavedChanges: false,
      selectedNodeId: null,
      isSettingsPanelOpen: false,
    });
  },

  runGeneration: async (nodeId) => {
    const { nodes, edges, flowId, updateNodeData } = get();
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      console.error('Node not found');
      return;
    }

    // Find connected source nodes (inputs)
    const inputEdges = edges.filter(e => e.target === nodeId);
    const sourceNodes = inputEdges
      .map(edge => nodes.find(n => n.id === edge.source))
      .filter(Boolean);

    // Get output from connected source node (use first one if multiple)
    let inputFromSource: string | undefined;
    let inputImageUrl: string | undefined;
    const connectedImages: string[] = [];
    const connectedVideos: string[] = [];
    
    console.log('[Flow] Source nodes:', sourceNodes.length, sourceNodes.map(n => n?.data));
    
    for (const sourceNode of sourceNodes) {
      if (sourceNode) {
        console.log('[Flow] Source node data:', sourceNode.data);
        // If source is text node, use its text (AI output or manual prompt)
        // Priority: outputText (AI) > prompt (manual) > output (legacy)
        if (sourceNode.data.blockType === 'text') {
          const textOutput = sourceNode.data.outputText || sourceNode.data.prompt || sourceNode.data.output;
          if (textOutput) {
            inputFromSource = textOutput as string;
            console.log('[Flow] Got text from source:', inputFromSource);
          }
        }
        // If source is image node, collect the image
        if (sourceNode.data.blockType === 'image') {
          const imageOutput = sourceNode.data.outputUrl || sourceNode.data.output;
          if (imageOutput) {
            inputImageUrl = imageOutput as string;
            connectedImages.push(imageOutput as string);
            console.log('[Flow] Got image from source:', inputImageUrl);
          }
        }
        // If source is video node, collect the video
        if (sourceNode.data.blockType === 'video') {
          const videoOutput = sourceNode.data.outputUrl || sourceNode.data.output;
          if (videoOutput) {
            connectedVideos.push(videoOutput as string);
            console.log('[Flow] Got video from source:', videoOutput);
          }
        }
      }
    }

    // For text nodes: collect uploaded media
    const uploadedImages: string[] = [];
    const uploadedVideos: string[] = [];
    if (node.data.blockType === 'text' && node.data.uploadedMedia) {
      for (const media of node.data.uploadedMedia) {
        if (media.type === 'image') {
          uploadedImages.push(media.url);
        } else if (media.type === 'video') {
          uploadedVideos.push(media.url);
        }
      }
    }

    // Combine all media
    const allImages = [...connectedImages, ...uploadedImages];
    const allVideos = [...connectedVideos, ...uploadedVideos];
    const hasMedia = allImages.length > 0 || allVideos.length > 0;

    // Build the prompt - combine source text with node's own prompt
    let finalPrompt = node.data.prompt || '';
    let sourceText: string | undefined;
    
    if (inputFromSource) {
      if (node.data.blockType === 'text') {
        // For text → text: pass source text separately and use node prompt as instruction
        sourceText = inputFromSource;
        // If no prompt, default instruction
        if (!finalPrompt) {
          finalPrompt = 'Перепиши этот текст';
        }
        console.log('[Flow] Text-to-text mode - source:', sourceText, 'instruction:', finalPrompt);
      } else {
        // For image/video nodes: use source text as prompt
        finalPrompt = inputFromSource + (finalPrompt ? '\n' + finalPrompt : '');
      }
    }

    console.log('[Flow] Final prompt:', finalPrompt);
    console.log('[Flow] Input image:', inputImageUrl);
    console.log('[Flow] All images:', allImages.length);
    console.log('[Flow] All videos:', allVideos.length);
    console.log('[Flow] Source text:', sourceText);

    // For text nodes with media or source text, we can proceed even without a prompt
    if (!finalPrompt && !inputImageUrl && !hasMedia && !sourceText) {
      console.error('[Flow] No prompt or input media or source text');
      return;
    }
    
    // Default prompt for media analysis if none provided
    if (node.data.blockType === 'text' && hasMedia && !finalPrompt) {
      finalPrompt = 'Опиши что изображено на этой картинке/видео';
    }

    // Set status to running
    updateNodeData(nodeId, { status: 'running' as FlowNodeStatus });

    // Determine model ID based on node type
    let modelId = node.data.modelId || node.data.settings?.model;
    
    // Default models for each type
    if (!modelId) {
      switch (node.data.blockType) {
        case 'text':
          modelId = 'gemini-2.5-flash';
          break;
        case 'image':
          modelId = 'nano-banana-pro';
          break;
        case 'video':
          modelId = 'seedance-1.5-pro-t2v';
          break;
      }
    }

    // For video node with keyframes (2+ images): use first as start, second as end
    let startImageUrl: string | undefined;
    let endImageUrl: string | undefined;
    const isKeyframeMode = node.data.blockType === 'video' && connectedImages.length >= 2;
    
    if (isKeyframeMode) {
      // Check if frames are swapped in UI (stored in settings)
      const framesSwapped = node.data.settings?.framesSwapped;
      startImageUrl = framesSwapped ? connectedImages[1] : connectedImages[0];
      endImageUrl = framesSwapped ? connectedImages[0] : connectedImages[1];
      console.log('[Flow] Keyframe mode - start:', startImageUrl, 'end:', endImageUrl);
    }

    try {
      const response = await fetch('/api/flow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          flowId: flowId || 'temp',
          modelId,
          prompt: finalPrompt,
          settings: node.data.settings,
          inputImageUrl, // Pass image from connected node (single I2V mode)
          startImageUrl, // For keyframe mode - first frame
          endImageUrl, // For keyframe mode - last frame
          referenceImages: node.data.referenceImages, // Pass reference images
          // For text node media analysis
          analyzeImages: node.data.blockType === 'text' ? allImages : undefined,
          analyzeVideos: node.data.blockType === 'text' ? allVideos : undefined,
          // For text-to-text: pass source text from connected text node
          sourceText: node.data.blockType === 'text' ? sourceText : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const result = await response.json();
      console.log('Generation result:', result);
      
      // For text generation, the output is returned directly
      if (result.outputType === 'text' && result.output) {
        updateNodeData(nodeId, { 
          status: 'completed' as FlowNodeStatus,
          outputText: result.output,
          outputType: 'text',
        });
      } else if (result.outputUrl) {
        // Image/video completed (localhost polling returned result)
        updateNodeData(nodeId, { 
          status: 'completed' as FlowNodeStatus,
          outputUrl: result.outputUrl,
          outputType: node.data.blockType === 'video' ? 'video' : 'image',
        });
      } else if (result.success) {
        // For production with webhook, keep running status
        console.log('Generation started, waiting for webhook:', result.generationId);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      updateNodeData(nodeId, { 
        status: 'failed' as FlowNodeStatus,
        errorMessage: error instanceof Error ? error.message : 'Ошибка генерации',
      });
    }
  },

  reset: () => set(initialState),
  
  // Reset flow - clear all nodes and edges but keep flow metadata
  resetFlow: () => set((state) => ({
    ...state,
    nodes: [],
    edges: [],
    hasUnsavedChanges: true,
    selectedNodeId: null,
  })),
  
  // Save flow to server
  saveFlow: async () => {
    const state = get();
    if (!state.flowId) {
      console.log('No flow ID, skipping save');
      return;
    }
    
    set({ isSaving: true });
    
    try {
      const response = await fetch(`/api/flow/${state.flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.flowName,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save flow');
      }
      
      set({ hasUnsavedChanges: false });
    } catch (error) {
      console.error('Error saving flow:', error);
    } finally {
      set({ isSaving: false });
    }
  },
}));

// Селекторы
export const useSelectedNode = () => {
  const nodes = useFlowStore((state) => state.nodes);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  return nodes.find((node) => node.id === selectedNodeId);
};
