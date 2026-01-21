'use client';

import { memo, useMemo } from 'react';

interface NodeAuthorBadgeProps {
  email?: string;
  className?: string;
}

/**
 * Компонент отображения автора ноды
 * По дизайну Figma: аватар с инициалами + email
 */
function NodeAuthorBadgeComponent({ email, className = '' }: NodeAuthorBadgeProps) {
  // Не показываем если нет email
  if (!email) return null;

  // Получаем инициалы из email
  const initials = useMemo(() => {
    if (!email) return '??';
    const parts = email.split('@')[0];
    if (parts.length >= 2) {
      // Первые две буквы до @
      return parts.slice(0, 2).toUpperCase();
    }
    return parts[0]?.toUpperCase() || '??';
  }, [email]);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Аватар с инициалами */}
      <div 
        className="flex items-center justify-center rounded-full"
        style={{
          width: 24,
          height: 24,
          backgroundColor: '#7357FF',
          border: '1.5px solid #101010',
        }}
      >
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
