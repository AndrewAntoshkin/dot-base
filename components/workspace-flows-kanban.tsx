'use client';

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, Share2, MoreHorizontal } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FlowKanbanCard, FlowKanbanCardDragging } from './flow-kanban-card';
import { FlowWorkspaceModal } from './flow-workspace-modal';
import { FlowShareSimpleModal } from './flow-share-simple-modal';
import type { FlowCard, FlowWorkspaceStatus } from '@/lib/flow/types';

// Статусы Kanban-колонок
const KANBAN_COLUMNS: { id: FlowWorkspaceStatus; label: string }[] = [
  { id: 'in_progress', label: 'в работе' },
  { id: 'review', label: 'на согласовании' },
  { id: 'done', label: 'готово' },
  { id: 'archived', label: 'Архив' },
];

interface WorkspaceMember {
  id: string;
  email: string;
  name?: string;
}

interface WorkspaceFlowsKanbanProps {
  workspaceId: string;
  flows: Record<FlowWorkspaceStatus, FlowCard[]>;
  counts: Record<FlowWorkspaceStatus, number>;
  workspaceMembers: WorkspaceMember[];
  onRefresh: () => void;
}

// Изолированный компонент поиска
const SearchInput = memo(function SearchInput({ 
  onSearch 
}: { 
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onSearch(newValue);
  };

  return (
    <div className="w-[232px] h-9 bg-[#212121] rounded-[10px] flex items-center gap-1 px-[10px]">
      <Search className="w-4 h-4 text-[#717171] shrink-0" />
      <input
        type="text"
        placeholder="Поиск"
        value={value}
        onChange={handleChange}
        className="flex-1 bg-transparent text-white font-medium text-[12px] placeholder:text-[#717171] outline-none"
      />
    </div>
  );
});

// Колонка Kanban с droppable
function KanbanColumn({
  column,
  count,
  flows,
  onCardClick,
  onDeleteClick,
  onShareClick,
  isOver,
}: {
  column: { id: FlowWorkspaceStatus; label: string };
  count: number;
  flows: FlowCard[];
  onCardClick: (flow: FlowCard) => void;
  onDeleteClick: (flow: FlowCard) => void;
  onShareClick: (flow: FlowCard) => void;
  isOver?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] border rounded-[24px] p-4 flex flex-col gap-4 transition-colors ${
        isOver ? 'border-[#7357FF] bg-[#7357FF]/5' : 'border-[#353535]'
      }`}
      data-status={column.id}
    >
      {/* Заголовок колонки - как в Figma */}
      <div className="flex items-center gap-2 px-3">
        <span className="font-inter font-medium text-[14px] text-white uppercase tracking-[-0.02em] leading-[1.57]">
          {column.label}
        </span>
        <div className="h-5 px-[6px] bg-[#434343] rounded-md flex items-center justify-center">
          <span className="font-inter font-medium text-[10px] text-white leading-[2]">
            {count}
          </span>
        </div>
      </div>

      {/* Карточки */}
      <SortableContext 
        items={flows.map(f => f.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 flex-1 min-h-[100px]">
          {flows.map((flow) => (
            <FlowKanbanCard
              key={flow.id}
              flow={flow}
              onClick={() => onCardClick(flow)}
              onDelete={() => onDeleteClick(flow)}
              onShare={() => onShareClick(flow)}
            />
          ))}
          {flows.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[#4d4d4d] text-[12px]">Нет флоу</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function WorkspaceFlowsKanban({
  workspaceId,
  flows: initialFlows,
  counts: initialCounts,
  workspaceMembers,
  onRefresh,
}: WorkspaceFlowsKanbanProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<FlowWorkspaceStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Локальное состояние для оптимистичных обновлений
  const [localFlows, setLocalFlows] = useState(initialFlows);
  const [localCounts, setLocalCounts] = useState(initialCounts);
  
  // Синхронизация с пропсами при изменении извне
  useEffect(() => {
    setLocalFlows(initialFlows);
    setLocalCounts(initialCounts);
  }, [initialFlows, initialCounts]);
  const [editingFlow, setEditingFlow] = useState<FlowCard | null>(null);
  const [sharingFlow, setSharingFlow] = useState<FlowCard | null>(null);
  const [deletingFlow, setDeletingFlow] = useState<FlowCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Фильтрация по поиску
  const filteredFlows = useMemo(() => {
    if (!searchQuery.trim()) return localFlows;
    
    const query = searchQuery.toLowerCase();
    const result: Record<FlowWorkspaceStatus, FlowCard[]> = {
      in_progress: [],
      review: [],
      done: [],
      archived: [],
    };

    (Object.keys(localFlows) as FlowWorkspaceStatus[]).forEach((status) => {
      result[status] = localFlows[status].filter(
        (flow) =>
          flow.name.toLowerCase().includes(query) ||
          flow.description?.toLowerCase().includes(query)
      );
    });

    return result;
  }, [localFlows, searchQuery]);

  // Sensors для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Найти флоу по ID
  const findFlowById = useCallback((id: string): FlowCard | null => {
    for (const status of Object.keys(localFlows) as FlowWorkspaceStatus[]) {
      const found = localFlows[status].find((f) => f.id === id);
      if (found) return found;
    }
    return null;
  }, [localFlows]);

  // Найти статус флоу
  const findFlowStatus = useCallback((id: string): FlowWorkspaceStatus | null => {
    for (const status of Object.keys(localFlows) as FlowWorkspaceStatus[]) {
      if (localFlows[status].some((f) => f.id === id)) {
        return status;
      }
    }
    return null;
  }, [localFlows]);

  // Drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Drag over - для подсветки колонки
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = over.id as string;
    
    // Проверяем, над какой колонкой находимся
    if (KANBAN_COLUMNS.some(c => c.id === overId)) {
      setOverColumnId(overId as FlowWorkspaceStatus);
    } else {
      // Если над карточкой, находим её колонку
      const cardStatus = findFlowStatus(overId);
      setOverColumnId(cardStatus);
    }
  }, [findFlowStatus]);

  // Drag end - с оптимистичным обновлением
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    // Определяем целевой статус
    let targetStatus: FlowWorkspaceStatus | null = null;
    
    // Если перетащили на колонку (ID колонки = статус)
    if (KANBAN_COLUMNS.some(c => c.id === overId)) {
      targetStatus = overId as FlowWorkspaceStatus;
    } else {
      // Если перетащили на другую карточку, находим её статус
      targetStatus = findFlowStatus(overId);
    }

    if (!targetStatus) return;

    const currentStatus = findFlowStatus(draggedId);
    if (!currentStatus || currentStatus === targetStatus) return;

    // Находим перетаскиваемый флоу
    const draggedFlow = findFlowById(draggedId);
    if (!draggedFlow) return;

    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - сразу перемещаем карточку
    setLocalFlows(prev => {
      const newFlows = { ...prev };
      
      // Удаляем из текущей колонки
      newFlows[currentStatus] = prev[currentStatus].filter(f => f.id !== draggedId);
      
      // Добавляем в новую колонку (с обновлённым статусом)
      const updatedFlow = { ...draggedFlow, status: targetStatus };
      newFlows[targetStatus] = [updatedFlow, ...prev[targetStatus]];
      
      return newFlows;
    });

    // Обновляем счётчики
    setLocalCounts(prev => ({
      ...prev,
      [currentStatus]: prev[currentStatus] - 1,
      [targetStatus]: prev[targetStatus] + 1,
    }));

    // Обновляем статус через API в фоне
    try {
      const response = await fetch(`/api/flow/${draggedId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response.ok) {
        // Если ошибка - откатываем изменения
        console.error('Failed to update flow status, reverting...');
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to update flow status:', error);
      // Откатываем при ошибке
      onRefresh();
    }
  }, [findFlowStatus, findFlowById, onRefresh]);

  // Обработчики действий
  const handleCardClick = useCallback((flow: FlowCard) => {
    setEditingFlow(flow);
  }, []);

  const handleDeleteClick = useCallback((flow: FlowCard) => {
    setDeletingFlow(flow);
  }, []);

  const handleShareClick = useCallback((flow: FlowCard) => {
    setSharingFlow(flow);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingFlow) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/flow/${deletingFlow.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
        setDeletingFlow(null);
      }
    } catch (error) {
      console.error('Failed to delete flow:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingFlow, onRefresh]);

  const handleGoToFlow = useCallback((flowId: string) => {
    router.push(`/flow?id=${flowId}`);
  }, [router]);

  const activeFlow = activeId ? findFlowById(activeId) : null;

  return (
    <>
      {/* Toolbar: Поиск + Новый флоу */}
      <div className="flex items-center justify-between mb-4">
        <SearchInput onSearch={setSearchQuery} />
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1 bg-[#252525] text-white px-3 h-9 rounded-lg font-inter font-medium text-[14px] hover:bg-[#303030] transition-colors"
        >
          Новый флоу
        </button>
      </div>

      {/* Kanban-доска */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              count={localCounts[column.id]}
              flows={filteredFlows[column.id]}
              onCardClick={handleCardClick}
              onDeleteClick={handleDeleteClick}
              onShareClick={handleShareClick}
              isOver={overColumnId === column.id}
            />
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeFlow && <FlowKanbanCardDragging flow={activeFlow} />}
        </DragOverlay>
      </DndContext>

      {/* Модалка создания */}
      {isCreateModalOpen && (
        <FlowWorkspaceModal
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* Модалка редактирования/просмотра */}
      {editingFlow && (
        <FlowWorkspaceModal
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
          flow={editingFlow}
          onClose={() => setEditingFlow(null)}
          onSuccess={() => {
            setEditingFlow(null);
            onRefresh();
          }}
          onGoToFlow={() => handleGoToFlow(editingFlow.id)}
        />
      )}

      {/* Модалка шаринга */}
      {sharingFlow && (
        <FlowShareSimpleModal
          flowId={sharingFlow.id}
          flowName={sharingFlow.name}
          onClose={() => setSharingFlow(null)}
        />
      )}

      {/* Модалка подтверждения удаления */}
      {deletingFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#101010] border border-[#2f2f2f] rounded-[32px] p-8 max-w-md w-full mx-4">
            <h2 className="font-inter font-medium text-[18px] text-white mb-4">
              Удалить флоу?
            </h2>
            <p className="font-inter text-[14px] text-[#959595] mb-6">
              Флоу «{deletingFlow.name}» будет удалён без возможности восстановления.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingFlow(null)}
                className="px-4 h-10 rounded-xl border border-[#2f2f2f] text-white font-inter font-medium text-[14px] hover:bg-[#1a1a1a] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 h-10 rounded-xl bg-red-600 text-white font-inter font-medium text-[14px] hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
