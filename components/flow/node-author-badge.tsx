'use client';

import { memo, useMemo, useState } from 'react';
import Image from 'next/image';

interface NodeAuthorBadgeProps {
  email?: string;
  avatarUrl?: string;
  className?: string;
}

/**
 * Компонент отображения автора ноды
 * По дизайну Figma: квадратный аватар 24x24 (borderRadius 8px) + email
 */
function NodeAuthorBadgeComponent({ email, avatarUrl, className = '' }: NodeAuthorBadgeProps) {
  const [imageError, setImageError] = useState(false);
  
  // Не показываем если нет email
  if (!email) return null;

  // Получаем инициалы из email для fallback
  const initials = useMemo(() => {
    if (!email) return '??';
    const parts = email.split('@')[0];
    if (parts.length >= 2) {
      // Первые две буквы до @
      return parts.slice(0, 2).toUpperCase();
    }
    return parts[0]?.toUpperCase() || '??';
  }, [email]);

  // Показываем картинку если есть avatarUrl и нет ошибки загрузки
  const showImage = avatarUrl && !imageError;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Аватар - квадратный со скруглением */}
      <div 
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          backgroundColor: showImage ? 'transparent' : '#7357FF',
        }}
      >
        {showImage ? (
          <Image
            src={avatarUrl}
            alt={email}
            width={24}
            height={24}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span 
            className="text-white text-center select-none"
            style={{
              fontSize: 9,
              fontWeight: 600,
              lineHeight: '12px',
            }}
          >
            {initials}
          </span>
        )}
      </div>
      
      {/* Email */}
      <span 
        className="text-white select-none"
        style={{
          fontSize: 10,
          fontWeight: 500,
          lineHeight: '14px',
          letterSpacing: '0.015em',
          textTransform: 'uppercase',
        }}
      >
        {email}
      </span>
    </div>
  );
}

export const NodeAuthorBadge = memo(NodeAuthorBadgeComponent);
