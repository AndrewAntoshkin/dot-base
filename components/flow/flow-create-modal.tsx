'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    members: { email: string; role: 'editor' | 'viewer' }[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function FlowCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: FlowCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<{ email: string; role: 'editor' | 'viewer' }[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMember = useCallback(() => {
    if (!newMemberEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail.trim())) return;
    
    // Check if already added
    if (members.some(m => m.email.toLowerCase() === newMemberEmail.toLowerCase())) return;
    
    setMembers(prev => [...prev, { email: newMemberEmail.trim(), role: 'editor' }]);
    setNewMemberEmail('');
  }, [newMemberEmail, members]);

  const handleRemoveMember = useCallback((email: string) => {
    setMembers(prev => prev.filter(m => m.email !== email));
  }, []);

  const handleSubmit = useCallback(async () => {
    await onSubmit({
      name: name.trim() || 'Без названия',
      description: description.trim(),
      members,
    });
  }, [name, description, members, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddMember();
    }
  }, [handleAddMember]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-start gap-2">
        {/* Main content */}
        <div className="bg-[#101010] rounded-[32px] p-8 w-[660px] max-w-[90vw] flex flex-col gap-5">
          {/* Header */}
          <h2 className="text-lg font-medium text-white">
            Новый флоу
          </h2>

          {/* Form */}
          <div className="flex flex-col gap-5">
            {/* Name field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                Название
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Придумайте название"
                className={cn(
                  "w-full px-3 py-2 rounded-lg",
                  "bg-[#101010] border border-[#2F2F2F]",
                  "text-sm text-white placeholder:text-[#959595]",
                  "focus:outline-none focus:border-white/30",
                  "transition-colors"
                )}
                autoFocus
              />
            </div>

            {/* Description field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Напишите описание проекта"
                rows={4}
                className={cn(
                  "w-full px-3 py-2 rounded-2xl resize-none",
                  "bg-[#101010] border border-[#2F2F2F]",
                  "text-sm text-white placeholder:text-[#959595]",
                  "focus:outline-none focus:border-white/30",
                  "transition-colors"
                )}
              />
            </div>

            {/* Members field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595]">
                Участники
              </label>
              
              {/* Added members */}
              {members.map((member) => (
                <div
                  key={member.email}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-2xl",
                    "bg-[#101010] border border-[#2F2F2F]"
                  )}
                >
                  <span className="text-sm text-white">{member.email}</span>
                  <button
                    onClick={() => handleRemoveMember(member.email)}
                    className="p-1 text-[#959595] hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add member input */}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Email участника"
                  className={cn(
                    "flex-1 px-3 py-2 rounded-2xl",
                    "bg-[#101010] border border-[#2F2F2F]",
                    "text-sm text-white placeholder:text-[#959595]",
                    "focus:outline-none focus:border-white/30",
                    "transition-colors"
                  )}
                />
              </div>

              {/* Add more button */}
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!newMemberEmail.trim()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                  "border border-[#2F2F2F] text-white text-sm font-medium",
                  "hover:bg-white/5 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4" />
                Добавить ещё
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                "px-4 py-2.5 rounded-xl",
                "border border-[#2F2F2F] text-white text-sm font-medium",
                "hover:bg-white/5 transition-colors",
                "disabled:opacity-50"
              )}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className={cn(
                "px-4 py-2.5 rounded-xl",
                "bg-white text-black text-sm font-medium",
                "hover:bg-white/90 transition-colors",
                "disabled:opacity-50",
                "flex items-center gap-2"
              )}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              )}
              Создать
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "w-8 h-8 rounded-full bg-white flex items-center justify-center",
            "hover:bg-white/90 transition-colors",
            "mt-3"
          )}
        >
          <X className="w-4 h-4 text-black" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
