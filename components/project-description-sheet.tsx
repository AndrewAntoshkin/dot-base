'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Trash2, Image as ImageIcon, Film, Loader2 } from 'lucide-react';

interface ProjectReference {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  file_name: string | null;
  sort_order: number;
}

interface ProjectDescriptionSheetProps {
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialCoverUrl: string | null;
  onClose: () => void;
  onUpdate: (updates: { name?: string; description?: string | null; cover_url?: string | null }) => void;
}

export function ProjectDescriptionSheet({
  projectId,
  initialName,
  initialDescription,
  initialCoverUrl,
  onClose,
  onUpdate,
}: ProjectDescriptionSheetProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [references, setReferences] = useState<ProjectReference[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [description]);

  // Fetch references
  useEffect(() => {
    fetchReferences();
  }, [projectId]);

  const fetchReferences = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/references`);
      if (res.ok) {
        const data = await res.json();
        setReferences(data.references || []);
      }
    } catch (error) {
      console.error('Fetch references error:', error);
    } finally {
      setIsLoadingRefs(false);
    }
  };

  // Debounced save
  const saveProject = useCallback(async (updates: { name?: string; description?: string }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        onUpdate(updates);
      }
    } catch (error) {
      console.error('Save project error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, onUpdate]);

  const handleNameBlur = () => {
    if (name.trim() !== initialName) {
      saveProject({ name: name.trim() });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProject({ description: value.trim() });
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Upload file to Supabase storage via API
  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
    return null;
  };

  // Handle cover upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        setCoverUrl(url);
        const res = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_url: url }),
        });
        if (res.ok) {
          onUpdate({ cover_url: url });
        }
      }
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleRemoveCover = async () => {
    setCoverUrl(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_url: null }),
    });
    if (res.ok) {
      onUpdate({ cover_url: null });
    }
  };

  // Handle reference upload
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingRef(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        if (url) {
          const isVideo = file.type.startsWith('video/');
          const res = await fetch(`/api/projects/${projectId}/references`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              media_type: isVideo ? 'video' : 'image',
              file_name: file.name,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setReferences(prev => [...prev, data.reference]);
          }
        }
      }
    } finally {
      setIsUploadingRef(false);
      if (refInputRef.current) refInputRef.current.value = '';
    }
  };

  const handleRemoveReference = async (refId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/references?refId=${refId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReferences(prev => prev.filter(r => r.id !== refId));
      }
    } catch (error) {
      console.error('Remove reference error:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-[#101010] border-l border-[#2e2e2e] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e] shrink-0">
          <h2 className="font-inter font-medium text-[16px] text-white">Описание проекта</h2>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="font-inter text-[12px] text-[#717171]">Сохранение...</span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#252525] transition-colors"
            >
              <X className="w-4 h-4 text-[#959595]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          {/* Cover */}
          <div className="mb-6">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em] mb-2 block">
              Обложка
            </label>
            {coverUrl ? (
              <div className="relative rounded-[12px] overflow-hidden group">
                <img src={coverUrl} alt="" className="w-full h-[180px] object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={handleRemoveCover}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="w-full h-[120px] border border-dashed border-[#2f2f2f] rounded-[12px] flex flex-col items-center justify-center gap-2 hover:border-[#4a4a4a] transition-colors disabled:opacity-50"
              >
                {isUploadingCover ? (
                  <Loader2 className="w-5 h-5 text-[#717171] animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-[#717171]" />
                    <span className="font-inter text-[13px] text-[#717171]">Загрузить обложку</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em] mb-2 block">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="w-full bg-transparent border border-[#2f2f2f] rounded-lg px-3 py-2 font-inter text-[14px] text-white focus:outline-none focus:border-[#4a4a4a]"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em] mb-2 block">
              Описание
            </label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Добавьте описание проекта..."
              className="w-full bg-transparent border border-[#2f2f2f] rounded-lg px-3 py-2 font-inter text-[14px] text-white placeholder:text-[#4d4d4d] focus:outline-none focus:border-[#4a4a4a] resize-none min-h-[80px]"
            />
          </div>

          {/* References */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-inter font-medium text-[10px] text-[#959595] uppercase tracking-[0.15em]">
                Референсы
              </label>
              <button
                onClick={() => refInputRef.current?.click()}
                disabled={isUploadingRef}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#252525] transition-colors disabled:opacity-50"
              >
                {isUploadingRef ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#717171] animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-[#717171]" />
                )}
                <span className="font-inter text-[12px] text-[#717171]">Добавить</span>
              </button>
            </div>

            <input
              ref={refInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleReferenceUpload}
              className="hidden"
            />

            {isLoadingRefs ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-[#1a1a1a] rounded-[8px] animate-pulse" />
                ))}
              </div>
            ) : references.length === 0 ? (
              <button
                onClick={() => refInputRef.current?.click()}
                className="w-full py-8 border border-dashed border-[#2f2f2f] rounded-[12px] flex flex-col items-center justify-center gap-2 hover:border-[#4a4a4a] transition-colors"
              >
                <div className="flex items-center gap-2 text-[#4d4d4d]">
                  <ImageIcon className="w-4 h-4" />
                  <Film className="w-4 h-4" />
                </div>
                <span className="font-inter text-[13px] text-[#717171]">
                  Прикрепите изображения или видео
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {references.map(ref => (
                  <div key={ref.id} className="relative aspect-square rounded-[8px] overflow-hidden group">
                    {ref.media_type === 'video' ? (
                      <video
                        src={ref.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={ref.url}
                        alt={ref.file_name || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveReference(ref.id)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    {ref.media_type === 'video' && (
                      <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
                        <Film className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
