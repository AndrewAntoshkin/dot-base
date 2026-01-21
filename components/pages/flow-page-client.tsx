'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFlowStore } from '@/lib/flow/store';
import { FlowCanvas } from '@/components/flow/flow-canvas';
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

  // Получаем текущего пользователя
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsUserLoading(false);
    };
    getUser();
  }, []);

  const {
    setFlowId,
    loadFlow,
    nodes,
    edges,
    flowName,
    viewport,
    reset,
  } = useFlowStore();

  // Загрузка flow из БД
  const loadFlowFromDb = useCallback(async (id: string) => {
    const supabase = createClient();

    try {
      // Загружаем flow
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('*')
        .eq('id', id)
        .single();

      if (flowError) throw flowError;
      if (!flowData) throw new Error('Flow not found');

      // Загружаем nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('flow_nodes')
        .select('*')
        .eq('flow_id', id);

      if (nodesError) throw nodesError;

      // Загружаем edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('flow_edges')
        .select('*')
        .eq('flow_id', id);

      if (edgesError) throw edgesError;

      // Конвертируем в React Flow формат
      const reactFlowNodes = (nodesData || []).map(dbNodeToReactFlow);
      const reactFlowEdges = (edgesData || []).map(dbEdgeToReactFlow);

      setFlowId(id);
      loadFlow(reactFlowNodes, reactFlowEdges, flowData.name);

    } catch (err) {
      console.error('Error loading flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flow');
    }
  }, [setFlowId, loadFlow]);

  // Создание нового flow через API
  const createNewFlow = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Без названия',
          nodes: [],
          edges: [],
          viewport_x: 0,
          viewport_y: 0,
          viewport_zoom: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create flow');
      }

      setFlowId(data.flow.id);
      
      // Обновляем URL
      router.replace(`/flow?id=${data.flow.id}`);

    } catch (err) {
      console.error('Error creating flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to create flow');
    }
  }, [user, setFlowId, router]);

  // Сохранение flow
  const saveFlow = useCallback(async () => {
    const currentFlowId = useFlowStore.getState().flowId;
    if (!currentFlowId) return;

    const supabase = createClient();
    const state = useFlowStore.getState();

    try {
      // Обновляем flow metadata
      await supabase
        .from('flows')
        .update({
          name: state.flowName,
          viewport_x: state.viewport.x,
          viewport_y: state.viewport.y,
          viewport_zoom: state.viewport.zoom,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentFlowId);

      // Удаляем старые nodes и edges
      await supabase.from('flow_nodes').delete().eq('flow_id', currentFlowId);
      await supabase.from('flow_edges').delete().eq('flow_id', currentFlowId);

      // Сохраняем nodes
      if (state.nodes.length > 0) {
        const nodesForDb = state.nodes.map((node) => ({
          id: node.id,
          flow_id: currentFlowId,
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

        await supabase.from('flow_nodes').insert(nodesForDb);
      }

      // Сохраняем edges
      if (state.edges.length > 0) {
        const edgesForDb = state.edges.map((edge) => ({
          id: edge.id,
          flow_id: currentFlowId,
          source_node_id: edge.source,
          source_handle: edge.sourceHandle,
          target_node_id: edge.target,
          target_handle: edge.targetHandle,
          edge_type: edge.type || 'default',
        }));

        await supabase.from('flow_edges').insert(edgesForDb);
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
          await loadFlowFromDb(flowId);
        } else {
          await createNewFlow();
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [flowId, user, isUserLoading, loadFlowFromDb, createNewFlow, router]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

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
    </div>
  );
}
