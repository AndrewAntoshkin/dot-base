'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, Share2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FlowCard } from '@/lib/flow/types';

// Цвета для аватаров (как в Figma - color/primary/500)
const AVATAR_COLORS = [
  '#7357FF', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', 
  '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#06B6D4',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(email: string): string {
  return email.split('@')[0].substring(0, 2).toUpperCase();
}

interface FlowKanbanCardProps {
  flow: FlowCard;
  onClick: () => void;
  onDelete: () => void;
  onShare: () => void;
}

// Карточка флоу (с drag-and-drop)
export const FlowKanbanCard = memo(function FlowKanbanCard({
  flow,
  onClick,
  onDelete,
  onShare,
}: FlowKanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flow.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Показываем до 4 аватаров
  const displayMembers = flow.members.slice(0, 3);
  const remainingCount = flow.members.length - 3;

  // Обработка клика - только если не было перетаскивания
  const handleClick = (e: React.MouseEvent) => {
    // Не открываем если был drag
    if (isDragging) return;
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="bg-[#1C1C1C] rounded-[20px] py-4 px-5 hover:bg-[#222222] transition-colors touch-none"
    >
      {/* Контент - как в Figma */}
      <div className="flex flex-col gap-4">
        {/* Название + описание */}
        <div className="flex flex-col gap-1">
          <h3 className="font-inter font-medium text-[16px] text-white tracking-[-0.01em] leading-[1.5] line-clamp-1">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="font-inter font-normal text-[12px] text-[#8C8C8C] leading-[1.33] line-clamp-3">
              {flow.description}
            </p>
          )}
        </div>

        {/* Footer: аватары + действия */}
        <div className="flex items-center justify-between gap-4">
          {/* Avatar group - как в Figma */}
          <div className="flex items-center -space-x-[6px]">
            {displayMembers.length > 0 ? (
              displayMembers.map((member, idx) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C]"
                  style={{ backgroundColor: getAvatarColor(idx) }}
                  title={member.email}
                >
                  <span className="font-['General_Sans'] font-semibold text-[12px] text-white leading-[1.33]">
                    {getInitials(member.email)}
                  </span>
                </div>
              ))
            ) : flow.owner_email ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C]"
                style={{ backgroundColor: AVATAR_COLORS[0] }}
                title={flow.owner_email}
              >
                <span className="font-['General_Sans'] font-semibold text-[12px] text-white leading-[1.33]">
                  {getInitials(flow.owner_email)}
                </span>
              </div>
            ) : null}

            {/* +N остальных - как в Figma */}
            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C] bg-[#2F2F2F]">
                <span className="font-['General_Sans'] font-semibold text-[12px] text-[#DFDFDF] leading-[1.33]">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="flex items-center" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors relative"
            >
              <MoreHorizontal className="w-4 h-4 text-[#717171]" />
              
              {/* Dropdown меню */}
              {menuOpen && (
                <div className="absolute right-0 bottom-full mb-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onShare();
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-white hover:bg-[#252525] flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Поделиться
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-[#252525] flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Версия для DragOverlay
export const FlowKanbanCardDragging = memo(function FlowKanbanCardDragging({
  flow,
}: {
  flow: FlowCard;
}) {
  const displayMembers = flow.members.slice(0, 3);
  const remainingCount = flow.members.length - 3;

  return (
    <div className="bg-[#1C1C1C] rounded-[20px] p-4 px-5 shadow-2xl border border-[#353535] w-full max-w-[300px] opacity-90">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-inter font-medium text-[16px] text-white tracking-[-0.01em] line-clamp-1">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="font-inter text-[12px] text-[#8C8C8C] leading-[1.33] line-clamp-2">
              {flow.description}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <div className="flex items-center -space-x-[6px]">
            {displayMembers.length > 0 ? (
              displayMembers.map((member, idx) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C]"
                  style={{ backgroundColor: getAvatarColor(idx) }}
                >
                  <span className="font-semibold text-[12px] text-white">
                    {getInitials(member.email)}
                  </span>
                </div>
              ))
            ) : flow.owner_email ? (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C]"
                style={{ backgroundColor: AVATAR_COLORS[0] }}
              >
                <span className="font-semibold text-[12px] text-white">
                  {getInitials(flow.owner_email)}
                </span>
              </div>
            ) : null}

            {remainingCount > 0 && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#1C1C1C] bg-[#2F2F2F]">
                <span className="font-semibold text-[12px] text-[#DFDFDF]">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
