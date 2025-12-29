/**
 * Supabase Proxy Utility
 * 
 * Автоматически определяет нужно ли использовать прокси для Supabase
 * и предоставляет правильный URL.
 * 
 * Прокси нужен когда:
 * - Пользователь находится в стране с блокировкой Supabase (Россия)
 * - Задана переменная NEXT_PUBLIC_SUPABASE_PROXY_URL
 */

// Кэш для результата проверки доступности
let connectivityCheckResult: boolean | null = null;
let lastCheckTime = 0;
const CHECK_CACHE_TTL = 60000; // 1 минута

/**
 * Получить URL для Supabase (оригинальный или прокси)
 */
export function getSupabaseUrl(): string {
  const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  // Если прокси не настроен, используем оригинальный URL
  if (!proxyUrl) {
    return originalUrl;
  }
  
  // На сервере всегда используем прокси если он есть
  // (серверы в Vercel не заблокированы, но для единообразия)
  if (typeof window === 'undefined') {
    // На сервере можно попробовать напрямую, если не работает - использовать прокси
    // Но для простоты пока используем прокси везде если он настроен
    return proxyUrl;
  }
  
  // На клиенте используем прокси если он настроен
  return proxyUrl;
}

/**
 * Получить оригинальный Supabase URL (для случаев когда прокси не нужен)
 */
export function getOriginalSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

/**
 * Проверить доступен ли Supabase напрямую
 * Кэширует результат на 1 минуту
 */
export async function isSupabaseDirectlyAccessible(): Promise<boolean> {
  const now = Date.now();
  
  // Возвращаем кэшированный результат если он свежий
  if (connectivityCheckResult !== null && now - lastCheckTime < CHECK_CACHE_TTL) {
    return connectivityCheckResult;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    );
    
    clearTimeout(timeoutId);
    connectivityCheckResult = response.ok || response.status === 400; // 400 is expected without table
    lastCheckTime = now;
    return connectivityCheckResult;
    
  } catch (error) {
    connectivityCheckResult = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Выбрать лучший URL на основе доступности
 * Используется для динамического переключения
 */
export async function getBestSupabaseUrl(): Promise<string> {
  const proxyUrl = process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  
  // Если прокси не настроен, используем оригинальный
  if (!proxyUrl) {
    return originalUrl;
  }
  
  // Проверяем доступность напрямую
  const isDirectAccessible = await isSupabaseDirectlyAccessible();
  
  if (isDirectAccessible) {
    return originalUrl;
  }
  
  return proxyUrl;
}

/**
 * Получить конфигурацию для Supabase клиента с учётом прокси
 */
export function getSupabaseConfig() {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return {
    url,
    anonKey,
    isProxy: url !== process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

/**
 * Сбросить кэш проверки доступности
 * Вызывать при смене сети или после ошибок
 */
export function resetConnectivityCache(): void {
  connectivityCheckResult = null;
  lastCheckTime = 0;
}

