'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Users, Copy, Check, Trash2, Mail, UserPlus } from 'lucide-react';
import { useFlowStore } from '@/lib/flow/store';

interface Member {
  id: string;
  user_id: string;
  role: string;
  accepted_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

interface FlowShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlowShareModal({ isOpen, onClose }: FlowShareModalProps) {
  const { flowId, flowName } = useFlowStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!flowId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/flow/${flowId}/members`);
      const data = await response.json();

      if (response.ok) {
        setMembers(data.members || []);
        setInvites(data.invites || []);
        setIsOwner(data.isOwner);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    if (isOpen && flowId) {
      fetchMembers();
    }
  }, [isOpen, flowId, fetchMembers]);

  const handleInvite = async () => {
    if (!email.trim() || !flowId) return;

    setInviting(true);
    setError(null);

    try {
      const response = await fetch(`/api/flow/${flowId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Не удалось отправить приглашение');
        return;
      }

      setInviteUrl(data.inviteUrl);
      setEmail('');
      fetchMembers();
    } catch (err) {
      setError('Ошибка при отправке приглашения');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!flowId) return;
    if (!confirm('Удалить участника из Flow?')) return;

    try {
      await fetch(`/api/flow/${flowId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });
      fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!flowId) return;

    try {
      await fetch(`/api/flow/${flowId}/members?inviteId=${inviteId}`, {
        method: 'DELETE',
      });
      fetchMembers();
    } catch (err) {
      console.error('Error canceling invite:', err);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: 'Владелец',
    editor: 'Редактор',
    viewer: 'Просмотр',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#171717] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2F2F2F]">
          <h2 className="text-lg font-semibold text-white">Совместный доступ</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#212121] transition-colors"
          >
            <X className="w-5 h-5 text-[#959595]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!flowId ? (
            <div className="text-center py-8">
              <p className="text-[#959595]">
                Сначала сохраните Flow, чтобы пригласить участников
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : (
            <>
              {/* Flow name */}
              <div className="mb-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565]">
                  Flow
                </span>
                <p className="text-white font-medium">{flowName}</p>
              </div>

              {/* Invite form (only for owner) */}
              {isOwner && (
                <div className="mb-6">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email пользователя"
                      className="flex-1 h-10 px-3 rounded-lg bg-[#212121] text-white text-sm outline-none border border-transparent focus:border-white/20"
                    />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                      className="h-10 px-3 rounded-lg bg-[#212121] text-white text-sm outline-none border border-transparent focus:border-white/20"
                    >
                      <option value="viewer">Просмотр</option>
                      <option value="editor">Редактор</option>
                    </select>
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !email.trim()}
                    className="w-full h-10 px-4 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Пригласить
                      </>
                    )}
                  </button>

                  {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                  )}

                  {/* Show invite link if just created */}
                  {inviteUrl && (
                    <div className="mt-3 p-3 bg-[#212121] rounded-lg">
                      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565] mb-2">
                        Ссылка для приглашения
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inviteUrl}
                          readOnly
                          className="flex-1 h-8 px-2 rounded bg-[#171717] text-white text-xs outline-none"
                        />
                        <button
                          onClick={() => copyToClipboard(inviteUrl, 'invite')}
                          className="px-3 h-8 rounded bg-[#171717] hover:bg-[#2a2a2a] transition-colors"
                        >
                          {copiedLink === 'invite' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members list */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565] mb-2">
                  Участники ({members.length + 1})
                </p>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Owner (always shown) */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#212121]">
                    <div>
                      <span className="text-sm text-white">Вы</span>
                      <span className="text-xs text-[#656565] ml-2">(владелец)</span>
                    </div>
                  </div>

                  {/* Other members */}
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#212121]"
                    >
                      <div>
                        <span className="text-sm text-white">
                          {member.user_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-[#656565] ml-2">
                          ({roleLabels[member.role]})
                        </span>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending invites */}
              {isOwner && invites.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565] mb-2">
                    Ожидают принятия ({invites.length})
                  </p>
                  
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#212121] border border-dashed border-[#333]"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#656565]" />
                          <div>
                            <span className="text-sm text-white">{invite.email}</span>
                            <span className="text-xs text-[#656565] ml-2">
                              ({roleLabels[invite.role]})
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="p-1 rounded hover:bg-[#2a2a2a] transition-colors"
                          title="Отменить приглашение"
                        >
                          <X className="w-4 h-4 text-[#959595]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
