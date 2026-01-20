'use client';

import { useCallback, useState } from 'react';
import { useFlowStore } from '@/lib/flow/store';
import { cn } from '@/lib/utils';
import { ChevronDown, RotateCcw, Save, Loader2 } from 'lucide-react';

interface FlowToolbarProps {
  onSave?: () => Promise<void>;
  onReset?: () => void;
}

export function FlowToolbar({ onSave, onReset }: FlowToolbarProps) {
  const { flowName, setFlowName, isSaving, hasUnsavedChanges, setIsSaving, setHasUnsavedChanges } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = useCallback(async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
        setHasUnsavedChanges(false);
      } finally {
        setIsSaving(false);
      }
    }
  }, [onSave, setIsSaving, setHasUnsavedChanges]);

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  return (
    <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
      {/* Left side - Flow name selector */}
      <div className="pointer-events-auto">
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl',
            'bg-[#171717] text-white',
            'hover:bg-[#1F1F1F] transition-colors'
          )}
        >
          {isEditing ? (
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              autoFocus
              className="bg-transparent text-sm font-medium outline-none"
            />
          ) : (
            <>
              <span className="text-sm font-medium" onClick={() => setIsEditing(true)}>
                {flowName || 'Без названия'}
              </span>
              <ChevronDown className="w-5 h-5 text-white" />
            </>
          )}
        </button>
      </div>

      {/* Right side - Actions */}
      <div className="pointer-events-auto flex items-center gap-1">
        <button
          onClick={handleReset}
          className={cn(
            'flex items-center justify-center gap-2 px-4 h-10 rounded-xl',
            'bg-[#212121] text-white border border-[#2F2F2F]',
            'hover:bg-[#2F2F2F] transition-colors'
          )}
        >
          <span className="text-sm font-medium">Сбросить</span>
        </button>
        
        <button
          onClick={handleSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={cn(
            'flex items-center justify-center gap-2 px-4 h-10 rounded-xl',
            'bg-white text-black',
            'hover:bg-white/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          <span className="text-sm font-medium">Сохранить</span>
        </button>
      </div>
    </div>
  );
}
