'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFlowStore } from '@/lib/flow/store';
import { useCommentsStore } from '@/lib/flow/comments-store';
import { FlowCanvas } from '@/components/flow/flow-canvas';
import { FlowCreateModal } from '@/components/flow/flow-create-modal';
import { dbNodeToReactFlow, dbEdgeToReactFlow } from '@/lib/flow/types';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function FlowPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowId = searchParams.get('id');
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    setFlowId,
    loadFlow,
    nodes,
    edges,
    flowName,
    viewport,
    reset,
  } = useFlowStore();

  const { 
    fetchComments, 
    setCurrentUserId,
    reset: resetComments,
  } = useCommentsStore();

  // Получаем текущего пользователя
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setCurrentUserId(user.id);
      }
      setIsUserLoading(false);
    };
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загрузка flow из API (обходит RLS через adminClient)
  const loadFlowFromDb = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/flow/${id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load flow');
      }

      const { flow: flowData, nodes: nodesData, edges: edgesData } = result;

      // Конвертируем в React Flow формат
      const reactFlowNodes = (nodesData || []).map(dbNodeToReactFlow);
      const reactFlowEdges = (edgesData || []).map(dbEdgeToReactFlow);

      setFlowId(id);
      loadFlow(reactFlowNodes, reactFlowEdges, flowData.name);

      // Загружаем комментарии
      fetchComments(id);

    } catch (err) {
      console.error('Error loading flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    }
  }, [setFlowId, loadFlow, fetchComments]);

  // Показать модалку создания нового flow
  const showCreateFlowModal = useCallback(() => {
    if (!user) return;
    setShowCreateModal(true);
    setIsLoading(false);
  }, [user]);

  // Создание нового flow через API с данными из модалки
  const handleCreateFlow = useCallback(async (data: {
    name: string;
    description: string;
    members: { email: string; role: 'editor' | 'viewer' }[];
  }) => {
    if (!user) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          members: data.members,
          nodes: [],
          edges: [],
          viewport_x: 0,
          viewport_y: 0,
          viewport_zoom: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create flow');
      }

      setFlowId(result.flow.id);
      setShowCreateModal(false);
      
      // Обновляем URL
      router.replace(`/flow?id=${result.flow.id}`);

    } catch (err) {
      console.error('Error creating flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to create flow');
    } finally {
      setIsCreating(false);
    }
  }, [user, setFlowId, router]);

  // Сохранение flow через API (обходит RLS через adminClient)
  const saveFlow = useCallback(async () => {
    const currentFlowId = useFlowStore.getState().flowId;
    if (!currentFlowId) return;

    const state = useFlowStore.getState();

    try {
      // Подготавливаем nodes для API
      const nodesForApi = state.nodes.map((node) => ({
        id: node.id,
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
      }));

      // Подготавливаем edges для API
      const edgesForApi = state.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: edge.type || 'default',
      }));

      const response = await fetch(`/api/flow/${currentFlowId}`, {
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
        const result = await response.json();
        throw new Error(result.error || 'Failed to save flow');
      }

    } catch (err) {
      console.error('Error saving flow:', err);
      throw err;
    }
  }, []);

  // Сброс flow
  const handleReset = useCallback(() => {
    reset();
    router.push('/flow');
  }, [reset, router]);

  // Инициализация
  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        if (flowId) {
          // Загружаем существующий flow
          await loadFlowFromDb(flowId);
          setIsLoading(false);
        } else {
          // Показываем модалку для создания нового flow
          showCreateFlowModal();
        }
      } catch {
        setIsLoading(false);
      }
    };

    init();
  }, [flowId, user, isUserLoading, loadFlowFromDb, showCreateFlowModal, router]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      reset();
      resetComments();
    };
  }, [reset, resetComments]);

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#6D6D6D]">Загрузка редактора...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-sm text-red-400">{error}</span>
          <button
            onClick={() => router.push('/flow')}
            className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium"
          >
            Создать новый
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050505] relative">
      {/* Canvas - contains all UI (toolbar, empty state, controls) */}
      <FlowCanvas />
      
      {/* Create Flow Modal */}
      <FlowCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          // Если модалка закрыта без создания, редирект на главную
          if (!flowId) {
            router.push('/');
          }
        }}
        onSubmit={handleCreateFlow}
        isLoading={isCreating}
      />
    </div>
  );
}
