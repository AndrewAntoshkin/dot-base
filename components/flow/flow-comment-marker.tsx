'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { FlowCommentWithUser } from '@/lib/flow/types';
import { cn } from '@/lib/utils';
import { MessageCirclePlus } from 'lucide-react';

interface FlowCommentMarkerProps {
  nodeId: string;
  comments: FlowCommentWithUser[];
  currentUserId?: string;
  isHovered: boolean;
  onAddComment: () => void;
  onOpenThread: () => void;
  onMarkerHover?: (isHovered: boolean) => void; // Callback для управления hover ноды
}

// Получить инициалы из email
function getInitials(email: string): string {
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

// Получить цвет аватара на основе email (детерминированный)
function getAvatarColor(email: string): string {
  const colors = [
    '#F5A623', '#9B59B6', '#3498DB', '#1ABC9C',
    '#E74C3C', '#2ECC71', '#E91E63',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function FlowCommentMarkerComponent({
  nodeId,
  comments,
  currentUserId,
  isHovered,
  onAddComment,
  onOpenThread,
  onMarkerHover,
}: FlowCommentMarkerProps) {
  // Фильтруем только корневые комментарии (без parent_id) для этой ноды
  const rootComments = comments.filter(c => c.node_id === nodeId && !c.parent_id);
  
  // Считаем непрочитанные
  const unreadCount = rootComments.filter(c => 
    currentUserId && !c.read_by?.includes(currentUserId)
  ).length;
  
  const hasComments = rootComments.length > 0;
  const hasUnread = unreadCount > 0;
  const shouldShow = hasComments || isHovered;

  if (!shouldShow) {
    return null;
  }

  // Отображаем аватарки комментаторов
  const uniqueUsers = Array.from(
    new Map(rootComments.map(c => [c.user_id, c])).values()
  ).slice(0, 3);

  const extraCount = rootComments.length > 3 ? rootComments.length - 2 : 0;

  // Кнопка добавления комментария (показываем при hover без комментариев)
  if (!hasComments) {
    return (
      <NodeToolbar
        isVisible={true}
        position={Position.Right}
        align="start"
        offset={0}
        className="nodrag nopan"
      >
        {/* Невидимая область для сохранения hover */}
        <div 
          className="flex items-start"
          onMouseEnter={() => onMarkerHover?.(true)}
          onMouseLeave={() => onMarkerHover?.(false)}
          style={{ paddingLeft: '12px' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className={cn(
              "w-8 h-8 rounded-xl",
              "bg-[#1C1C1C] hover:bg-[#2C2C2C]",
              "flex items-center justify-center",
              "shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_3px_8px_0px_rgba(0,0,0,0.1)]",
              "transition-all duration-200"
            )}
            title="Добавить комментарий"
          >
            <MessageCirclePlus className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </NodeToolbar>
    );
  }

  // Маркер с аватарками
  return (
    <NodeToolbar
      isVisible={true}
      position={Position.Right}
      align="start"
      offset={12}
      className="nodrag nopan"
    >
      <button
        className={cn(
          "flex items-center p-1 rounded-xl",
          "bg-[#1C1C1C]",
          "shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_3px_8px_0px_rgba(0,0,0,0.1)]",
          "transition-all duration-200",
          "hover:bg-[#2C2C2C]",
          hasUnread && "ring-1 ring-[#0D99FF]"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onOpenThread();
        }}
        title={`${rootComments.length} комментари${rootComments.length === 1 ? 'й' : rootComments.length < 5 ? 'я' : 'ев'}`}
      >
        <div className="flex items-center -space-x-1">
          {uniqueUsers.map((comment, index) => (
            comment.user_avatar_url ? (
              <img
                key={comment.id}
                src={comment.user_avatar_url}
                alt=""
                className="w-6 h-6 rounded-md object-cover border-2 border-[#1C1C1C]"
                style={{ zIndex: uniqueUsers.length - index }}
              />
            ) : (
              <div
                key={comment.id}
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  "text-[10px] font-medium text-white",
                  "border-2 border-[#1C1C1C]"
                )}
                style={{ 
                  backgroundColor: getAvatarColor(comment.user_email || ''),
                  zIndex: uniqueUsers.length - index,
                }}
              >
                {getInitials(comment.user_email || 'U')}
              </div>
            )
          ))}
          
          {extraCount > 0 && (
            <div
              className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center",
                "text-[10px] font-medium text-white",
                "bg-[#2F2F2F] border-2 border-[#1C1C1C]"
              )}
            >
              +{extraCount}
            </div>
          )}
        </div>
      </button>
    </NodeToolbar>
  );
}

export const FlowCommentMarker = memo(FlowCommentMarkerComponent);
