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
  loadFlowFromServer: (flowId: string) => Promise<boolean>;
  
  // Generation
  runGeneration: (nodeId: string) => Promise<void>;
  
  // Inline edit actions (upscale, remove_bg, inpaint, outpaint, edit)
  runEditAction: (nodeId: string, action: string, params: {
    modelId: string;
    prompt?: string;
    settings?: Record<string, any>;
    maskUrl?: string;
  }) => Promise<void>;
  
  // Reset
  reset: () => void;
  
  // Flow management
  resetFlow: () => void;
  clearFlow: () => void;
  createNewFlow: (name?: string) => Promise<string | null>;
  saveFlow: () => Promise<boolean>;
  
  // User flows list
  userFlows: { id: string; name: string; updated_at: string }[];
  isLoadingFlows: boolean;
  fetchUserFlows: () => Promise<void>;
}

// Grid configuration - must match flow-canvas.tsx
const GRID_SIZE = 20;

// Utility to snap position to grid
const snapToGrid = (value: number): number => Math.round(value / GRID_SIZE) * GRID_SIZE;

const initialState = {
  flowId: null as string | null,
  flowName: 'Без названия',
  nodes: [] as Node<ReactFlowNodeData>[],
  edges: [] as Edge[],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null as string | null,
  isSettingsPanelOpen: false,
  isSaving: false,
  hasUnsavedChanges: false,
  isBlockModalOpen: false,
  blockModalPosition: null as { x: number; y: number } | null,
  screenPosition: null as { x: number; y: number } | null,
  userFlows: [] as { id: string; name: string; updated_at: string }[],
  isLoadingFlows: false,
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

  loadFlowFromServer: async (flowId) => {
    try {
      const response = await fetch(`/api/flow/${flowId}`);
      if (!response.ok) {
        console.error('Failed to load flow');
        return false;
      }

      const data = await response.json();
      const { flow, nodes: dbNodes, edges: dbEdges } = data;

      // Convert DB nodes to React Flow nodes
      const reactFlowNodes: Node<ReactFlowNodeData>[] = (dbNodes || []).map((node: any) => ({
        id: node.id,
        type: `flow-${node.block_type}`,
        position: { x: node.position_x, y: node.position_y },
        data: {
          blockType: node.block_type,
          modelId: node.model_id,
          status: node.status || 'idle',
          prompt: node.data?.prompt || '',
          outputUrl: node.output_url || node.data?.outputUrl,
          outputType: node.output_type || node.data?.outputType,
          outputText: node.data?.outputText,
          settings: node.data?.settings || {},
          // Автор ноды
          createdBy: node.created_by,
          createdByEmail: node.created_by_email,
          ...node.data,
        },
      }));

      // Convert DB edges to React Flow edges
      const reactFlowEdges: Edge[] = (dbEdges || []).map((edge: any) => ({
        id: edge.id,
        source: edge.source_node_id,
        sourceHandle: edge.source_handle,
        target: edge.target_node_id,
        targetHandle: edge.target_handle,
        type: edge.edge_type || 'default',
      }));

      set({
        flowId,
        flowName: flow.name,
        nodes: reactFlowNodes,
        edges: reactFlowEdges,
        viewport: {
          x: flow.viewport_x || 0,
          y: flow.viewport_y || 0,
          zoom: flow.viewport_zoom || 1,
        },
        hasUnsavedChanges: false,
        selectedNodeId: null,
        isSettingsPanelOpen: false,
      });

      return true;
    } catch (error) {
      console.error('Error loading flow:', error);
      return false;
    }
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

    // For video node with keyframes (2+ images): determine mode first
    const isKeyframeMode = node.data.blockType === 'video' && connectedImages.length >= 2;
    
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

    // Auto-switch T2V model to I2V if image is connected (single image, not keyframe)
    if (node.data.blockType === 'video' && inputImageUrl && !isKeyframeMode) {
      const t2vToI2vMap: Record<string, string> = {
        'seedance-1.5-pro-t2v': 'seedance-1.5-pro-i2v',
        'kling-v2.5-turbo-pro-t2v': 'kling-v2.5-turbo-pro-i2v',
        'kling-v2.1-master-t2v': 'kling-v2.1-master-i2v',
        'hailuo-2.3-t2v': 'hailuo-2.3-fast-i2v',
        'hailuo-02-t2v': 'hailuo-02-i2v',
        'wan-2.5-t2v': 'wan-2.5-i2v-fast',
        'kling-v2.0-t2v': 'kling-v2.0-i2v',
        'veo-3.1-fast': 'veo-3.1-fast-i2v',
      };
      
      if (t2vToI2vMap[modelId]) {
        console.log(`[Flow] Auto-switching T2V model ${modelId} to I2V ${t2vToI2vMap[modelId]} (image connected)`);
        modelId = t2vToI2vMap[modelId];
      }
    }

    // For video node with keyframes (2+ images): use first as start, second as end
    let startImageUrl: string | undefined;
    let endImageUrl: string | undefined;
    
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
        // For production with webhook, keep running status and store generationId for polling
        updateNodeData(nodeId, {
          status: 'running' as FlowNodeStatus,
          generationId: result.generationId,
        });
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

  runEditAction: async (nodeId, action, params) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    const imageUrl = node.data.outputUrl;
    if (!imageUrl) {
      console.error('[FlowEdit] No outputUrl on node');
      return;
    }

    // Save previous image for undo, set running status
    get().updateNodeData(nodeId, {
      previousOutputUrl: imageUrl,
      status: 'running' as FlowNodeStatus,
      editMode: null,
      editMaskDataUrl: undefined,
      editPrompt: undefined,
      errorMessage: undefined,
    });

    try {
      // Build settings with the image -- set ALL possible field names
      // so every model gets its expected field:
      //   reve-edit, inpaint, upscale, remove_bg, expand → "image"
      //   flux-kontext-max-edit → "input_image"
      //   nano-banana-pro-edit (Google) → "image_input"
      const settings: Record<string, any> = {
        image: imageUrl,
        input_image: imageUrl,
        image_input: imageUrl,
        ...params.settings,
      };

      // For inpaint, add mask
      if (action === 'inpaint' && params.maskUrl) {
        settings.mask = params.maskUrl;
      }

      // For expand, always include prompt in settings (required by Bria)
      // The API's `if (validatedData.prompt)` skips empty strings, so we put it in settings directly
      if (action === 'expand') {
        settings.prompt = params.prompt || '';
      }

      console.log('[FlowEdit] Calling API:', { action, model_id: params.modelId, prompt: params.prompt });

      const response = await fetch('/api/generations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          model_id: params.modelId,
          prompt: params.prompt ?? '',
          input_image_url: imageUrl,
          settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Edit action failed');
      }

      const result = await response.json();
      console.log('[FlowEdit] API result:', JSON.stringify(result));

      // API returns { id, prediction_id, status } directly
      // Some providers (Google) return completed immediately with output_urls
      if (result.status === 'completed' && result.output_urls?.length > 0) {
        console.log('[FlowEdit] Immediate completion, updating node:', nodeId, result.output_urls[0]);
        get().updateNodeData(nodeId, {
          status: 'completed' as FlowNodeStatus,
          outputUrl: result.output_urls[0],
          outputType: 'image',
        });
        return;
      }

      const generationId = result.id;
      if (generationId) {
        // Store generationId for polling
        get().updateNodeData(nodeId, {
          status: 'running' as FlowNodeStatus,
          generationId,
        });

        // Polling with recursive setTimeout (avoids concurrent callbacks)
        let pollCount = 0;
        const maxPolls = 100; // ~5 minutes at 3s intervals

        const poll = async () => {
          pollCount++;
          if (pollCount > maxPolls) {
            console.log('[FlowEdit] Polling timed out for', generationId);
            get().updateNodeData(nodeId, {
              status: 'failed' as FlowNodeStatus,
              errorMessage: 'Timeout: generation took too long',
              generationId: undefined,
            });
            return;
          }

          try {
            console.log(`[FlowEdit] Poll #${pollCount} for ${generationId}`);
            const statusRes = await fetch(`/api/generations/${generationId}`);
            if (!statusRes.ok) {
              console.log('[FlowEdit] Poll response not ok:', statusRes.status);
              setTimeout(poll, 3000);
              return;
            }
            const statusData = await statusRes.json();
            console.log(`[FlowEdit] Poll #${pollCount} status=${statusData.status}, output_urls=${JSON.stringify(statusData.output_urls)}`);

            if (statusData.status === 'completed' && statusData.output_urls?.length > 0) {
              console.log('[FlowEdit] DONE! Updating node', nodeId, 'with', statusData.output_urls[0]);
              get().updateNodeData(nodeId, {
                status: 'completed' as FlowNodeStatus,
                outputUrl: statusData.output_urls[0],
                outputType: 'image',
                generationId: undefined,
              });
              // DONE - do not schedule next poll
              return;
            } else if (statusData.status === 'failed') {
              console.log('[FlowEdit] FAILED for', generationId);
              get().updateNodeData(nodeId, {
                status: 'failed' as FlowNodeStatus,
                errorMessage: statusData.error_message || 'Edit action failed',
                generationId: undefined,
              });
              // DONE - do not schedule next poll
              return;
            }

            // Still processing, schedule next poll
            setTimeout(poll, 3000);
          } catch (err) {
            console.error('[FlowEdit] Poll error:', err);
            setTimeout(poll, 3000);
          }
        };

        // Start first poll after 3s
        setTimeout(poll, 3000);
      }
    } catch (error) {
      console.error('[FlowEdit] Error:', error);
      get().updateNodeData(nodeId, {
        status: 'failed' as FlowNodeStatus,
        errorMessage: error instanceof Error ? error.message : 'Edit action failed',
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

  // Clear flow - reset to initial state (new empty flow)
  clearFlow: () => set({
    ...initialState,
    flowId: null,
    flowName: 'Без названия',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    hasUnsavedChanges: false,
    selectedNodeId: null,
    isSettingsPanelOpen: false,
  }),

  // Create new flow in database
  createNewFlow: async (name = 'Без названия') => {
    set({ isSaving: true });
    
    try {
      const state = get();
      
      // Prepare nodes for API
      const nodesForApi = state.nodes.map(node => ({
        id: node.id,
        block_type: node.data.blockType,
        position_x: node.position.x,
        position_y: node.position.y,
        data: node.data,
        model_id: node.data.modelId,
        output_url: node.data.outputUrl,
        output_type: node.data.outputType,
        status: node.data.status,
      }));

      // Prepare edges for API
      const edgesForApi = state.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: edge.type,
      }));

      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          nodes: nodesForApi,
          edges: edgesForApi,
          viewport_x: state.viewport.x,
          viewport_y: state.viewport.y,
          viewport_zoom: state.viewport.zoom,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create flow');
      }

      const data = await response.json();
      
      set({
        flowId: data.flow.id,
        flowName: data.flow.name,
        hasUnsavedChanges: false,
      });

      // Refresh user flows list
      get().fetchUserFlows();

      return data.flow.id;
    } catch (error) {
      console.error('Error creating flow:', error);
      return null;
    } finally {
      set({ isSaving: false });
    }
  },
  
  // Save flow to server
  saveFlow: async () => {
    const state = get();
    
    // If no flowId, create new flow
    if (!state.flowId) {
      const newId = await get().createNewFlow(state.flowName);
      return newId !== null;
    }
    
    set({ isSaving: true });
    
    try {
      // Prepare nodes for API
      const nodesForApi = state.nodes.map(node => ({
        id: node.id,
        block_type: node.data.blockType,
        position_x: node.position.x,
        position_y: node.position.y,
        data: node.data,
        model_id: node.data.modelId,
        output_url: node.data.outputUrl,
        output_type: node.data.outputType,
        status: node.data.status,
      }));

      // Prepare edges for API
      const edgesForApi = state.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: edge.type,
      }));

      const response = await fetch(`/api/flow/${state.flowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: state.flowName,
          viewport_x: state.viewport.x,
          viewport_y: state.viewport.y,
          viewport_zoom: state.viewport.zoom,
          nodes: nodesForApi,
          edges: edgesForApi,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to save flow');
      }
      
      set({ hasUnsavedChanges: false });

      // Refresh user flows list
      get().fetchUserFlows();

      return true;
    } catch (error) {
      console.error('Error saving flow:', error);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  // Fetch user's flows list
  fetchUserFlows: async () => {
    set({ isLoadingFlows: true });
    
    try {
      const response = await fetch('/api/flow?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch flows');
      }

      const data = await response.json();
      
      set({
        userFlows: data.flows.map((f: any) => ({
          id: f.id,
          name: f.name,
          updated_at: f.updated_at,
        })),
      });
    } catch (error) {
      console.error('Error fetching user flows:', error);
    } finally {
      set({ isLoadingFlows: false });
    }
  },
}));

// Селекторы
export const useSelectedNode = () => {
  const nodes = useFlowStore((state) => state.nodes);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  return nodes.find((node) => node.id === selectedNodeId);
};
