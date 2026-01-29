'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ImagePlus, ChevronDown, Loader2 } from 'lucide-react';

// Message question circle icon
function MessageQuestionIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const SUPPORT_TOPICS = [
  'Вопрос по работе сервиса',
  'Проблема с генерацией',
  'Предложение по улучшению',
  'Ошибка / Баг',
  'Другое',
] as const;

interface ImagePreview {
  file: File;
  preview: string;
}

export function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        if (!isSubmitting) {
          handleClose();
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isSubmitting]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isSubmitting]);

  // Close topic dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the topic dropdown
      if (target.closest('[data-topic-dropdown]')) {
        return;
      }
      setIsTopicOpen(false);
    }

    if (isTopicOpen) {
      // Use setTimeout to avoid immediate trigger from the same click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isTopicOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setTopic('');
      setDescription('');
      setImages([]);
      setError('');
      setSuccess(false);
    }, 200);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImagePreview[] = [];
    const maxImages = 5;
    const currentCount = images.length;
    const availableSlots = maxImages - currentCount;

    for (let i = 0; i < Math.min(files.length, availableSlots); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    setImages(prev => [...prev, ...newImages]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Prepare form data for images
      const formData = new FormData();
      formData.append('subject', topic);
      formData.append('message', description);
      
      images.forEach((img, index) => {
        formData.append(`image_${index}`, img.file);
      });

      const response = await fetch('/api/support/send-feedback', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Support Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.8)] hover:bg-[#252525] transition-colors"
        aria-label="Поддержка"
      >
        <MessageQuestionIcon className="w-4 h-4 text-white" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed bottom-[60px] right-4 z-50 w-[400px] max-w-[calc(100vw-32px)] bg-[#1a1a1a] rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          {/* Content */}
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
            {success ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">Сообщение отправлено!</p>
                <p className="text-[#666] text-sm mt-1">Мы ответим вам в ближайшее время</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wide">Поддержка</h2>
                </div>

                {/* Topic */}
                <div className="mb-5">
                  <label className="block text-[10px] font-medium text-[#666] uppercase tracking-wider mb-2">
                    Тема
                  </label>
                  <div className="relative" data-topic-dropdown>
                    <button
                      type="button"
                      onClick={() => setIsTopicOpen(!isTopicOpen)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-[#151515] border border-[#262626] rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:border-[#404040] transition-colors disabled:opacity-50"
                    >
                      <span className={topic ? 'text-white' : 'text-[#666]'}>
                        {topic || 'Выберите тему'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-white transition-transform ${isTopicOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isTopicOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden z-10">
                        {SUPPORT_TOPICS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTopic(t);
                              setIsTopicOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-[#252525] transition-colors ${
                              topic === t ? 'text-white bg-[#252525]' : 'text-[#999]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="block text-[10px] font-medium text-[#666] uppercase tracking-wider mb-2">
                    Описание проблемы
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={isSubmitting}
                    placeholder="Опишите проблему"
                    rows={4}
                    maxLength={4000}
                    className="w-full px-3 py-2 bg-[#151515] border border-[#262626] rounded-xl text-white text-sm placeholder:text-[#666] focus:outline-none focus:border-[#404040] transition-colors resize-none disabled:opacity-50"
                  />
                </div>

                {/* Images */}
                <div className="mb-5">
                  <label className="block text-[10px] font-medium text-[#666] uppercase tracking-wider mb-2">
                    Изображение
                  </label>
                  
                  {/* Upload button */}
                  {images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-[#151515] border border-dashed border-[#656565] rounded-lg text-sm text-[#666] flex items-center gap-3 hover:border-[#888] transition-colors disabled:opacity-50"
                    >
                      <ImagePlus className="w-5 h-5" />
                      <span>Выберите на устройстве</span>
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  
                  {/* Image previews - below upload button */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {images.map((img, index) => (
                        <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                          <img 
                            src={img.preview} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {images.length > 0 && (
                    <p className="text-[10px] text-[#555] mt-2">{images.length}/5 изображений</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-4 h-10 border border-[#262626] rounded-xl text-sm font-medium text-white hover:bg-[#252525] transition-colors disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !topic || !description}
                    className="px-4 h-10 bg-white rounded-xl text-sm font-medium text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Отправить
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
