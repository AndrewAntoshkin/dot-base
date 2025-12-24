'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocsShell, DocsBreadcrumb, DocsTitle, DocsSection, DocsFooter } from '@/components/docs/docs-shell';
import { ArrowUp, ArrowRight, X } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  description: string | null;
  votes_count: number;
  created_at: string;
}

// Modal for creating a new idea
function CreateIdeaModal({ 
  isOpen, 
  onClose, 
  onCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Введите название идеи');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create idea');
      }

      setTitle('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err) {
      setError('Не удалось создать идею. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-start gap-2">
        <div className="w-[660px] bg-[#101010] rounded-[32px] p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="text-start">
            <h2 className="text-lg font-medium text-white font-inter">Новая идея</h2>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5">
            {/* Title field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium text-[#959595] uppercase tracking-[0.015em] font-inter">
                Название
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название идеи"
                className="w-full px-3 py-2 bg-[#101010] border border-[#2f2f2f] rounded-2xl text-sm text-white placeholder:text-[#959595] font-inter outline-none focus:border-[#4a4a4a] transition-colors"
              />
            </div>

            {/* Description field */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-medium text-[#959595] uppercase tracking-[0.015em] font-inter">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите вашу идею подробнее..."
                rows={5}
                className="w-full px-3 py-2 bg-[#101010] border border-[#2f2f2f] rounded-2xl text-sm text-white placeholder:text-[#959595] font-inter outline-none focus:border-[#4a4a4a] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 font-inter">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 h-10 border border-[#2f2f2f] rounded-xl text-sm font-medium text-white font-inter hover:bg-[#1a1a1a] transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 h-10 bg-white rounded-xl text-sm font-medium text-black font-inter hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}

// Modal for viewing an idea
function ViewIdeaModal({ 
  idea, 
  isOpen, 
  onClose,
  hasVoted,
  onVote
}: { 
  idea: Idea | null; 
  isOpen: boolean; 
  onClose: () => void;
  hasVoted: boolean;
  onVote: () => void;
}) {
  if (!isOpen || !idea) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex items-start gap-2">
        <div className="w-[660px] bg-[#101010] rounded-[32px] p-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-white font-inter">{idea.title}</h2>
            <span className="text-xs text-[#959595] font-inter">{formatDate(idea.created_at)}</span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-medium text-[#959595] uppercase tracking-[0.015em] font-inter">
              Описание
            </label>
            <div className="w-full px-3 py-2 bg-[#101010] border border-[#2f2f2f] rounded-2xl min-h-[120px]">
              <p className="text-sm text-white font-inter whitespace-pre-wrap">
                {idea.description || 'Описание отсутствует'}
              </p>
            </div>
          </div>

          {/* Vote section */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onVote}
              className={`flex items-center gap-2 px-4 h-10 border rounded-xl text-sm font-medium font-inter transition-colors ${
                hasVoted 
                  ? 'border-white bg-white/10 text-white' 
                  : 'border-[#2f2f2f] text-white hover:border-white/50'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              <span>{idea.votes_count}</span>
            </button>
            <span className="text-sm text-white font-inter">
              Если вам понравилась идея, можете за нее проголосовать
            </span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}

// Idea card component
function IdeaCard({ 
  idea, 
  hasVoted,
  onClick,
  onVote
}: { 
  idea: Idea; 
  hasVoted: boolean;
  onClick: () => void;
  onVote: (e: React.MouseEvent) => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '/');
  };

  return (
    <div 
      className="flex flex-col justify-between p-4 border border-[#252525] rounded-xl h-[120px] cursor-pointer hover:border-[#3a3a3a] transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm text-white font-inter line-clamp-2">{idea.title}</h3>
        {idea.created_at && (
          <span className="text-xs text-[#959595] font-inter">{formatDate(idea.created_at)}</span>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <button
          onClick={onVote}
          className={`flex items-center gap-1 px-1.5 py-0.5 border rounded-md text-xs font-inter transition-colors ${
            hasVoted 
              ? 'border-white/50 text-white bg-white/10' 
              : 'border-[#252525] text-white hover:border-white/30'
          }`}
        >
          <ArrowUp className="w-3 h-3" />
          <span>{idea.votes_count}</span>
        </button>
        <ArrowRight className="w-4 h-4 text-white opacity-50" />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchIdeas = useCallback(async () => {
    try {
      const response = await fetch('/api/ideas');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas || []);
        setUserVotes(data.userVotes || []);
      }
      // If response is not OK (e.g., table doesn't exist), just show empty state
    } catch (error) {
      console.error('Error fetching ideas:', error);
      // Silently fail - show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleVote = async (ideaId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    try {
      const response = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update ideas list
        setIdeas(prev => prev.map(idea => 
          idea.id === ideaId 
            ? { ...idea, votes_count: data.votesCount }
            : idea
        ));

        // Update user votes
        if (data.voted) {
          setUserVotes(prev => [...prev, ideaId]);
        } else {
          setUserVotes(prev => prev.filter(id => id !== ideaId));
        }

        // Update selected idea if viewing
        if (selectedIdea?.id === ideaId) {
          setSelectedIdea(prev => prev ? { ...prev, votes_count: data.votesCount } : null);
        }
      } else {
        const errorData = await response.json();
        console.error('Vote error:', errorData);
        // If unauthorized, maybe user is not logged in
        if (response.status === 401) {
          alert('Для голосования необходимо авторизоваться');
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const openViewModal = (idea: Idea) => {
    setSelectedIdea(idea);
    setIsViewModalOpen(true);
  };

  return (
    <DocsShell>
      <DocsBreadcrumb items={[
        { label: 'Документация', href: '/docs' },
        { label: 'Roadmap' },
      ]} />
      
      <DocsTitle description="Мы постоянно в поиске прорывных идей. Здесь вы можете увидеть наши планы и предложить свои идеи.">
        Roadmap
      </DocsTitle>

      {/* Ближайшие шаги */}
      <DocsSection title="Ближайшие шаги">
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          Мы активно работаем над улучшением платформы. В ближайшее время планируем добавить новые модели, 
          улучшить интерфейс и расширить возможности генерации. Следите за обновлениями!
        </p>
      </DocsSection>

      {/* Запланировано */}
      <DocsSection title="Запланировано">
        <p className="text-sm text-[#959595] font-inter leading-relaxed mb-4">
          Функции и улучшения, над которыми мы работаем:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border-b border-[#4e4e4e]">
            <p className="text-sm text-[#959595] font-inter">Идея 1</p>
            <p className="text-sm text-white font-medium font-inter mt-1">AI Studio</p>
          </div>
          <div className="p-4 border-b border-[#4e4e4e]">
            <p className="text-sm text-[#959595] font-inter">Идея 2</p>
            <p className="text-sm text-white font-medium font-inter mt-1">Работа с камерами</p>
          </div>
        </div>
      </DocsSection>

      {/* Предложите свою идею */}
      <div className="flex items-center gap-3 p-4 bg-[#212121] rounded-2xl mb-8">
        <p className="flex-1 text-sm text-white font-inter font-medium">
          Если вам чего-то не хватает или есть предложение по улучшению – пишите
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-[#303030] hover:bg-[#404040] rounded-xl text-sm text-white font-inter font-bold transition-colors"
        >
          Предложить
        </button>
      </div>

      {/* Идеи */}
      <DocsSection title="Идеи">
        {isLoading ? (
          <div className="text-sm text-[#959595] font-inter">Загрузка...</div>
        ) : ideas.length === 0 ? (
          <div className="text-sm text-[#959595] font-inter">
            Пока нет идей. Будьте первым, кто предложит!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                hasVoted={userVotes.includes(idea.id)}
                onClick={() => openViewModal(idea)}
                onVote={(e) => handleVote(idea.id, e)}
              />
            ))}
          </div>
        )}
      </DocsSection>

      <DocsFooter />

      {/* Modals */}
      <CreateIdeaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchIdeas}
      />

      <ViewIdeaModal
        idea={selectedIdea}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        hasVoted={selectedIdea ? userVotes.includes(selectedIdea.id) : false}
        onVote={() => selectedIdea && handleVote(selectedIdea.id)}
      />
    </DocsShell>
  );
}

