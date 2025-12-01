/**
 * Network utilities для оптимизации загрузки на медленных сетях
 * 
 * КРИТИЧНО: Все функции СИНХРОННЫЕ - не блокируют рендер!
 */

// Типы для Network Information API
interface NetworkInformation extends EventTarget {
  downlink: number;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt: number;
  saveData: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Получить информацию о сети
 */
export function getNetworkInfo(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/**
 * Определить качество сети
 */
export type NetworkQuality = 'slow' | 'medium' | 'fast';

export function getNetworkQuality(): NetworkQuality {
  const connection = getNetworkInfo();
  
  if (!connection) {
    return 'medium';
  }
  
  if (connection.saveData) {
    return 'slow';
  }
  
  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'medium';
    case '4g':
    default:
      return 'fast';
  }
}

/**
 * Проверить, мобильное ли устройство
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 1024;
  
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  return isMobileUA || (isTouchDevice && isSmallScreen);
}

/**
 * Получить интервал polling в зависимости от качества сети
 */
export function getPollingInterval(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 30000; // 30 сек
    case 'medium':
      return 15000; // 15 сек
    case 'fast':
    default:
      return 5000; // 5 сек
  }
}

/**
 * Получить интервал polling для статуса генерации
 */
export function getGenerationPollingInterval(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 15000;
    case 'medium':
      return 8000;
    case 'fast':
    default:
      return 4000;
  }
}

/**
 * Получить качество изображений для Next.js Image
 */
export function getImageQuality(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 50;
    case 'medium':
      return 70;
    case 'fast':
    default:
      return 85;
  }
}

/**
 * Проверить, видима ли страница
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Проверить, медленная ли сеть
 */
export function isSlowNetwork(): boolean {
  return getNetworkQuality() === 'slow';
}

/**
 * Должны ли мы использовать прокси для изображений?
 * 
 * СИНХРОННАЯ функция!
 * 
 * Логика: На мобильных устройствах с мобильным интернетом (не WiFi)
 * replicate.delivery может быть заблокирован провайдером.
 */
export function shouldUseImageProxy(): boolean {
  if (typeof window === 'undefined') return false;
  
  const connection = getNetworkInfo();
  
  // Если мобильное устройство + есть признаки мобильной сети
  if (isMobileDevice()) {
    if (connection) {
      // На 3G и ниже - всегда прокси
      if (connection.effectiveType !== '4g') {
        return true;
      }
      // Режим экономии данных
      if (connection.saveData) {
        return true;
      }
      // Высокий RTT (>100ms) - признак мобильной сети
      if (connection.rtt > 100) {
        return true;
      }
    }
    // Если нет connection API на мобильном - безопаснее использовать прокси
    return !connection;
  }
  
  return false;
}

/**
 * Преобразовать URL изображения через прокси если нужно
 */
export function getProxiedImageUrl(url: string, forceProxy?: boolean): string {
  if (!url) return url;
  
  // Не проксируем data: URLs и уже проксированные
  if (url.startsWith('data:') || url.startsWith('/api/proxy/')) {
    return url;
  }
  
  const shouldProxy = forceProxy ?? shouldUseImageProxy();
  
  // Проксируем только replicate URLs
  if (shouldProxy && (url.includes('replicate.delivery') || url.includes('pbxt.replicate'))) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}
