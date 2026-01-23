'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronDown, Copy, Check } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  email?: string;
  role: string;
  accepted_at: string;
}

interface InviteRow {
  email: string;
  role: 'editor' | 'viewer';
}

interface FlowShareSimpleModalProps {
  flowId: string;
  flowName: string;
  onClose: () => void;
}

export function FlowShareSimpleModal({ flowId, flowName, onClose }: FlowShareSimpleModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('example@email.com');
  const [copied, setCopied] = useState(false);
  
  // Multiple invite rows
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { email: '', role: 'editor' },
  ]);

  const fetchMembers = useCallback(async () => {
    if (!flowId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/flow/${flowId}/members`);
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members || []);
        setIsOwner(data.isOwner);
        if (data.ownerEmail) {
          setOwnerEmail(data.ownerEmail);
        }
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    if (flowId) {
      fetchMembers();
      setInviteRows([{ email: '', role: 'editor' }]);
      setError(null);
    }
  }, [flowId, fetchMembers]);

  const addInviteRow = () => {
    setInviteRows([...inviteRows, { email: '', role: 'viewer' }]);
  };

  const updateInviteRow = (index: number, field: 'email' | 'role', value: string) => {
    const newRows = [...inviteRows];
    if (field === 'role') {
      newRows[index].role = value as 'editor' | 'viewer';
    } else {
      newRows[index].email = value;
    }
    setInviteRows(newRows);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/flow?id=${flowId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteAll = async () => {
    if (!flowId) return;
    
    const validRows = inviteRows.filter(row => row.email.trim());
    if (validRows.length === 0) return;

    setInviting(true);
    setError(null);

    try {
      for (const row of validRows) {
        const response = await fetch(`/api/flow/${flowId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: row.email.trim(), role: row.role }),
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Не удалось отправить приглашение');
          return;
        }
      }

      // Success - close modal
      onClose();
    } catch (err) {
      setError('Ошибка при отправке приглашения');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/70">
      <div className="bg-[#101010] rounded-[32px] w-full max-w-[660px] p-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-stretch justify-between gap-6">
          <div className="flex items-center flex-1">
            <h2 className="text-[14px] font-medium uppercase text-[#959595] leading-[1.43]">
              Совместный доступ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2F2F2F] flex items-center justify-center hover:bg-[#3a3a3a] transition-colors"
          >
            <X className="w-3 h-3 text-[#7E7E7E]" strokeWidth={2.4} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Owner field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.015em] text-[#959595]">
                владелец проекта
              </label>
              <p className="text-[14px] font-medium text-white leading-[1.43]">
                {ownerEmail}
              </p>
            </div>

            {/* Project name field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.015em] text-[#959595]">
                Название проекта
              </label>
              <p className="text-[14px] font-medium text-white leading-[1.43]">
                {flowName || 'Без названия'}
              </p>
            </div>

            {/* Copy link button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-[#2F2F2F] text-[14px] font-medium text-white hover:bg-[#1a1a1a] transition-colors w-fit"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано!' : 'Скопировать ссылку'}
            </button>

            {/* Participants section */}
            {isOwner && (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.015em] text-[#959595]">
                  участники
                </label>
                
                <div className="flex flex-col gap-2">
                  {inviteRows.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      {/* Email input */}
                      <div className="flex-1 h-12 px-3 rounded-2xl bg-[#101010] border border-[#2F2F2F] flex items-center">
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateInviteRow(index, 'email', e.target.value)}
                          placeholder="Email"
                          className="w-full bg-transparent text-[14px] text-white placeholder-white/50 outline-none"
                        />
                      </div>
                      
                      {/* Role selector */}
                      <div className="relative w-40 h-12 rounded-xl bg-[#212121] flex items-center">
                        <select
                          value={row.role}
                          onChange={(e) => updateInviteRow(index, 'role', e.target.value)}
                          className="w-full h-full px-3 pr-8 bg-transparent text-[14px] text-white outline-none appearance-none cursor-pointer"
                        >
                          <option value="editor">Редактирование</option>
                          <option value="viewer">Просмотр</option>
                        </select>
                        <ChevronDown className="absolute right-3 w-4 h-4 text-white pointer-events-none" />
                      </div>
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    onClick={addInviteRow}
                    className="h-10 px-4 rounded-xl border border-[#2F2F2F] text-[14px] font-medium text-white hover:bg-[#1a1a1a] transition-colors w-fit"
                  >
                    Добавить ещё
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-xl border border-[#2F2F2F] text-[14px] font-medium text-white hover:bg-[#1a1a1a] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleInviteAll}
                disabled={inviting || inviteRows.every(r => !r.email.trim())}
                className="h-10 px-4 rounded-xl bg-white text-[14px] font-medium text-black hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Пригласить'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
