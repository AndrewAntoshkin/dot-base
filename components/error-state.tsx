'use client';

import { AlertCircle, RefreshCw, Settings2, Sparkles, WifiOff, Clock, Shield, Server } from 'lucide-react';

export type ErrorType = 
  | 'generic'      // Общая ошибка
  | 'timeout'      // Превышено время
  | 'safety'       // Фильтр безопасности
  | 'overload'     // Сервер перегружен
  | 'network'      // Проблемы с сетью
  | 'params'       // Некорректные параметры
  | 'resources';   // Недостаточно ресурсов

interface ErrorStateProps {
  title?: string;
  description?: string;
  errorMessage?: string;
  retryCount?: number;
  onRetry?: () => void;
  onChangeParams?: () => void;
  onChangeModel?: () => void;
  isMobile?: boolean;
}

/**
 * Определяет тип ошибки по сообщению
 */
function getErrorType(message: string | undefined): ErrorType {
  if (!message) return 'generic';
  
  const msg = message.toLowerCase();
  
  if (msg.includes('фильтр') || msg.includes('безопасност') || msg.includes('заблокирован') || msg.includes('nsfw') || msg.includes('safety')) {
    return 'safety';
  }
  if (msg.includes('время') || msg.includes('timeout') || msg.includes('превышено')) {
    return 'timeout';
  }
  if (msg.includes('перегружен') || msg.includes('overload') || msg.includes('много запросов')) {
    return 'overload';
  }
  if (msg.includes('сеть') || msg.includes('подключени') || msg.includes('network') || msg.includes('connection')) {
    return 'network';
  }
  if (msg.includes('параметр') || msg.includes('некорректн') || msg.includes('invalid')) {
    return 'params';
  }
  if (msg.includes('ресурс') || msg.includes('память') || msg.includes('разрешени') || msg.includes('memory')) {
    return 'resources';
  }
  
  return 'generic';
}

/**
 * Возвращает данные для отображения по типу ошибки
 */
function getErrorData(type: ErrorType) {
  switch (type) {
    case 'safety':
      return {
        icon: Shield,
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        title: 'Контент заблокирован',
        suggestion: 'Попробуйте изменить промпт или выбрать другую модель',
      };
    case 'timeout':
      return {
        icon: Clock,
        iconColor: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        title: 'Превышено время',
        suggestion: 'Уменьшите разрешение или длительность и попробуйте снова',
      };
    case 'overload':
      return {
        icon: Server,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        title: 'Сервер перегружен',
        suggestion: 'Подождите несколько минут и попробуйте снова',
      };
    case 'network':
      return {
        icon: WifiOff,
        iconColor: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        title: 'Проблемы с сетью',
        suggestion: 'Проверьте интернет-соединение и попробуйте снова',
      };
    case 'params':
      return {
        icon: Settings2,
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        title: 'Некорректные параметры',
        suggestion: 'Проверьте настройки и попробуйте с другими значениями',
      };
    case 'resources':
      return {
        icon: AlertCircle,
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        title: 'Недостаточно ресурсов',
        suggestion: 'Уменьшите разрешение или выберите модель полегче',
      };
    default:
      return {
        icon: AlertCircle,
        iconColor: 'text-red-500',
        bgColor: 'bg-red-500/10',
        title: 'Ошибка генерации',
        suggestion: 'Попробуйте другую модель или измените параметры',
      };
  }
}

export function ErrorState({
  title,
  description,
  errorMessage,
  retryCount,
  onRetry,
  onChangeParams,
  onChangeModel,
  isMobile = false,
}: ErrorStateProps) {
  const errorType = getErrorType(errorMessage);
  const errorData = getErrorData(errorType);
  const Icon = errorData.icon;
  
  const hasActions = onRetry || onChangeParams || onChangeModel;
  
  return (
    <div className={`flex items-center justify-center ${isMobile ? 'flex-1 min-h-[400px]' : 'min-h-[660px]'}`}>
      <div className={`flex flex-col items-center max-w-md px-6 py-8 ${isMobile ? 'bg-[#131313] rounded-2xl w-full' : ''}`}>
        {/* Indicator */}
        <div className={`w-16 h-16 rounded-full ${errorData.bgColor} flex items-center justify-center mb-6`}>
          <Icon className={`w-8 h-8 ${errorData.iconColor}`} />
        </div>
        
        {/* Title */}
        <h3 className="font-inter font-semibold text-lg text-white mb-2 text-center">
          {title || errorData.title}
        </h3>
        
        {/* Description */}
        <p className="font-inter text-sm text-[#959595] text-center mb-2">
          {description || errorMessage || 'Произошла непредвиденная ошибка'}
        </p>
        
        {/* Suggestion */}
        <p className="font-inter text-xs text-[#656565] text-center mb-6">
          {errorData.suggestion}
        </p>
        
        {/* Retry count badge */}
        {retryCount && retryCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1a1a] rounded-full mb-6">
            <RefreshCw className="w-3 h-3 text-[#6366F1]" />
            <span className="font-inter text-xs text-[#959595]">
              После {retryCount} {retryCount === 1 ? 'попытки' : retryCount < 5 ? 'попыток' : 'попыток'}
            </span>
          </div>
        )}
        
        {/* Actions */}
        {hasActions && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black font-inter font-medium text-sm rounded-xl hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Попробовать снова
              </button>
            )}
            {onChangeParams && (
              <button
                onClick={onChangeParams}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f1f1f] text-white font-inter font-medium text-sm rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2f2f2f]"
              >
                <Settings2 className="w-4 h-4" />
                Настройки
              </button>
            )}
            {onChangeModel && (
              <button
                onClick={onChangeModel}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1f1f1f] text-white font-inter font-medium text-sm rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2f2f2f]"
              >
                <Sparkles className="w-4 h-4" />
                Другая модель
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
