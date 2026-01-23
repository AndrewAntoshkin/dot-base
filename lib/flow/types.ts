/**
 * Типы для Flow (визуального конструктора AI-пайплайнов)
 */

export type FlowBlockType = 'text' | 'image' | 'video';

export type FlowNodeStatus = 
  | 'idle'        // Ожидает ввода
  | 'pending'     // Добавлен в очередь
  | 'processing'  // Генерация идёт
  | 'running'     // Альтернатива processing для UI
  | 'succeeded'   // Готово
  | 'completed'   // Альтернатива succeeded для UI
  | 'failed';     // Ошибка

// Media item for uploads
export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface FlowNodeData {
  // Общие поля
  blockType: FlowBlockType;
  modelId?: string;
  prompt?: string;
  
  // Настройки модели (из models-config.ts)
  settings?: Record<string, any>;
  
  // Референсные изображения (для image нодов)
  referenceImages?: string[]; // URLs загруженных референсов
  
  // Загруженные медиа для анализа (для text нодов)
  uploadedMedia?: MediaItem[]; // Загруженные картинки/видео
  
  // Результат генерации
  outputUrl?: string;
  outputType?: 'image' | 'video' | 'text';
  outputText?: string; // Для текстовых блоков
  
  // Статус
  status: FlowNodeStatus;
  errorMessage?: string;
  
  // Связь с генерацией
  generationId?: string;
  
  // UI state
  isSettingsOpen?: boolean;
  
  // Автор ноды (для коллаборации)
  createdBy?: string;       // user_id автора
  createdByEmail?: string;  // email автора для отображения
}

// Статусы для Kanban-доски в пространстве
export type FlowWorkspaceStatus = 'in_progress' | 'review' | 'done' | 'archived';

export interface Flow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  is_template: boolean;
  workspace_id?: string;
  status: FlowWorkspaceStatus;
  created_at: string;
  updated_at: string;
}

// Для карточки флоу в Kanban
export interface FlowCardMember {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface FlowCard {
  id: string;
  name: string;
  description?: string;
  status: FlowWorkspaceStatus;
  created_at: string;
  updated_at: string;
  user_id: string;
  owner_email?: string;
  members: FlowCardMember[];
  node_count: number;
}

export interface FlowNode {
  id: string;
  flow_id: string;
  block_type: FlowBlockType;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  data: FlowNodeData;
  model_id?: string;
  output_url?: string;
  output_type?: string;
  status: FlowNodeStatus;
  error_message?: string;
  generation_id?: string;
  created_by?: string;       // user_id автора
  created_by_email?: string; // email автора
  created_at: string;
  updated_at: string;
}

export interface FlowEdge {
  id: string;
  flow_id: string;
  source_node_id: string;
  source_handle?: string;
  target_node_id: string;
  target_handle?: string;
  edge_type: string;
  created_at: string;
}

// React Flow типы - добавляем index signature для совместимости
export interface ReactFlowNodeData extends FlowNodeData {
  label?: string;
  output?: string; // Legacy field for backwards compatibility
  [key: string]: unknown;
}

// Конвертеры между DB и React Flow форматами
export function dbNodeToReactFlow(node: FlowNode): import('@xyflow/react').Node<ReactFlowNodeData> {
  return {
    id: node.id,
    type: `flow-${node.block_type}`,
    position: { x: node.position_x, y: node.position_y },
    data: {
      ...node.data,
      blockType: node.block_type,
      modelId: node.model_id,
      outputUrl: node.output_url,
      outputType: node.output_type as 'image' | 'video' | 'text' | undefined,
      status: node.status as FlowNodeStatus,
      errorMessage: node.error_message,
      generationId: node.generation_id,
      createdBy: node.created_by,
      createdByEmail: node.created_by_email,
    },
    width: node.width ?? undefined,
    height: node.height ?? undefined,
  };
}

export function dbEdgeToReactFlow(edge: FlowEdge): import('@xyflow/react').Edge {
  return {
    id: edge.id,
    source: edge.source_node_id,
    sourceHandle: edge.source_handle || undefined,
    target: edge.target_node_id,
    targetHandle: edge.target_handle || undefined,
    type: edge.edge_type || 'default',
  };
}

export function reactFlowNodeToDb(
  node: import('@xyflow/react').Node<ReactFlowNodeData>,
  flowId: string
): Partial<FlowNode> {
  return {
    id: node.id,
    flow_id: flowId,
    block_type: node.data.blockType,
    position_x: node.position.x,
    position_y: node.position.y,
    width: node.width,
    height: node.height,
    data: node.data,
    model_id: node.data.modelId,
    output_url: node.data.outputUrl,
    output_type: node.data.outputType,
    status: node.data.status,
    error_message: node.data.errorMessage,
    generation_id: node.data.generationId,
  };
}

export function reactFlowEdgeToDb(
  edge: import('@xyflow/react').Edge,
  flowId: string
): Partial<FlowEdge> {
  return {
    id: edge.id,
    flow_id: flowId,
    source_node_id: edge.source,
    source_handle: edge.sourceHandle ?? undefined,
    target_node_id: edge.target,
    target_handle: edge.targetHandle ?? undefined,
    edge_type: edge.type || 'default',
  };
}
