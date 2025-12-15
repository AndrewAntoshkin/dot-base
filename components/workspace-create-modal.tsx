'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

interface WorkspaceCreateModalProps {
  onClose: () => void;
  onSuccess: (workspace: any) => void;
}

export function WorkspaceCreateModal({ onClose, onSuccess }: WorkspaceCreateModalProps) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    setMembers([...members, '']);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Введите название пространства');
      return;
    }

    setIsLoading(true);

    try {
      const validMembers = members.filter(m => m.trim().length > 0);
      
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          members: validMembers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка создания пространства');
      }

      const data = await response.json();
      onSuccess(data.workspace);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#101010] rounded-[32px] p-8 w-full max-w-[660px] mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-black" />
        </button>

        {/* Header */}
        <h2 className="font-inter font-medium text-[18px] text-white mb-5">
          Новое пространство
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Название */}
          <div className="flex flex-col gap-2">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название пространства"
              className="w-full bg-[#101010] border border-[#2f2f2f] rounded-lg px-3 py-2 font-inter text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:border-[#4a4a4a]"
            />
          </div>

          {/* Участники */}
          <div className="flex flex-col gap-2">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
              Участники
            </label>
            
            <div className="flex flex-col gap-2">
              {members.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={member}
                    onChange={(e) => handleMemberChange(index, e.target.value)}
                    placeholder={`Участник ${index + 1}`}
                    className="flex-1 bg-[#101010] border border-[#2f2f2f] rounded-2xl px-3 py-2 font-inter text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:border-[#4a4a4a]"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      className="p-2 rounded-lg border border-[#2f2f2f] hover:bg-[#1f1f1f] transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddMember}
                className="flex items-center justify-center gap-2 border border-[#2f2f2f] rounded-xl px-4 h-10 font-inter font-medium text-[14px] text-white hover:bg-[#1f1f1f] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Добавить ещё
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="font-inter text-[14px] text-red-500">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-[#2f2f2f] font-inter font-medium text-[14px] text-white hover:bg-[#1f1f1f] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-white text-black px-4 h-10 rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
