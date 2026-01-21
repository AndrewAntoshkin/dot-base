'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import Link from 'next/link';

interface InviteInfo {
  email: string;
  role: string;
  expires_at: string;
  flow: {
    id: string;
    name: string;
  };
}

export default function FlowInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/flow/invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Приглашение не найдено');
          return;
        }

        setInvite(data.invite);
      } catch (err) {
        setError('Ошибка загрузки приглашения');
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/flow/invite/${token}`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Не удалось принять приглашение');
        return;
      }

      setSuccess(true);
      // Redirect to flow after 2 seconds
      setTimeout(() => {
        router.push(`/flow?id=${data.flowId}`);
      }, 2000);
    } catch (err) {
      setError('Ошибка при принятии приглашения');
    } finally {
      setAccepting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    editor: 'Редактор',
    viewer: 'Просмотр',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <span className="text-sm text-[#6D6D6D]">Загрузка приглашения...</span>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="bg-[#171717] rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Ошибка</h1>
          <p className="text-[#959595] mb-6">{error}</p>
          <Link
            href="/flow"
            className="inline-block px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors"
          >
            Перейти к Flow
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="bg-[#171717] rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Приглашение принято!</h1>
          <p className="text-[#959595] mb-2">
            Вы присоединились к &quot;{invite?.flow.name}&quot;
          </p>
          <p className="text-sm text-[#656565]">
            Перенаправление...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="bg-[#171717] rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#212121] mx-auto mb-6">
          <Users className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-xl font-semibold text-white text-center mb-2">
          Приглашение в Flow
        </h1>
        
        <p className="text-[#959595] text-center mb-6">
          Вас приглашают присоединиться к совместной работе
        </p>

        <div className="bg-[#212121] rounded-xl p-4 mb-6">
          <div className="mb-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565]">
              Flow
            </span>
            <p className="text-white font-medium">{invite?.flow.name}</p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#656565]">
              Роль
            </span>
            <p className="text-white">
              {roleLabels[invite?.role || 'viewer']}
              {invite?.role === 'editor' && (
                <span className="text-[#959595] text-sm ml-2">
                  (можете редактировать)
                </span>
              )}
              {invite?.role === 'viewer' && (
                <span className="text-[#959595] text-sm ml-2">
                  (только просмотр)
                </span>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/flow"
            className="flex-1 px-4 py-3 bg-[#212121] text-white rounded-xl font-medium text-center hover:bg-[#2a2a2a] transition-colors"
          >
            Отклонить
          </Link>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Принятие...
              </>
            ) : (
              'Принять'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
