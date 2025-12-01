/**
 * Network utilities для оптимизации загрузки на медленных сетях
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
    // Если API недоступен, считаем сеть средней
    return 'medium';
  }
  
  // Режим экономии данных - всегда slow
  if (connection.saveData) {
    return 'slow';
  }
  
  // По типу соединения
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
 * Получить оптимальный интервал polling в зависимости от качества сети
 * На медленных сетях polling реже, чтобы не забивать канал
 */
export function getPollingInterval(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 30000; // 30 сек на плохой сети
    case 'medium':
      return 15000; // 15 сек на 3G
    case 'fast':
    default:
      return 5000; // 5 сек на быстрой сети
  }
}

/**
 * Получить оптимальный интервал polling для статуса генерации
 * (отдельно, так как тут важнее реактивность)
 */
export function getGenerationPollingInterval(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 15000; // 15 сек на плохой сети
    case 'medium':
      return 8000;  // 8 сек на 3G
    case 'fast':
    default:
      return 4000;  // 4 сек на быстрой сети
  }
}

/**
 * Получить качество изображений для Next.js Image в зависимости от сети
 * Меньше качество = меньше трафик
 */
export function getImageQuality(quality?: NetworkQuality): number {
  const networkQuality = quality ?? getNetworkQuality();
  
  switch (networkQuality) {
    case 'slow':
      return 50; // Низкое качество на плохой сети
    case 'medium':
      return 70; // Среднее качество
    case 'fast':
    default:
      return 85; // Высокое качество
  }
}

/**
 * Подписаться на изменения качества сети
 */
export function subscribeToNetworkChanges(callback: (quality: NetworkQuality) => void): () => void {
  const connection = getNetworkInfo();
  
  if (!connection) {
    return () => {}; // Noop если API недоступен
  }
  
  const handler = () => {
    callback(getNetworkQuality());
  };
  
  connection.addEventListener('change', handler);
  
  return () => {
    connection.removeEventListener('change', handler);
  };
}

/**
 * Проверить, видима ли страница (для остановки polling в фоне)
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/**
 * Подписаться на изменения видимости страницы
 */
export function subscribeToVisibilityChanges(callback: (isVisible: boolean) => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }
  
  const handler = () => {
    callback(isPageVisible());
  };
  
  document.addEventListener('visibilitychange', handler);
  
  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
}

/**
 * Проверить, медленная ли сеть
 */
export function isSlowNetwork(): boolean {
  return getNetworkQuality() === 'slow';
}

/**
 * Домены которые могут блокироваться провайдерами
 */
const BLOCKED_DOMAINS = [
  'replicate.delivery',
  'pbxt.replicate.delivery',
];

/**
 * Проверить, нужно ли проксировать URL
 * Возвращает true если URL может быть заблокирован
 */
export function shouldProxyUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return BLOCKED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Преобразовать URL изображения через прокси
 * Используется для обхода блокировок на мобильном интернете
 */
export function getProxiedImageUrl(url: string, forceProxy = false): string {
  if (!url) return url;
  
  // Не проксируем data: URLs
  if (url.startsWith('data:')) return url;
  
  // Проксируем если URL потенциально заблокирован или принудительно
  if (forceProxy || shouldProxyUrl(url)) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}

/**
 * Проверить доступность внешнего URL (для диагностики блокировок)
 * Возвращает true если URL доступен напрямую
 */
export async function checkUrlAccessibility(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Избегаем CORS ошибок
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Хук для хранения состояния необходимости прокси
 * Проверяет при первом вызове и кэширует результат
 */
let proxyNeeded: boolean | null = null;
let proxyCheckPromise: Promise<boolean> | null = null;

export async function isProxyNeeded(): Promise<boolean> {
  // Если уже проверяли - возвращаем кэшированный результат
  if (proxyNeeded !== null) {
    return proxyNeeded;
  }
  
  // Если проверка уже идёт - ждём её
  if (proxyCheckPromise) {
    return proxyCheckPromise;
  }
  
  // Запускаем проверку
  proxyCheckPromise = (async () => {
    // Тестовый URL с replicate.delivery
    const testUrl = 'https://replicate.delivery/';
    const accessible = await checkUrlAccessibility(testUrl, 3000);
    proxyNeeded = !accessible;
    
    if (proxyNeeded) {
      console.log('[Network] Replicate CDN blocked, will use proxy');
    }
    
    return proxyNeeded;
  })();
  
  return proxyCheckPromise;
}

