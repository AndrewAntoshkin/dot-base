'use client';

import { useState, useCallback, memo } from 'react';
import { X, Plus } from 'lucide-react';
import type { FlowCard } from '@/lib/flow/types';

// Цвета для аватаров
const AVATAR_COLORS = [
  '#7357FF', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', 
  '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#06B6D4',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  if (name.length <= 2) return name.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getDisplayName(email: string): string {
  const [localPart] = email.split('@');
  // Преобразуем "evgeniya.g" в "Evgeniya G."
  const parts = localPart.split(/[._-]/);
  return parts
    .map((part, i) => {
      if (i === parts.length - 1 && part.length === 1) {
        return part.toUpperCase() + '.';
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

interface WorkspaceMember {
  id: string;
  email: string;
  name?: string;
}

interface FlowWorkspaceModalProps {
  workspaceId: string;
  workspaceMembers: WorkspaceMember[];
  flow?: FlowCard | null;
  onClose: () => void;
  onSuccess: () => void;
  onGoToFlow?: () => void;
}

// Компонент участника
const MemberChip = memo(function MemberChip({
  member,
  index,
  onRemove,
}: {
  member: WorkspaceMember;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: getAvatarColor(index) }}
        >
          <span className="font-semibold text-[12px] text-white">
            {getInitials(member.email)}
          </span>
        </div>
        <span className="font-inter font-medium text-[14px] text-white truncate">
          {member.name || getDisplayName(member.email)}
        </span>
      </div>
      <button
        onClick={onRemove}
        className="p-2 rounded-[10px] border border-[#2f2f2f] hover:bg-[#1a1a1a] transition-colors"
      >
        <X className="w-4 h-4 text-[#717171]" />
      </button>
    </div>
  );
});

export function FlowWorkspaceModal({
  workspaceId,
  workspaceMembers,
  flow,
  onClose,
  onSuccess,
  onGoToFlow,
}: FlowWorkspaceModalProps) {
  const isEdit = !!flow;
  
  const [name, setName] = useState(flow?.name || '');
  const [description, setDescription] = useState(flow?.description || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    flow?.members.map(m => m.id) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const selectedMembers = workspaceMembers.filter(m => 
    selectedMemberIds.includes(m.id)
  );
  
  const availableMembers = workspaceMembers.filter(m => 
    !selectedMemberIds.includes(m.id)
  );

  const handleAddMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => [...prev, memberId]);
    setShowMemberPicker(false);
  }, []);

  const handleRemoveMember = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => prev.filter(id => id !== memberId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (isEdit && flow) {
        // Обновление флоу
        const response = await fetch(`/api/flow/${flow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update flow');
        }
      } else {
        // Создание нового флоу
        const response = await fetch(`/api/workspaces/${workspaceId}/flows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            memberIds: selectedMemberIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create flow');
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Flow submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, selectedMemberIds, isEdit, flow, workspaceId, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative">
        {/* Модалка */}
        <div className="bg-[#101010] rounded-[32px] p-8 w-[660px] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 gap-6">
            <h2 className="font-inter font-medium text-[18px] text-white flex-1">
              {isEdit ? flow.name : 'Новый флоу'}
            </h2>
            
            {isEdit && onGoToFlow && (
              <button
                onClick={onGoToFlow}
                className="px-4 h-10 rounded-xl border border-[#2f2f2f] text-white font-inter font-medium text-[14px] hover:bg-[#1a1a1a] transition-colors"
              >
                Перейти во флоу
              </button>
            )}
          </div>

          {/* Форма */}
          <div className="flex flex-col gap-5">
            {/* Название */}
            <div className="flex flex-col gap-2">
              <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.015em]">
                Название
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название флоу"
                className="w-full h-10 px-3 bg-[#101010] border border-[#2f2f2f] rounded-lg text-white font-inter text-[14px] placeholder:text-[#717171] outline-none focus:border-[#454545] transition-colors"
              />
            </div>

            {/* Описание */}
            <div className="flex flex-col gap-2">
              <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.015em]">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание флоу..."
                rows={4}
                className="w-full px-3 py-2 bg-[#101010] border border-[#2f2f2f] rounded-2xl text-white font-inter text-[14px] placeholder:text-[#717171] outline-none focus:border-[#454545] transition-colors resize-none"
              />
            </div>

            {/* Участники */}
            <div className="flex flex-col gap-2">
              <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.015em]">
                Участники
              </label>
              
              <div className="flex flex-col">
                {selectedMembers.map((member, index) => (
                  <MemberChip
                    key={member.id}
                    member={member}
                    index={index}
                    onRemove={() => handleRemoveMember(member.id)}
                  />
                ))}
              </div>

              {/* Добавить ещё / Member picker */}
              <div className="relative">
                <button
                  onClick={() => setShowMemberPicker(!showMemberPicker)}
                  disabled={availableMembers.length === 0}
                  className="px-4 h-10 rounded-xl border border-[#2f2f2f] text-white font-inter font-medium text-[14px] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить ещё
                </button>

                {/* Dropdown */}
                {showMemberPicker && availableMembers.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl shadow-lg z-10 py-2 min-w-[260px] max-h-[200px] overflow-y-auto">
                    {availableMembers.map((member, index) => (
                      <button
                        key={member.id}
                        onClick={() => handleAddMember(member.id)}
                        className="w-full text-left px-3 py-2 hover:bg-[#252525] flex items-center gap-3"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: getAvatarColor(index) }}
                        >
                          <span className="font-semibold text-[12px] text-white">
                            {getInitials(member.email)}
                          </span>
                        </div>
                        <span className="font-inter text-[14px] text-white truncate">
                          {member.name || member.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-4">
            <button
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-[#2f2f2f] text-white font-inter font-medium text-[14px] hover:bg-[#1a1a1a] transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="px-4 h-10 rounded-xl bg-white text-black font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Кнопка закрытия справа от модалки */}
        <button
          onClick={onClose}
          className="absolute -right-10 top-3 w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}
