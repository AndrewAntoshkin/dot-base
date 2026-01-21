'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

interface FlowSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  initialName?: string;
  isLoading?: boolean;
}

export function FlowSaveModal({ isOpen, onClose, onSave, initialName = '', isLoading }: FlowSaveModalProps) {
  const [name, setName] = useState(initialName || 'Без названия');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Update name when initialName changes
  useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim() || 'Без названия';
    await onSave(trimmedName);
  }, [name, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-[#171717] rounded-2xl p-6 w-full max-w-[400px] mx-4 shadow-[0px_16px_48px_0px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#212121] hover:bg-[#2a2a2a] transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-white mb-6">
          Сохранить Flow
        </h2>

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-[10px] font-medium uppercase tracking-[0.15em] text-[#959595] mb-2">
            Название
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите название..."
            className="w-full h-12 px-4 rounded-xl bg-[#101010] text-white text-sm outline-none border border-[#2F2F2F] focus:border-white/30 transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl bg-[#212121] text-white text-sm font-medium hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
