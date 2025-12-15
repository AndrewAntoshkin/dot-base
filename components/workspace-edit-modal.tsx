'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';

interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
}

interface OtherWorkspace {
  id: string;
  name: string;
}

interface MigrationDialog {
  userId: string;
  userName: string;
  otherWorkspaces: OtherWorkspace[];
}

interface WorkspaceEditModalProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  onClose: () => void;
  onSuccess: (updatedWorkspace: any) => void;
}

export function WorkspaceEditModal({ workspace, onClose, onSuccess }: WorkspaceEditModalProps) {
  const [name, setName] = useState(workspace.name);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [migrationDialog, setMigrationDialog] = useState<MigrationDialog | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  // Загрузка участников
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Fetch members error:', error);
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Введите название');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess({ ...workspace, name: name.trim() });
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка сохранения');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Введите корректный email');
      return;
    }

    setAddingMember(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), role: 'member' }),
      });

      if (response.ok) {
        setNewEmail('');
        fetchMembers(); // Перезагружаем список
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка добавления');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string, migrateToWorkspaceId?: string | null) => {
    const member = members.find(m => m.user_id === userId);
    if (!member) return;

    // Если нет диалога и не задан параметр миграции — сначала проверяем другие пространства пользователя
    if (migrateToWorkspaceId === undefined && !migrationDialog) {
      setRemovingMember(userId);
      try {
        // Получаем другие пространства пользователя
        const response = await fetch(`/api/users/${userId}/workspaces`);
        if (response.ok) {
          const data = await response.json();
          const otherWorkspaces = data.workspaces?.filter((ws: any) => ws.id !== workspace.id) || [];
          
          if (otherWorkspaces.length > 0) {
            // Показываем диалог выбора
            setMigrationDialog({
              userId,
              userName: member.name || member.email,
              otherWorkspaces,
            });
            setRemovingMember(null);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking workspaces:', error);
      }
      setRemovingMember(null);
      
      // Если нет других пространств — просто подтверждаем удаление
      if (!confirm(`Удалить ${member.name || member.email} из пространства?\n\nГенерации пользователя останутся без пространства.`)) {
        return;
      }
    }

    setRemovingMember(userId);
    setError(null);

    try {
      let url = `/api/workspaces/${workspace.id}/members?userId=${userId}`;
      // Добавляем параметр миграции только если указан конкретный workspace
      if (migrateToWorkspaceId && migrateToWorkspaceId !== '') {
        url += `&migrateToWorkspaceId=${migrateToWorkspaceId}`;
      }
      
      const response = await fetch(url, { method: 'DELETE' });

      if (response.ok) {
        const data = await response.json();
        setMembers(prev => prev.filter(m => m.user_id !== userId));
        setMigrationDialog(null);
        
        if (data.generationsMigratedTo) {
          console.log(`Generations migrated to workspace ${data.generationsMigratedTo}`);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка удаления');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setRemovingMember(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2e2e2e]">
          <h2 className="font-inter font-semibold text-[18px] text-white">
            Редактировать пространство
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="h-5 w-5 text-[#8c8c8c]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Название */}
          <div>
            <label className="block font-inter text-[13px] text-[#8c8c8c] mb-2">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 bg-[#252525] border border-[#3a3a3a] rounded-xl font-inter text-[14px] text-white placeholder-[#6d6d6d] focus:outline-none focus:border-[#4a4a4a]"
              placeholder="Название пространства"
            />
          </div>

          {/* Участники */}
          <div>
            <label className="block font-inter text-[13px] text-[#8c8c8c] mb-2">
              Участники ({members.length})
            </label>
            
            {/* Добавить участника */}
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                className="flex-1 h-10 px-3 bg-[#252525] border border-[#3a3a3a] rounded-xl font-inter text-[13px] text-white placeholder-[#6d6d6d] focus:outline-none focus:border-[#4a4a4a]"
                placeholder="Email нового участника"
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className="h-10 px-3 bg-white text-black rounded-xl font-inter font-medium text-[13px] hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            {/* Список участников */}
            {isMembersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#6d6d6d]" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-2 bg-[#252525] rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#6366F1] flex items-center justify-center shrink-0">
                        <span className="font-inter font-semibold text-[10px] text-white">
                          {member.name?.substring(0, 2).toUpperCase() || '??'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-inter text-[13px] text-white truncate">
                          {member.name || member.email}
                        </p>
                        <p className="font-inter text-[11px] text-[#6d6d6d]">
                          {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Админ' : 'Участник'}
                        </p>
                      </div>
                    </div>
                    
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={removingMember === member.user_id}
                        className="p-1.5 rounded hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
                      >
                        {removingMember === member.user_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6d6d6d]" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-[#6d6d6d]" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <p className="font-inter text-[13px] text-red-400">{error}</p>
          )}
        </div>

        {/* Диалог миграции генераций */}
        {migrationDialog && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-[#252525] rounded-xl p-5 max-w-sm w-full">
              <h3 className="font-inter font-semibold text-[15px] text-white mb-2">
                Перенести генерации?
              </h3>
              <p className="font-inter text-[13px] text-[#8c8c8c] mb-4">
                {migrationDialog.userName} состоит в других пространствах. 
                Куда перенести генерации?
              </p>
              
              <div className="space-y-2 mb-4">
                {migrationDialog.otherWorkspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleRemoveMember(migrationDialog.userId, ws.id)}
                    disabled={!!removingMember}
                    className="w-full flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                  >
                    <span className="font-inter text-[13px] text-white">{ws.name}</span>
                    <ArrowRight className="h-4 w-4 text-[#6d6d6d]" />
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setMigrationDialog(null)}
                  className="flex-1 h-9 font-inter text-[13px] text-[#8c8c8c] hover:text-white transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleRemoveMember(migrationDialog.userId, null)}
                  disabled={!!removingMember}
                  className="flex-1 h-9 bg-red-500/20 text-red-400 rounded-lg font-inter text-[13px] hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {removingMember ? 'Удаление...' : 'Удалить без переноса'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-[#2e2e2e]">
          <button
            onClick={onClose}
            className="h-10 px-4 font-inter font-medium text-[14px] text-[#8c8c8c] hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="h-10 px-5 bg-white text-black rounded-xl font-inter font-medium text-[14px] hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
