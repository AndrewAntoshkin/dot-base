/**
 * Zustand store для управления комментариями Flow
 */

import { create } from 'zustand';
import { FlowComment, FlowCommentWithUser } from './types';

interface CommentsState {
  // Данные
  comments: FlowCommentWithUser[];
  isLoading: boolean;
  error: string | null;
  
  // UI state
  openThreadNodeId: string | null;   // ID ноды с открытой цепочкой
  openThreadPosition: { x: number; y: number } | null; // Позиция для canvas комментариев
  isAddingComment: boolean;
  addCommentNodeId: string | null;   // ID ноды для нового комментария
  
  // Текущий пользователь
  currentUserId: string | null;
  
  // Actions
  setCurrentUserId: (userId: string | null) => void;
  
  // Fetch comments
  fetchComments: (flowId: string) => Promise<void>;
  
  // CRUD
  addComment: (flowId: string, params: {
    content: string;
    nodeId?: string;
    parentId?: string;
    positionX?: number;
    positionY?: number;
  }) => Promise<FlowCommentWithUser | null>;
  
  updateComment: (flowId: string, commentId: string, params: {
    content?: string;
    isResolved?: boolean;
    markAsRead?: boolean;
  }) => Promise<boolean>;
  
  deleteComment: (flowId: string, commentId: string) => Promise<boolean>;
  
  // UI actions
  openThread: (nodeId: string) => void;
  openCanvasThread: (position: { x: number; y: number }) => void;
  closeThread: () => void;
  
  startAddingComment: (nodeId?: string) => void;
  cancelAddingComment: () => void;
  
  // Mark as read
  markAsRead: (flowId: string, commentId: string) => Promise<void>;
  
  // Helpers
  getCommentsForNode: (nodeId: string) => FlowCommentWithUser[];
  getUnreadCountForNode: (nodeId: string) => number;
  getCanvasComments: () => FlowCommentWithUser[];
  
  // Reset
  reset: () => void;
}

const initialState = {
  comments: [],
  isLoading: false,
  error: null,
  openThreadNodeId: null,
  openThreadPosition: null,
  isAddingComment: false,
  addCommentNodeId: null,
  currentUserId: null,
};

export const useCommentsStore = create<CommentsState>((set, get) => ({
  ...initialState,
  
  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  
  fetchComments: async (flowId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/flow/${flowId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const data = await response.json();
      set({ comments: data.comments || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ error: 'Failed to load comments', isLoading: false });
    }
  },
  
  addComment: async (flowId, params) => {
    try {
      const response = await fetch(`/api/flow/${flowId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: params.content,
          node_id: params.nodeId,
          parent_id: params.parentId,
          position_x: params.positionX,
          position_y: params.positionY,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create comment');
      }
      
      const data = await response.json();
      const newComment = data.comment as FlowCommentWithUser;
      
      set((state) => ({
        comments: [...state.comments, newComment],
        isAddingComment: false,
        addCommentNodeId: null,
      }));
      
      return newComment;
    } catch (error) {
      console.error('Error creating comment:', error);
      return null;
    }
  },
  
  updateComment: async (flowId, commentId, params) => {
    try {
      const response = await fetch(`/api/flow/${flowId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: params.content,
          is_resolved: params.isResolved,
          mark_as_read: params.markAsRead,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update comment');
      }
      
      const data = await response.json();
      const updatedComment = data.comment;
      
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, ...updatedComment } : c
        ),
      }));
      
      return true;
    } catch (error) {
      console.error('Error updating comment:', error);
      return false;
    }
  },
  
  deleteComment: async (flowId, commentId) => {
    try {
      const response = await fetch(`/api/flow/${flowId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId && c.parent_id !== commentId),
      }));
      
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  },
  
  openThread: (nodeId) => set({ 
    openThreadNodeId: nodeId, 
    openThreadPosition: null 
  }),
  
  openCanvasThread: (position) => set({ 
    openThreadNodeId: null, 
    openThreadPosition: position 
  }),
  
  closeThread: () => set({ 
    openThreadNodeId: null, 
    openThreadPosition: null 
  }),
  
  startAddingComment: (nodeId) => set({ 
    isAddingComment: true, 
    addCommentNodeId: nodeId || null,
    openThreadNodeId: nodeId || null,
  }),
  
  cancelAddingComment: () => set({ 
    isAddingComment: false, 
    addCommentNodeId: null 
  }),
  
  markAsRead: async (flowId, commentId) => {
    const { currentUserId } = get();
    if (!currentUserId) return;
    
    await get().updateComment(flowId, commentId, { markAsRead: true });
  },
  
  getCommentsForNode: (nodeId) => {
    return get().comments.filter((c) => c.node_id === nodeId);
  },
  
  getUnreadCountForNode: (nodeId) => {
    const { comments, currentUserId } = get();
    if (!currentUserId) return 0;
    
    return comments.filter(
      (c) => c.node_id === nodeId && !c.read_by?.includes(currentUserId)
    ).length;
  },
  
  getCanvasComments: () => {
    return get().comments.filter(
      (c) => !c.node_id && c.position_x != null && c.position_y != null
    ) as FlowCommentWithUser[];
  },
  
  reset: () => set(initialState),
}));
