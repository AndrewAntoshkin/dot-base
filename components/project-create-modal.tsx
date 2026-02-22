'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import type { UserWorkspace } from '@/contexts/user-context';

interface ProjectCreateModalProps {
  workspaceId?: string;
  workspaces: UserWorkspace[];
  onClose: () => void;
  onSuccess: (project: any) => void;
}

export function ProjectCreateModal({
  workspaceId: initialWorkspaceId,
  workspaces,
  onClose,
  onSuccess,
}: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspaceId || workspaces[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Введите название проекта');
      return;
    }

    if (!selectedWorkspaceId) {
      setError('Выберите пространство');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка создания проекта');
      }

      const data = await response.json();
      onSuccess({
        ...data.project,
        workspace_name: selectedWorkspace?.name || '',
        workspace_slug: selectedWorkspace?.slug || '',
        member_count: 1,
        images_count: 0,
        videos_count: 0,
        flows_count: 0,
        members: [],
      });
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative bg-[#101010] rounded-[32px] p-8 w-full max-w-[520px] mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-black" />
        </button>

        <h2 className="font-inter font-medium text-[18px] text-white mb-5">
          Новый проект
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Workspace selector */}
          {!initialWorkspaceId && workspaces.length > 1 && (
            <div className="flex flex-col gap-2">
              <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
                Пространство
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
                  className="w-full flex items-center justify-between bg-[#101010] border border-[#2f2f2f] rounded-lg px-3 py-2.5 font-inter text-[14px] text-white focus:outline-none focus:border-[#4a4a4a]"
                >
                  <span>{selectedWorkspace?.name || 'Выберите пространство'}</span>
                  <ChevronDown className="w-4 h-4 text-[#959595]" />
                </button>

                {isWsDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsWsDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg z-20 py-1 max-h-[200px] overflow-y-auto">
                      {workspaces.map(ws => (
                        <button
                          type="button"
                          key={ws.id}
                          onClick={() => {
                            setSelectedWorkspaceId(ws.id);
                            setIsWsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-[14px] transition-colors ${
                            selectedWorkspaceId === ws.id
                              ? 'text-white bg-[#252525]'
                              : 'text-[#959595] hover:bg-[#252525] hover:text-white'
                          }`}
                        >
                          {ws.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название проекта"
              autoFocus
              className="w-full bg-[#101010] border border-[#2f2f2f] rounded-lg px-3 py-2 font-inter text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:border-[#4a4a4a]"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание проекта (необязательно)"
              rows={3}
              className="w-full bg-[#101010] border border-[#2f2f2f] rounded-lg px-3 py-2 font-inter text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:border-[#4a4a4a] resize-none"
            />
          </div>

          {error && (
            <p className="font-inter text-[14px] text-red-500">{error}</p>
          )}

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
