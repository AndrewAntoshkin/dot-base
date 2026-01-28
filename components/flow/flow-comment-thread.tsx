'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FlowCommentWithUser } from '@/lib/flow/types';
import { useCommentsStore } from '@/lib/flow/comments-store';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import { X, Check, Send, Trash2 } from 'lucide-react';

interface FlowCommentThreadProps {
  flowId: string;
  nodeId?: string;
  position?: { x: number; y: number };
  nodeRef?: React.RefObject<HTMLDivElement>; // Ref на ноду для динамического позиционирования
  onClose: () => void;
}

// Получить инициалы из email
function getInitials(email: string): string {
  const name = email.split('@')[0];
  return name.slice(0, 2).toUpperCase();
}

// Получить цвет аватара
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

// Компонент аватара пользователя
function UserAvatar({ 
  email, 
  avatarUrl, 
  size = 'md' 
}: { 
  email?: string; 
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  
  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt="" 
        className={cn(sizeClass, "rounded-md flex-shrink-0 object-cover")}
      />
    );
  }
  
  return (
    <div
      className={cn(sizeClass, "rounded-md flex-shrink-0 flex items-center justify-center font-medium text-white")}
      style={{ backgroundColor: email ? getAvatarColor(email) : '#3498DB' }}
    >
      {email ? getInitials(email) : '?'}
    </div>
  );
}

// Компонент аватара текущего пользователя
function CurrentUserAvatar() {
  const { email, avatarUrl } = useUser();
  
  return <UserAvatar email={email || undefined} avatarUrl={avatarUrl} />;
}

// Форматирование времени
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString('ru-RU');
}

function FlowCommentThreadComponent({
  flowId,
  nodeId,
  position,
  nodeRef,
  onClose,
}: FlowCommentThreadProps) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threadPosition, setThreadPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { 
    comments, 
    addComment, 
    updateComment,
    deleteComment,
    currentUserId,
  } = useCommentsStore();
  
  // Фильтруем комментарии для этой ноды/позиции
  const threadComments = comments.filter(c => {
    if (nodeId) return c.node_id === nodeId;
    if (position) return !c.node_id && c.position_x === position.x && c.position_y === position.y;
    return false;
  });
  
  // Только корневые комментарии (без parent_id)
  const rootComments = threadComments.filter(c => !c.parent_id);
  
  // Получаем ответы для комментария
  const getReplies = (parentId: string) => 
    threadComments.filter(c => c.parent_id === parentId);
  
  // Автофокус на input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Динамическое обновление позиции при движении канваса
  useEffect(() => {
    if (!nodeRef?.current) return;
    
    const updatePosition = () => {
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect();
        setThreadPosition({
          top: rect.top,
          left: rect.left + rect.width + 12,
        });
      }
    };
    
    // Начальная позиция
    updatePosition();
    
    // Обновляем позицию при любых изменениях (scroll, transform и т.д.)
    let animationFrameId: number;
    const animate = () => {
      updatePosition();
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodeRef]);
  
  // Закрытие по клику вне (без блокировки канваса)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Используем capture phase чтобы поймать клик до React Flow
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [onClose]);
  
  
  // Отметить все как прочитанные
  useEffect(() => {
    if (currentUserId) {
      threadComments.forEach(c => {
        if (!c.read_by?.includes(currentUserId)) {
          updateComment(flowId, c.id, { markAsRead: true });
        }
      });
    }
  }, [threadComments, currentUserId, flowId, updateComment]);
  
  const handleSubmit = useCallback(async () => {
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    await addComment(flowId, {
      content: replyText.trim(),
      nodeId: nodeId,
      positionX: position?.x,
      positionY: position?.y,
    });
    
    setReplyText('');
    setIsSubmitting(false);
  }, [replyText, isSubmitting, flowId, nodeId, position, addComment]);
  
  const handleResolve = useCallback(async (commentId: string, isResolved: boolean) => {
    await updateComment(flowId, commentId, { isResolved: !isResolved });
  }, [flowId, updateComment]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);
  
  // Удаление всех комментариев в thread
  const handleDeleteAll = useCallback(async () => {
    if (!confirm('Удалить все комментарии?')) return;
    
    // Удаляем все комментарии этого thread
    for (const comment of threadComments) {
      await deleteComment(flowId, comment.id);
    }
    onClose();
  }, [threadComments, flowId, deleteComment, onClose]);

  const threadContent = (
    <div
      className={cn(
        "w-[360px] bg-[#1C1C1C] rounded-xl overflow-hidden",
        "shadow-[0px_8px_32px_0px_rgba(0,0,0,0.4),0px_0px_0px_1px_rgba(255,255,255,0.05)]",
        "flex flex-col max-h-[400px]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-white/5">
        <span className="text-sm font-medium text-white">Комментарий</span>
        <div className="flex items-center gap-1">
          {threadComments.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/20 transition-colors"
              title="Удалить все комментарии"
            >
              <Trash2 className="w-4 h-4 text-white/60 hover:text-red-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
      
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {rootComments.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-sm">
            Нет комментариев
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {rootComments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                replies={getReplies(comment.id)}
                onResolve={() => handleResolve(comment.id, comment.is_resolved)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Reply input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-3">
          {/* Current user avatar */}
          <CurrentUserAvatar />
          
          {/* Input */}
          <div className="flex-1 bg-[#101010] rounded-xl p-3">
            <textarea
              ref={inputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать комментарий..."
              className="w-full bg-transparent text-sm text-white resize-none outline-none placeholder:text-white/30"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmit}
                disabled={!replyText.trim() || isSubmitting}
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center",
                  "bg-white text-black",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:bg-white/90 transition-colors"
                )}
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Всегда рендерим через Portal для максимального z-index
  if (typeof document === 'undefined') {
    return null;
  }

  // Не рендерим пока нет позиции
  if (nodeRef && !threadPosition) {
    return null;
  }

  return createPortal(
    <div 
      ref={containerRef}
      className="fixed z-[99999]"
      style={threadPosition ? {
        top: threadPosition.top,
        left: threadPosition.left,
      } : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {threadContent}
    </div>,
    document.body
  );
}

// Отдельный компонент для строки комментария
function CommentRow({
  comment,
  replies,
  onResolve,
}: {
  comment: FlowCommentWithUser;
  replies: FlowCommentWithUser[];
  onResolve: () => void;
}) {
  return (
    <div className="p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <UserAvatar 
          email={comment.user_email} 
          avatarUrl={comment.user_avatar_url} 
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {comment.user_email?.split('@')[0] || 'User'}
            </span>
            <span className="text-xs text-white/40">
              {formatTime(comment.created_at)}
            </span>
            {comment.is_resolved && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Решено
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
        
        {/* Resolve button */}
        {!comment.is_resolved && (
          <button
            onClick={onResolve}
            className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="Отметить как решённое"
          >
            <Check className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>
      
      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 space-y-2 border-l border-white/10 pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <UserAvatar 
                email={reply.user_email} 
                avatarUrl={reply.user_avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white truncate">
                    {reply.user_email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs text-white/40">
                    {formatTime(reply.created_at)}
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5 whitespace-pre-wrap">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const FlowCommentThread = memo(FlowCommentThreadComponent);
