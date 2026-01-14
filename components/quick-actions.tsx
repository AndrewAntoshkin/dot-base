'use client';

import { useRouter } from 'next/navigation';
import { 
  Play, 
  Pencil, 
  Sparkles, 
  Eraser, 
  PaintBucket, 
  Maximize2,
} from 'lucide-react';

interface QuickActionsProps {
  /** URL медиа для передачи в следующее действие */
  mediaUrl: string;
  /** Тип медиа: image или video */
  mediaType: 'image' | 'video';
  /** Компактный режим для мобильной версии */
  compact?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Путь для навигации */
  getPath: (mediaUrl: string) => string;
}

// Quick Actions для изображений (6 штук)
const IMAGE_ACTIONS: QuickAction[] = [
  {
    id: 'animate',
    label: 'Анимировать',
    icon: <Play className="w-3.5 h-3.5" />,
    getPath: (url) => `/video?action=video_i2v&imageUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'edit',
    label: 'Редактировать',
    icon: <Pencil className="w-3.5 h-3.5" />,
    getPath: (url) => `/?action=edit&imageUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'upscale',
    label: 'Улучшить',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    getPath: (url) => `/?action=upscale&imageUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'remove_bg',
    label: 'Удалить фон',
    icon: <Eraser className="w-3.5 h-3.5" />,
    getPath: (url) => `/?action=remove_bg&imageUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'inpaint',
    label: 'Inpaint',
    icon: <PaintBucket className="w-3.5 h-3.5" />,
    getPath: (url) => `/inpaint?imageUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'outpaint',
    label: 'Outpaint',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
    getPath: (url) => `/expand?imageUrl=${encodeURIComponent(url)}`,
  },
];

// Quick Actions для видео (2 штуки)
const VIDEO_ACTIONS: QuickAction[] = [
  {
    id: 'video_upscale',
    label: 'Улучшить',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    getPath: (url) => `/video?action=video_upscale&videoUrl=${encodeURIComponent(url)}`,
  },
  {
    id: 'video_edit',
    label: 'Редактировать',
    icon: <Pencil className="w-3.5 h-3.5" />,
    getPath: (url) => `/video?action=video_edit&videoUrl=${encodeURIComponent(url)}`,
  },
];

export function QuickActions({ mediaUrl, mediaType, compact = false }: QuickActionsProps) {
  const router = useRouter();
  const actions = mediaType === 'image' ? IMAGE_ACTIONS : VIDEO_ACTIONS;

  const handleActionClick = (action: QuickAction) => {
    const path = action.getPath(mediaUrl);
    console.log('[QuickActions] Navigating to:', path);
    router.push(path);
  };

  return (
    <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : ''}`}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleActionClick(action)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 h-8 border border-[#4D4D4D] rounded-[10px] font-inter font-medium text-xs text-white transition-colors whitespace-nowrap hover:bg-[#1f1f1f] hover:border-[#666]"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
