'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Copy, Check, RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: Date;
}

interface UserContext {
  currentAction?: string;
  selectedModel?: string;
  currentPrompt?: string;
  aspectRatio?: string;
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: UserContext;
}

const SUGGESTIONS = [
  'Какую модель выбрать для портрета?',
  'Напиши промпт для пейзажа в стиле аниме',
  'Как добавить текст на изображение?',
  'Чем отличается Flux от Recraft?',
  'Как сделать видео из картинки?',
];

// Model links mapping - for "Try it" buttons
// IMPORTANT: modelId must match exactly with id in models-config.ts
const MODEL_LINKS: { keywords: string[]; modelId: string; action: string; label: string; docUrl: string }[] = [
  // === IMAGE CREATE ===
  // Flux models
  { keywords: ['flux 2 max', 'flux max'], modelId: 'flux-2-max', action: 'create', label: 'Flux 2 Max', docUrl: '/docs/models/flux/flux-2-max' },
  { keywords: ['flux 2 pro'], modelId: 'flux-2-pro', action: 'create', label: 'Flux 2 Pro', docUrl: '/docs/models/flux/flux-2-pro' },
  { keywords: ['flux 1.1 pro', 'flux 1.1'], modelId: 'flux-1.1-pro', action: 'create', label: 'Flux 1.1 Pro', docUrl: '/docs/models/flux/flux-1-1-pro' },
  { keywords: ['flux kontext max'], modelId: 'flux-kontext-max', action: 'create', label: 'Flux Kontext Max', docUrl: '/docs/models/flux/flux-kontext-max' },
  { keywords: ['flux kontext fast'], modelId: 'flux-kontext-fast', action: 'create', label: 'Flux Kontext Fast', docUrl: '/docs/models/flux/flux-kontext-fast' },
  // Seedream
  { keywords: ['seedream 4.5'], modelId: 'seedream-4.5', action: 'create', label: 'Seedream 4.5', docUrl: '/docs/models/seedream/seedream-4-5' },
  { keywords: ['seedream 4', 'seedream'], modelId: 'seedream-4', action: 'create', label: 'Seedream 4', docUrl: '/docs/models/seedream/seedream-4' },
  // Ideogram
  { keywords: ['ideogram', 'ideogram v3', 'текст на изображ'], modelId: 'ideogram-v3-turbo', action: 'create', label: 'Ideogram V3', docUrl: '/docs/models/ideogram/ideogram-v3' },
  // Google
  { keywords: ['imagen 4', 'imagen', 'google imagen'], modelId: 'imagen-4-ultra', action: 'create', label: 'Google Imagen 4', docUrl: '/docs/models/google/imagen-4' },
  // Recraft
  { keywords: ['recraft v3'], modelId: 'recraft-v3', action: 'create', label: 'Recraft V3', docUrl: '/docs/models/recraft/recraft-v3' },
  { keywords: ['recraft svg', 'векторн'], modelId: 'recraft-v3-svg', action: 'create', label: 'Recraft V3 SVG', docUrl: '/docs/models/recraft/recraft-v3-svg' },
  // Other create
  { keywords: ['stable diffusion', 'sd 3.5', 'sd3'], modelId: 'sd-3.5-large', action: 'create', label: 'Stable Diffusion 3.5', docUrl: '/docs/models/other/sd-3-5' },
  { keywords: ['minimax image', 'minimax'], modelId: 'minimax-image-01', action: 'create', label: 'MiniMax Image', docUrl: '/docs/models/other/minimax-image' },
  { keywords: ['nano banana', 'banana'], modelId: 'nano-banana-pro', action: 'create', label: 'Nano Banana Pro', docUrl: '/docs/models/other/nano-banana' },
  { keywords: ['reve create', 'reve image'], modelId: 'reve-create', action: 'create', label: 'Reve Create', docUrl: '/docs/models/other/reve-create' },
  { keywords: ['gen4 image', 'runway image'], modelId: 'gen4-image-turbo', action: 'create', label: 'Gen4 Image', docUrl: '/docs/models/other/gen4-image' },
  
  // === VIDEO CREATE (text-to-video) ===
  { keywords: ['veo 3.1', 'veo 3', 'google veo'], modelId: 'veo-3.1-fast', action: 'video_create', label: 'Google Veo 3.1', docUrl: '/docs/models/google/veo-3-1' },
  { keywords: ['kling 2.5'], modelId: 'kling-v2.5-turbo-pro-t2v', action: 'video_create', label: 'Kling 2.5 Pro', docUrl: '/docs/models/kling/kling-2-5-pro' },
  { keywords: ['kling 2.1', 'kling master'], modelId: 'kling-v2.1-master-t2v', action: 'video_create', label: 'Kling 2.1 Master', docUrl: '/docs/models/kling/kling-2-1-master' },
  { keywords: ['kling 2.0', 'kling 2'], modelId: 'kling-v2.0-t2v', action: 'video_create', label: 'Kling 2.0', docUrl: '/docs/models/kling/kling-2-0' },
  { keywords: ['kling 1.0', 'kling 1'], modelId: 'kling-1.0-t2v-fal', action: 'video_create', label: 'Kling 1.0', docUrl: '/docs/models/kling/kling-1-0' },
  { keywords: ['hailuo 2.3'], modelId: 'hailuo-2.3-t2v', action: 'video_create', label: 'Hailuo 2.3', docUrl: '/docs/models/hailuo/hailuo-2-3' },
  { keywords: ['hailuo 02', 'hailuo'], modelId: 'hailuo-02-t2v', action: 'video_create', label: 'Hailuo 02', docUrl: '/docs/models/hailuo/hailuo-02' },
  { keywords: ['seedance 1.5'], modelId: 'seedance-1.5-pro-t2v', action: 'video_create', label: 'Seedance 1.5 Pro', docUrl: '/docs/models/other/seedance-1-5' },
  { keywords: ['seedance'], modelId: 'seedance-1-pro-t2v', action: 'video_create', label: 'Seedance 1 Pro', docUrl: '/docs/models/other/seedance' },
  { keywords: ['wan 2.5', 'wan'], modelId: 'wan-2.5-t2v', action: 'video_create', label: 'Wan 2.5', docUrl: '/docs/models/other/wan-2-5' },
  
  // === VIDEO I2V (image-to-video) ===
  { keywords: ['gen4 turbo', 'runway gen4', 'gen4'], modelId: 'gen4-turbo-i2v', action: 'video_i2v', label: 'Runway Gen4 Turbo', docUrl: '/docs/models/other/runway-gen4' },
  
  // === INPAINT ===
  { keywords: ['flux fill', 'flux inpaint'], modelId: 'flux-fill-pro', action: 'inpaint', label: 'Flux Fill Pro', docUrl: '/docs/models/flux/flux-fill-pro' },
  { keywords: ['bria genfill', 'genfill'], modelId: 'bria-genfill-inpaint', action: 'inpaint', label: 'Bria GenFill', docUrl: '/docs/models/edit/bria-genfill' },
  { keywords: ['bria eraser', 'eraser'], modelId: 'bria-eraser-inpaint', action: 'inpaint', label: 'Bria Eraser', docUrl: '/docs/models/edit/bria-eraser' },
  
  // === EDIT ===
  { keywords: ['reve edit', 'reve редакт'], modelId: 'reve-edit', action: 'edit', label: 'Reve Edit', docUrl: '/docs/models/edit/reve-edit' },
  { keywords: ['flux kontext edit', 'kontext edit'], modelId: 'flux-kontext-max-edit', action: 'edit', label: 'Flux Kontext Edit', docUrl: '/docs/models/flux/flux-kontext-max' },
  
  // === EXPAND (Outpaint) ===
  { keywords: ['bria expand', 'expand', 'расшир'], modelId: 'bria-expand', action: 'expand', label: 'Bria Expand', docUrl: '/docs/models/edit/bria-expand' },
  { keywords: ['outpainter'], modelId: 'outpainter', action: 'expand', label: 'Outpainter', docUrl: '/docs/models/edit/outpainter' },
  
  // === UPSCALE ===
  { keywords: ['clarity upscaler', 'clarity'], modelId: 'clarity-upscaler', action: 'upscale', label: 'Clarity Upscaler', docUrl: '/docs/models/upscale/clarity' },
  { keywords: ['crystal', 'creative upscaler'], modelId: 'crystal-upscaler', action: 'upscale', label: 'Crystal Upscaler', docUrl: '/docs/models/upscale/crystal' },
  { keywords: ['recraft crisp', 'crisp'], modelId: 'recraft-crisp-upscale', action: 'upscale', label: 'Recraft Crisp', docUrl: '/docs/models/recraft/recraft-crisp' },
  { keywords: ['real-esrgan', 'esrgan', 'real esrgan'], modelId: 'real-esrgan', action: 'upscale', label: 'Real-ESRGAN', docUrl: '/docs/models/upscale/real-esrgan' },
  { keywords: ['magic refiner', 'refiner'], modelId: 'magic-image-refiner', action: 'upscale', label: 'Magic Image Refiner', docUrl: '/docs/models/upscale/magic-refiner' },
  
  // === REMOVE BG ===
  { keywords: ['birefnet', 'удалить фон', 'удаление фона', 'убрать фон'], modelId: 'birefnet', action: 'remove_bg', label: 'BiRefNet', docUrl: '/docs/models/remove-bg/birefnet' },
  { keywords: ['bria background', 'bria remove'], modelId: 'bria-remove-background', action: 'remove_bg', label: 'Bria Background Remover', docUrl: '/docs/models/remove-bg/bria' },
  
  // === ANALYZE ===
  { keywords: ['moondream', 'анализ изображ'], modelId: 'moondream2', action: 'analyze_describe', label: 'Moondream', docUrl: '/docs/models/analyze/moondream' },
  { keywords: ['llava'], modelId: 'llava-13b', action: 'analyze_describe', label: 'LLaVA', docUrl: '/docs/models/analyze/llava' },
  { keywords: ['blip', 'blip-2'], modelId: 'blip-2', action: 'analyze_describe', label: 'BLIP-2', docUrl: '/docs/models/analyze/blip2' },
  { keywords: ['clip interrogator', 'clip'], modelId: 'clip-interrogator', action: 'analyze_prompt', label: 'CLIP Interrogator', docUrl: '/docs/models/analyze/clip-interrogator' },
  { keywords: ['ocr', 'распознавание текста'], modelId: 'deepseek-ocr', action: 'analyze_ocr', label: 'DeepSeek OCR', docUrl: '/docs/models/analyze/ocr' },
];

// Find model links based on content
function getRelevantModelLinks(content: string): { modelId: string; action: string; label: string; docUrl: string }[] {
  const lowerContent = content.toLowerCase();
  const found: { modelId: string; action: string; label: string; docUrl: string }[] = [];
  const usedModels = new Set<string>();

  for (const model of MODEL_LINKS) {
    if (usedModels.has(model.modelId)) continue;
    
    for (const keyword of model.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        found.push({ modelId: model.modelId, action: model.action, label: model.label, docUrl: model.docUrl });
        usedModels.add(model.modelId);
        break;
      }
    }
  }

  // Limit to 2 most relevant model links
  return found.slice(0, 2);
}

// Documentation links mapping
const DOC_LINKS: { keywords: string[]; url: string; label: string }[] = [
  // Models - Flux
  { keywords: ['flux', 'flux 2', 'flux.1', 'flux pro', 'flux dev', 'flux schnell'], url: '/docs/models/flux', label: 'Подробнее про Flux' },
  { keywords: ['flux 2 max', 'flux max'], url: '/docs/models/flux/flux-2-max', label: 'Flux 2 Max' },
  { keywords: ['flux 2 pro'], url: '/docs/models/flux/flux-2-pro', label: 'Flux 2 Pro' },
  { keywords: ['flux kontext'], url: '/docs/models/flux/flux-kontext-max', label: 'Flux Kontext' },
  { keywords: ['flux fill', 'inpaint flux'], url: '/docs/models/flux/flux-fill-pro', label: 'Flux Fill Pro' },
  // Models - Other
  { keywords: ['ideogram', 'текст на изображ'], url: '/docs/models/ideogram', label: 'Ideogram (текст на изображениях)' },
  { keywords: ['recraft', 'иллюстрац', 'стилизован'], url: '/docs/models/recraft', label: 'Recraft' },
  { keywords: ['seedream'], url: '/docs/models/seedream', label: 'Seedream' },
  { keywords: ['imagen', 'google imagen'], url: '/docs/models/google/imagen-4', label: 'Google Imagen 4' },
  // Video models
  { keywords: ['kling', 'видео kling'], url: '/docs/models/kling', label: 'Kling (видео)' },
  { keywords: ['hailuo', 'minimax'], url: '/docs/models/hailuo', label: 'Hailuo (видео)' },
  { keywords: ['veo', 'google veo'], url: '/docs/models/google/veo-3-1', label: 'Google Veo' },
  // Features
  { keywords: ['создать изображ', 'генерация изображ', 'создание картин'], url: '/docs/features/image', label: 'Создание изображений' },
  { keywords: ['видео', 'создать видео', 'генерация видео'], url: '/docs/features/video', label: 'Создание видео' },
  { keywords: ['редактиров', 'изменить изображ'], url: '/docs/features/edit', label: 'Редактирование' },
  { keywords: ['inpaint', 'инпейнт', 'закрасить', 'заменить область'], url: '/docs/features/inpaint', label: 'Inpainting' },
  { keywords: ['outpaint', 'расширить', 'аутпейнт'], url: '/docs/features/outpaint', label: 'Outpainting' },
  { keywords: ['upscale', 'апскейл', 'увеличить разрешение', 'улучшить качество'], url: '/docs/features/upscale', label: 'Улучшение качества' },
  { keywords: ['удалить фон', 'remove background', 'убрать фон'], url: '/docs/features/remove-bg', label: 'Удаление фона' },
  { keywords: ['анализ', 'описать картинк', 'что на изображ'], url: '/docs/features/analyze', label: 'Анализ изображений' },
  { keywords: ['брейнсторм', 'brainstorm', 'идеи для промпт'], url: '/docs/features/brainstorm', label: 'Брейнсторм' },
  { keywords: ['keyframe', 'ключевые кадры'], url: '/docs/features/keyframes', label: 'Keyframes' },
  // General
  { keywords: ['промпт', 'prompt', 'как писать'], url: '/docs/prompts', label: 'Советы по промптам' },
  { keywords: ['совет', 'лайфхак', 'трюк'], url: '/docs/tips', label: 'Советы и трюки' },
  { keywords: ['начать', 'быстрый старт', 'как пользоват'], url: '/docs/quickstart', label: 'Быстрый старт' },
];

// Find relevant doc links based on content
function getRelevantDocLinks(content: string): { url: string; label: string }[] {
  const lowerContent = content.toLowerCase();
  const found: { url: string; label: string }[] = [];
  const usedUrls = new Set<string>();

  for (const doc of DOC_LINKS) {
    if (usedUrls.has(doc.url)) continue;
    
    for (const keyword of doc.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        found.push({ url: doc.url, label: doc.label });
        usedUrls.add(doc.url);
        break;
      }
    }
  }

  // Limit to 3 most relevant links
  return found.slice(0, 3);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 10) return 'только что';
  if (diff < 60) return `${diff} сек назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return date.toLocaleDateString('ru-RU');
}

// Model link component - styled card for "Try model" links
function ModelLink({ label, modelId, action, docUrl }: { label: string; modelId: string; action: string; docUrl: string }) {
  const [hoveredButton, setHoveredButton] = useState<'try' | 'doc' | null>(null);
  
  // Build URL based on action type
  const getModelUrl = () => {
    // Video actions -> /video page
    if (action.startsWith('video')) {
      return `/video?model=${modelId}`;
    }
    // Inpaint -> /inpaint page
    if (action === 'inpaint') {
      return `/inpaint?model=${modelId}`;
    }
    // Expand/Outpaint -> /expand page
    if (action === 'expand') {
      return `/expand?model=${modelId}`;
    }
    // Analyze -> /analyze page
    if (action.startsWith('analyze')) {
      return `/analyze?model=${modelId}`;
    }
    // Brainstorm -> /brainstorm page
    if (action === 'brainstorm') {
      return `/brainstorm?model=${modelId}`;
    }
    // Keyframes -> /keyframes page
    if (action === 'keyframes') {
      return `/keyframes?model=${modelId}`;
    }
    // Other actions (create, edit, upscale, remove_bg) -> home page with action param
    if (action !== 'create') {
      return `/?action=${action}&model=${modelId}`;
    }
    // Default: create action -> home page
    return `/?model=${modelId}`;
  };
    
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      width: '100%',
      maxWidth: '356px',
      marginTop: '8px',
      marginBottom: '8px',
    }}>
      {/* Model name */}
      <span style={{
        fontFamily: 'Google Sans, sans-serif',
        fontWeight: 600,
        fontSize: '14px',
        lineHeight: 1.4,
        color: '#FFFFFF',
      }}>
        {label}
      </span>
      
      {/* Buttons row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Try button */}
        <a 
          href={getModelUrl()}
          onMouseEnter={() => setHoveredButton('try')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            padding: '8px 12px',
            background: hoveredButton === 'try' ? '#FFFFFF' : '#333333',
            borderRadius: '10px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{
            fontFamily: 'Google Sans, sans-serif',
            fontWeight: 500,
            fontSize: '11px',
            lineHeight: 1.4,
            textTransform: 'uppercase',
            color: hoveredButton === 'try' ? '#000000' : '#FFFFFF',
          }}>
            Попробовать
          </span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke={hoveredButton === 'try' ? '#000000' : '#FFFFFF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        
        {/* Doc button */}
        <a 
          href={docUrl}
          onMouseEnter={() => setHoveredButton('doc')}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            flex: 1,
            padding: '8px 12px',
            border: hoveredButton === 'doc' ? '1px solid #FFFFFF' : '1px solid #333333',
            borderRadius: '10px',
            textDecoration: 'none',
            background: 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{
            fontFamily: 'Google Sans, sans-serif',
            fontWeight: 500,
            fontSize: '11px',
            lineHeight: 1.4,
            textTransform: 'uppercase',
            color: '#FFFFFF',
          }}>
            Документация
          </span>
          <img 
            src="/icon-arrow-circle-right.svg" 
            alt="" 
            style={{ width: '12px', height: '12px' }}
          />
        </a>
      </div>
    </div>
  );
}

// Doc link component - styled card for documentation links
function DocLink({ name, href }: { name: string; href: string }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Clean up the name - remove "Ссылка:", "Ссылка на" etc.
  const cleanName = name
    .replace(/^Ссылка:\s*/i, '')
    .replace(/^Ссылка на\s*/i, '')
    .replace(/^Ссылка\s*/i, '')
    .trim();
    
  return (
    <a 
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '356px',
        padding: '8px 8px 8px 12px',
        border: isHovered ? '1px solid #FFFFFF' : '1px solid #252525',
        borderRadius: '12px',
        textDecoration: 'none',
        marginTop: '4px',
        marginBottom: '12px',
        transition: 'border-color 0.2s ease',
      }}
    >
      <span style={{
        fontFamily: 'Google Sans, sans-serif',
        fontWeight: 500,
        fontSize: '10px',
        lineHeight: 1.4,
        textTransform: 'uppercase',
        color: '#FFFFFF',
      }}>
        {cleanName}
      </span>
      <img 
        src="/icon-arrow-circle-right.svg" 
        alt="" 
        style={{ width: '16px', height: '16px' }}
      />
    </a>
  );
}

// Prompt block component with copy button
function PromptBlock({ content, blockKey }: { content: string; blockKey: number }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      key={blockKey}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(51, 51, 51, 0.3)',
        borderLeft: '1px solid #FFFFFF',
        margin: '8px 0',
      }}
    >
      <span style={{
        fontFamily: 'Google Sans, sans-serif',
        fontSize: '12px',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        color: '#D9D9D9',
        flex: 1,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {content}
      </span>
      <button
        onClick={handleCopy}
        style={{
          flexShrink: 0,
          width: '16px',
          height: '16px',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          opacity: copied ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
        title={copied ? 'Скопировано!' : 'Копировать промпт'}
      >
        <img 
          src="/icon-copy-prompt.svg" 
          alt="Copy" 
          style={{ width: '16px', height: '16px' }}
        />
      </button>
    </div>
  );
}

// Simple markdown renderer with prompt blocks
function renderMarkdown(text: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Helper: process inline styles (bold, italic)
  const processInlineStyles = (str: string, k: number): React.ReactNode => {
    const elems: React.ReactNode[] = [];
    let lastIdx = 0;
    
    const boldRegex = /\*\*([^*]+)\*\*|__([^_]+)__/g;
    let match;
    
    while ((match = boldRegex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        elems.push(str.slice(lastIdx, match.index));
      }
      elems.push(<strong key={`b${k}-${match.index}`}>{match[1] || match[2]}</strong>);
      lastIdx = match.index + match[0].length;
    }
    
    if (elems.length === 0) {
      const italicRegex = /\*([^*]+)\*|_([^_]+)_/g;
      while ((match = italicRegex.exec(str)) !== null) {
        if (match.index > lastIdx) {
          elems.push(str.slice(lastIdx, match.index));
        }
        elems.push(<em key={`i${k}-${match.index}`}>{match[1] || match[2]}</em>);
        lastIdx = match.index + match[0].length;
      }
    }
    
    if (elems.length === 0) return str;
    if (lastIdx < str.length) elems.push(str.slice(lastIdx));
    return <span key={k}>{elems}</span>;
  };

  // Helper: process inline elements (links, bold, italic, prompt placeholders)
  const processInline = (line: string, skipModelLinks = false): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let pk = 0;

    while (remaining.length > 0) {
      // Check for prompt block placeholder first
      const promptPlaceholder = remaining.match(/__PROMPT_BLOCK_(\d+)__/);
      if (promptPlaceholder && promptPlaceholder.index !== undefined) {
        if (promptPlaceholder.index > 0) {
          // Process text before placeholder recursively
          const beforeText = remaining.slice(0, promptPlaceholder.index);
          const beforeParts = processInline(beforeText, skipModelLinks);
          if (Array.isArray(beforeParts)) {
            parts.push(...beforeParts);
          } else {
            parts.push(beforeParts);
          }
        }
        const promptIdx = parseInt(promptPlaceholder[1]);
        if (promptBlocks[promptIdx]) {
          parts.push(<PromptBlock key={pk++} content={promptBlocks[promptIdx]} blockKey={pk} />);
        }
        remaining = remaining.slice(promptPlaceholder.index + promptPlaceholder[0].length);
        continue;
      }

      // Check for links
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && linkMatch.index !== undefined) {
        if (linkMatch.index > 0) {
          parts.push(processInlineStyles(remaining.slice(0, linkMatch.index), pk++));
        }
        
        const linkText = linkMatch[1];
        const linkHref = linkMatch[2];
        
        // Check if it's a doc link (/docs/) - render as styled card, not in list
        if (linkHref.startsWith('/docs/') && !skipModelLinks) {
          parts.push(<DocLink key={pk++} name={linkText} href={linkHref} />);
        } else {
          parts.push(
            <a 
              key={pk++} 
              href={linkHref} 
              style={{ color: '#60A5FA', textDecoration: 'underline' }}
              target={linkHref.startsWith('http') ? '_blank' : undefined}
              rel={linkHref.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {linkText}
            </a>
          );
        }
        remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
        continue;
      }
      parts.push(processInlineStyles(remaining, pk++));
      break;
    }

    return parts.length === 1 ? parts[0] : parts;
  };
  
  // Check if line contains a doc link
  const hasDocLink = (line: string): boolean => {
    return /\[[^\]]+\]\(\/docs\/[^)]+\)/.test(line);
  };
  
  // Extract doc links from line
  const extractDocLinks = (line: string): React.ReactNode[] => {
    const links: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]\((\/docs\/[^)]+)\)/g;
    let match;
    let pk = 0;
    while ((match = regex.exec(line)) !== null) {
      links.push(<DocLink key={pk++} name={match[1]} href={match[2]} />);
    }
    return links;
  };
  
  // Remove doc links from line for inline processing
  const removeDocLinks = (line: string): string => {
    let result = line.replace(/\[([^\]]+)\]\(\/docs\/[^)]+\)/g, '').trim();
    // Remove any variation of "Ссылка" text that might be left
    result = result
      .replace(/^Ссылка:\s*/gi, '')
      .replace(/^Ссылка\s*/gi, '')
      .replace(/\s*Ссылка:\s*$/gi, '')
      .replace(/\s*Ссылка\s*$/gi, '')
      // Remove orphan punctuation left between removed links
      .replace(/^\s*[,;.]\s*$/g, '')
      .replace(/^\s*[,;.]\s+/g, '')
      .replace(/\s+[,;.]\s*$/g, '')
      .replace(/\s+[,;.]\s+/g, ' ')
      .trim();
    // If only "Ссылка" or punctuation remains, return empty
    if (/^Ссылка:?\s*$/i.test(result) || /^[,;.\s]*$/.test(result)) return '';
    return result;
  };

  // Extract code blocks (```...```) only - no auto-detection of quoted prompts
  const codeBlockRegex = /```[\s\S]*?```/g;
  
  // Process text, replacing code blocks with placeholders
  let processedText = text;
  const promptBlocks: string[] = [];

  // Extract code blocks only
  const codeMatches = text.match(codeBlockRegex) || [];
  codeMatches.forEach((match) => {
    const content = match
      .replace(/^```\w*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
    if (content) {
      promptBlocks.push(content);
      processedText = processedText.replace(match, `\n__PROMPT_BLOCK_${promptBlocks.length - 1}__\n`);
    }
  });

  // Now process the text with placeholders
  const lines = processedText.split('\n');
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let isInTable = false;

  // Helper: check if line is a table row
  const isTableRow = (line: string): boolean => {
    return line.trim().startsWith('|') && line.trim().endsWith('|');
  };

  // Helper: check if line is table separator (|---|---|)
  const isTableSeparator = (line: string): boolean => {
    return /^\|[\s:-]+\|/.test(line.trim()) && /^[\s|:-]+$/.test(line.trim());
  };

  // Helper: parse table row into cells
  const parseTableRow = (line: string): string[] => {
    return line.trim()
      .slice(1, -1) // Remove first and last |
      .split('|')
      .map(cell => cell.trim());
  };

  // Helper: flush table
  const flushTable = () => {
    if (tableRows.length > 1) {
      const headers = tableRows[0];
      const dataRows = tableRows.slice(1);
      
      elements.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '13px',
            border: '1px solid #333'
          }}>
            <thead>
              <tr>
                {headers.map((cell, i) => (
                  <th key={i} style={{ 
                    padding: '8px 12px', 
                    textAlign: 'left', 
                    fontWeight: 600, 
                    color: '#FFFFFF',
                    borderBottom: '1px solid #333',
                    background: '#1a1a1a'
                  }}>
                    {processInline(cell, true)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ 
                      padding: '8px 12px', 
                      color: '#D9D9D9',
                      borderBottom: '1px solid #252525'
                    }}>
                      {processInline(cell, true)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableRows = [];
    isInTable = false;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      // Separate items with doc links from regular items
      const regularItems: string[] = [];
      const docLinkItems: { text: string; links: React.ReactNode[] }[] = [];
      
      listItems.forEach(item => {
        if (hasDocLink(item)) {
          const cleanText = removeDocLinks(item);
          const links = extractDocLinks(item);
          docLinkItems.push({ text: cleanText, links });
        } else {
          regularItems.push(item);
        }
      });
      
      // Render regular list items
      if (regularItems.length > 0) {
        elements.push(
          <ul key={key++} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
            {regularItems.map((item, i) => {
              // Check if item has multiple lines (merged description)
              if (item.includes('\n')) {
                const lines = item.split('\n');
                return (
                  <li key={i} style={{ marginBottom: '8px', color: '#D9D9D9' }}>
                    {lines.map((line, j) => (
                      <div key={j} style={{ marginBottom: j === 0 ? '2px' : 0 }}>
                        {processInline(line, true)}
                      </div>
                    ))}
                  </li>
                );
              }
              return (
                <li key={i} style={{ marginBottom: '4px', color: '#D9D9D9' }}>
                  {processInline(item, true)}
                </li>
              );
            })}
          </ul>
        );
      }
      
      // Render doc link items separately (text + doc card)
      docLinkItems.forEach(({ text, links }) => {
        if (text) {
          elements.push(
            <p key={key++} style={{ margin: '6px 0', color: '#D9D9D9', lineHeight: 1.5 }}>
              {processInline(text, true)}
            </p>
          );
        }
        links.forEach(link => {
          elements.push(<div key={key++}>{link}</div>);
        });
      });
      
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table handling
    if (isTableRow(trimmed)) {
      if (isTableSeparator(trimmed)) {
        // This is the separator row, skip it but mark we're in table
        isInTable = true;
        continue;
      }
      // This is a data/header row
      flushList();
      tableRows.push(parseTableRow(trimmed));
      isInTable = true;
      continue;
    } else if (isInTable && tableRows.length > 0) {
      // End of table
      flushTable();
    }

    // Check for standalone prompt block placeholder (whole line)
    const promptMatch = trimmed.match(/^__PROMPT_BLOCK_(\d+)__$/);
    if (promptMatch) {
      flushList();
      const promptIdx = parseInt(promptMatch[1]);
      if (promptBlocks[promptIdx]) {
        elements.push(<PromptBlock key={key++} content={promptBlocks[promptIdx]} blockKey={key} />);
      }
      continue;
    }
    
    // Check for inline prompt block placeholder (within text)
    if (trimmed.includes('__PROMPT_BLOCK_') && !promptMatch) {
      flushList();
      elements.push(
        <div key={key++} style={{ margin: '6px 0' }}>
          {processInline(trimmed)}
        </div>
      );
      continue;
    }

    if (!trimmed) {
      flushList();
      elements.push(<div key={key++} style={{ height: '8px' }} />);
      continue;
    }

    // Skip standalone "Ссылка:" lines (with or without markdown formatting)
    // Matches: "Ссылка:", "**Ссылка:**", "**Ссылка**:", "Ссылка", etc.
    if (/^(\*\*)?Ссылка:?(\*\*)?\s*$/i.test(trimmed)) {
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      elements.push(
        <hr key={key++} style={{ border: 'none', borderTop: '1px solid #333', margin: '16px 0' }} />
      );
      continue;
    }

    // Headers (check from most # to least)
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={key++} style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', margin: '10px 0 4px 0' }}>
          {processInline(trimmed.slice(5))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={key++} style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', margin: '12px 0 6px 0' }}>
          {processInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', margin: '14px 0 8px 0' }}>
          {processInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={key++} style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', margin: '16px 0 10px 0' }}>
          {processInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // List items
    if (trimmed.match(/^[-*•]\s/)) {
      const itemContent = trimmed.slice(2);
      
      // Check if this is a description line (Применение:, Почему:, Когда:)
      // If so, merge with previous list item
      if (listItems.length > 0 && /^(Применение|Почему|Когда использовать|Особенности):/i.test(itemContent)) {
        // Append to previous item with line break
        listItems[listItems.length - 1] += '\n' + itemContent;
      } else {
        listItems.push(itemContent);
      }
      continue;
    }
    
    // Numbered list
    if (trimmed.match(/^\d+\.\s/)) {
      flushList();
      elements.push(
        <div key={key++} style={{ marginBottom: '4px', paddingLeft: '4px', color: '#D9D9D9' }}>
          {processInline(trimmed)}
        </div>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} style={{ margin: '6px 0', color: '#D9D9D9', lineHeight: 1.5 }}>
        {processInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();
  return elements;
}

export function AssistantPanel({ isOpen, onClose, context }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          setAttachedImages(prev => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (content: string, images?: string[]) => {
    if (isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      images,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          images: images || userMessage.images,
          context: context,  // Передаём контекст пользователя
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Не удалось получить ответ',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Произошла ошибка. Попробуйте ещё раз.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return;

    const content = input.trim();
    const images = attachedImages.length > 0 ? [...attachedImages] : undefined;
    
    setInput('');
    setAttachedImages([]);
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    await sendMessage(content, images);
  };

  const handleRegenerate = async (messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx <= 0) return;
    
    // Get the user message before this assistant message
    const userMessage = messages[idx - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    // Remove the assistant message we're regenerating
    const messagesWithoutCurrent = messages.filter(m => m.id !== messageId);
    setMessages(messagesWithoutCurrent);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesWithoutCurrent.map(m => ({ role: m.role, content: m.content })),
          images: userMessage.images,
          context: context,
        }),
      });

      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content || 'Не удалось получить ответ',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Произошла ошибка при регенерации.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel: 600px fixed, #151515, shadow, radius 20px */}
      <div 
        className={`fixed top-0 right-0 h-full z-[70] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ 
          width: '600px',
          maxWidth: '100vw',
          background: '#151515',
          boxShadow: isOpen ? '0px 4px 64px 0px rgba(0, 0, 0, 0.8)' : 'none',
          borderRadius: '20px 0 0 20px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header: row, center, gap 24px, padding 16px 20px */}
        <div 
          style={{ 
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '24px',
            padding: '16px 20px',
            flexShrink: 0
          }}
        >
          {/* Title container: flex 1 */}
          <div style={{ flex: 1 }}>
            {/* Title: Inter 600, 14px, lh 22px, #7E7E7E */}
            <span style={{ 
              fontFamily: 'Google Sans, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              lineHeight: '22px',
              color: '#7E7E7E'
            }}>
              BASECRAFT AI
            </span>
          </div>
          
          {/* Close wrapper: 32x32 center */}
          <div style={{ 
            width: '32px', 
            height: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            {/* Close button: 36x36, padding 8px, border #2F2F2F, radius 8px */}
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                padding: '8px',
                border: '1px solid #2F2F2F',
                borderRadius: '8px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {/* Icon: 10x10 */}
              <Image 
                src="/close-x-icon.svg" 
                alt="Close" 
                width={10} 
                height={10}
              />
            </button>
          </div>
        </div>

        {/* Content: column, gap 16px, padding 20px, flex 1 */}
        <div 
          style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            flex: '1 1 0',
            minHeight: 0
          }}
        >
          {/* Messages area: column, gap 12px, justify flex-end, flex 1, SCROLLABLE */}
          <div 
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: '1 1 0',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            {messages.length === 0 ? (
              /* Empty state */
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                {/* Center content */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  gap: '12px'
                }}>
                  {/* Logo: 57x64 */}
                  <Image src="/assistant-logo.svg" alt="" width={57} height={64} />
                  
                  {/* Text block: gap 8px */}
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%'
                  }}>
                    {/* Title: Inter 400, 20px, lh 1.3, ls -2%, #D9D9D9 */}
                    <span style={{
                      fontFamily: 'Google Sans, sans-serif',
                      fontWeight: 400,
                      fontSize: '20px',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                      color: '#D9D9D9',
                      textAlign: 'center'
                    }}>
                      Привет! Я — ваш ассистент
                    </span>
                    
                    {/* Subtitle: Inter 400, 16px, lh 1.4, ls -1%, #7E7E7E */}
                    <span style={{
                      fontFamily: 'Google Sans, sans-serif',
                      fontWeight: 400,
                      fontSize: '16px',
                      lineHeight: 1.4,
                      letterSpacing: '-0.01em',
                      color: '#7E7E7E',
                      textAlign: 'center'
                    }}>
                      Помогу с промптами, анализом картинок и вопросами
                    </span>
                  </div>
                </div>

                {/* Questions section: gap 16px */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  width: '100%'
                }}>
                  {/* Section title: Inter 400, 16px, lh 1.3, ls -1%, #D9D9D9 */}
                  <span style={{
                    fontFamily: 'Google Sans, sans-serif',
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                    color: '#D9D9D9'
                  }}>
                    Спросите меня
                  </span>
                  
                  {/* Question list: gap 10px */}
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%'
                  }}>
                    {SUGGESTIONS.map((s) => (
                      /* Question button: hug, padding 8px 12px, bg #212121, border #2E2E2E, radius 12px */
                      <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="self-start w-fit flex items-center gap-2.5 px-3 py-2 bg-[#212121] border border-[#2E2E2E] rounded-xl cursor-pointer transition-colors hover:border-white"
                      >
                        {/* Text: Inter 400, 14px, lh 1.4, ls -1%, #999999 */}
                        <span className="font-[Google_Sans,sans-serif] font-normal text-sm leading-[1.4] tracking-[-0.01em] text-[#999999]">
                          {s}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages list: column, gap 12px */
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: 'auto'
              }}>
                {messages.map((message) => (
                  message.role === 'user' ? (
                    /* USER MESSAGE: Frame 52 - column, center items-end, fill width */
                    <div 
                      key={message.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        width: '100%'
                      }}
                    >
                      {/* Frame 50: row, items-center, padding-right 12px, hug */}
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        paddingRight: '12px'
                      }}>
                        {/* Bubble: row center, gap 10px, padding 8px 12px, bg #212121, border #2E2E2E, radius 12px, max-width 356px */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: '#212121',
                          border: '1px solid #2E2E2E',
                          borderRadius: '12px',
                          maxWidth: '356px'
                        }}>
                          {/* Text: Inter 400, 14px, lh 1.4, ls -1%, left, #D9D9D9 */}
                          <span style={{
                            fontFamily: 'Google Sans, sans-serif',
                            fontWeight: 400,
                            fontSize: '14px',
                            lineHeight: 1.4,
                            letterSpacing: '-0.01em',
                            color: '#D9D9D9',
                            textAlign: 'left',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {message.content}
                          </span>
                        </div>
                      </div>
                      
                      {/* Images */}
                      {message.images && message.images.length > 0 && (
                        <div style={{ 
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          justifyContent: 'flex-end',
                          paddingRight: '12px',
                          marginTop: '8px'
                        }}>
                          {message.images.map((img, idx) => (
                            <div key={idx} style={{ 
                              width: '120px', 
                              height: '120px', 
                              borderRadius: '8px', 
                              overflow: 'hidden' 
                            }}>
                              <img src={img} alt="" style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }} />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Frame 51: row, center, gap 10px, padding 6px 14px, hug */}
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 14px'
                      }}>
                        {/* Time: Inter 400, 11px, lh 1.4, center, #7E7E7E */}
                        <span style={{
                          fontFamily: 'Google Sans, sans-serif',
                          fontWeight: 400,
                          fontSize: '11px',
                          lineHeight: 1.4,
                          color: '#7E7E7E',
                          textAlign: 'center'
                        }}>
                          {formatTimeAgo(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* ASSISTANT MESSAGE: Frame 47 - column, gap 8px, padding-left 12px */
                    <div 
                      key={message.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '8px',
                        paddingLeft: '12px',
                        width: '100%'
                      }}
                    >
                      {/* Bubble: 356px, padding 12px, gap 10px */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '12px',
                        width: '356px',
                        maxWidth: '100%',
                        background: 'rgba(23, 23, 23, 0.04)',
                        border: '1px solid #2E2E2E',
                        borderRadius: '16px'
                      }}>
                        {/* Markdown rendered content */}
                        <div style={{
                          fontFamily: 'Google Sans, sans-serif',
                          fontWeight: 400,
                          fontSize: '14px',
                          lineHeight: 1.4,
                          letterSpacing: '-0.01em',
                          textAlign: 'left',
                          width: '332px',
                          maxWidth: '100%'
                        }}>
                          {renderMarkdown(message.content)}
                        </div>
                        
                        {/* Model links - auto-detected from content */}
                        {(() => {
                          const modelLinks = getRelevantModelLinks(message.content);
                          if (modelLinks.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {modelLinks.map((link, idx) => (
                                <ModelLink 
                                  key={idx}
                                  label={link.label}
                                  modelId={link.modelId}
                                  action={link.action}
                                  docUrl={link.docUrl}
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Actions UNDER bubble: row, gap 4px */}
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '8px',
                            border: '1px solid #313131',
                            borderRadius: '10px',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          {copiedId === message.id ? (
                            <Check style={{ width: '16px', height: '16px', color: '#22c55e' }} />
                          ) : (
                            <Copy style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
                          )}
                        </button>
                        
                        {/* Refresh */}
                        <button
                          onClick={() => handleRegenerate(message.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: '8px',
                            border: '1px solid #313131',
                            borderRadius: '10px',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <RefreshCw style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
                
                {/* Loading: row, items-center, gap 6px, fill width */}
                {isLoading && (
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%'
                  }}>
                    {/* Spinner: 16x16 */}
                    <div 
                      className="animate-spin"
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderTopColor: '#FFFFFF'
                      }}
                    />
                    {/* Text: Inter 400, 12px, lh 1.4, left, #7E7E7E */}
                    <span style={{
                      fontFamily: 'Google Sans, sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: 1.4,
                      color: '#7E7E7E',
                      textAlign: 'left'
                    }}>
                      Думаю...
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area: column, gap 28px, padding 12px 16px, bg #212121, border #2B2B2B, radius 20px */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              padding: '12px 16px',
              background: '#212121',
              border: '1px solid #2B2B2B',
              borderRadius: '20px',
              flexShrink: 0
            }}
          >
            
            {/* Attached images */}
            {attachedImages.length > 0 && (
              <div style={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {attachedImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="group"
                    style={{ 
                      position: 'relative',
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '8px', 
                      overflow: 'hidden' 
                    }}
                  >
                    <img src={img} alt="" style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} />
                    <button
                      onClick={() => removeAttachedImage(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Image src="/close-x-icon.svg" alt="Remove" width={16} height={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input: Inter 400, 14px, lh 1.4, ls -1%, placeholder #999999 */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Напишите запрос..."
              className="placeholder:text-[#999999]"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'Google Sans, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: 1.4,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
                minHeight: '20px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
              rows={1}
            />

            {/* Bottom row: space-between */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}>
              {/* Left: attach button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {/* Attach: 32x32, padding 8px, border #313131, radius 10px */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: '8px',
                    border: '1px solid #313131',
                    borderRadius: '10px',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Paperclip style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
                </button>
              </div>

              {/* Right: send button */}
              <button
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '5.65px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '0.94px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Send style={{ width: '20.71px', height: '20.71px', color: '#FFFFFF' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
