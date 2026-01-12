/**
 * Network utilities for mobile-friendly requests
 * Handles timeouts, retries, and offline detection
 */

// Проверка онлайн статуса
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Проверка медленного соединения (Network Information API)
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (!connection) return false;
  
  // effectiveType: slow-2g, 2g, 3g, 4g
  const slowTypes = ['slow-2g', '2g', '3g'];
  return slowTypes.includes(connection.effectiveType);
}

// Получить рекомендуемый timeout на основе типа соединения
export function getRecommendedTimeout(): number {
  if (isSlowConnection()) {
    return 90000; // 90 секунд для медленного соединения (было 60)
  }
  return 45000; // 45 секунд по умолчанию (было 30)
}

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Проверка, является ли ошибка AbortError
 */
function isAbortError(error: any): boolean {
  return error?.name === 'AbortError' || 
         error?.code === 'ABORT_ERR' || 
         error?.message?.includes('aborted');
}

/**
 * Fetch с поддержкой timeout и retry
 * Поддерживает внешний signal для отмены запроса при размонтировании компонента
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = getRecommendedTimeout(),
    retries = 2,
    retryDelay = 1000,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  // Проверяем онлайн статус
  if (!isOnline()) {
    throw new NetworkError('Нет подключения к интернету', 'OFFLINE');
  }
  
  // Проверяем, не отменён ли внешний сигнал
  if (externalSignal?.aborted) {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    throw abortError;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Слушаем внешний сигнал отмены
    const externalAbortHandler = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener('abort', externalAbortHandler);
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', externalAbortHandler);
      }
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', externalAbortHandler);
      }
      
      // Если внешний сигнал отменил запрос - пробрасываем AbortError без retry
      if (externalSignal?.aborted) {
        const abortError = new Error('Request aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      
      lastError = error;

      // Если это AbortError от внешнего сигнала - не логируем как ошибку
      if (isAbortError(error)) {
        // Это может быть timeout или внешняя отмена
        // Для timeout создаём специальную ошибку
        if (!externalSignal?.aborted) {
          lastError = new NetworkError(
            'Превышено время ожидания. Проверьте соединение',
            'TIMEOUT'
          );
        } else {
          throw error; // Внешняя отмена - пробрасываем
        }
      } else {
        // Логируем только не-AbortError ошибки
        console.error(`[Network] Attempt ${attempt + 1}/${retries + 1} failed:`, {
          url: url.substring(0, 50),
          error: error.name,
          message: error.message,
          online: isOnline(),
          slowConnection: isSlowConnection(),
        });
      }

      // Если это сетевая ошибка и есть ещё попытки
      if (attempt < retries) {
        // Экспоненциальный backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`[Network] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Проверяем онлайн снова перед retry
        if (!isOnline()) {
          throw new NetworkError('Потеряно подключение к интернету', 'OFFLINE');
        }
        
        // Проверяем внешний сигнал перед retry
        if (externalSignal?.aborted) {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
      }
    }
  }

  throw lastError || new NetworkError('Неизвестная сетевая ошибка', 'UNKNOWN');
}

/**
 * Custom error class для сетевых ошибок
 */
export class NetworkError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
  }
}

/**
 * Проверить доступность API
 */
export async function checkApiHealth(baseUrl: string = ''): Promise<{
  online: boolean;
  latency?: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    // Простой запрос для проверки соединения
    const response = await fetchWithTimeout(`${baseUrl}/api/models/list`, {
      method: 'GET',
      timeout: 10000,
      retries: 0,
    });
    
    const latency = Date.now() - start;
    
    return {
      online: response.ok,
      latency,
    };
  } catch (error: any) {
    return {
      online: false,
      error: error.message,
    };
  }
}

/**
 * Hook-friendly: слушатель изменений состояния сети
 */
export function subscribeToNetworkChanges(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Диагностика сети для отладки
 */
export function getNetworkDiagnostics(): Record<string, any> {
  if (typeof navigator === 'undefined') {
    return { available: false };
  }
  
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  return {
    online: navigator.onLine,
    userAgent: navigator.userAgent,
    connection: connection ? {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    } : null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Сжать изображение для мобильного интернета
 * Более агрессивное сжатие для медленных соединений
 */
export async function compressForMobile(
  dataUrl: string,
  maxSizeKB: number = 500
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      const maxDimension = isSlowConnection() ? 1024 : 2048;
      
      // Масштабируем если нужно
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Начинаем с качества 0.8
      let quality = isSlowConnection() ? 0.6 : 0.8;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      // Уменьшаем качество пока не достигнем нужного размера
      const maxSizeBytes = maxSizeKB * 1024 * 1.33; // ~33% overhead для base64
      
      while (result.length > maxSizeBytes && quality > 0.2) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      
      console.log(`[Network] Compressed image: ${(result.length / 1024).toFixed(1)}KB, quality: ${quality.toFixed(1)}`);
      resolve(result);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Полная диагностика сети для отладки
 * Вызывать из консоли браузера: window.__networkDiagnostics()
 */
export async function runNetworkDiagnostics(): Promise<{
  summary: string;
  details: Record<string, any>;
  recommendations: string[];
}> {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    ...getNetworkDiagnostics(),
  };
  
  const recommendations: string[] = [];
  
  // Тест 1: Проверка онлайн статуса
  results.online = isOnline();
  if (!results.online) {
    recommendations.push('❌ Устройство в офлайн режиме. Проверьте подключение к интернету.');
    return {
      summary: 'OFFLINE',
      details: results,
      recommendations,
    };
  }
  
  // Тест 2: Проверка скорости соединения (Network Information API)
  results.slowConnection = isSlowConnection();
  if (results.slowConnection) {
    recommendations.push('⚠️ Обнаружено медленное соединение. Рекомендуется использовать WiFi для загрузки изображений.');
  }
  
  // Тест 3: Замер латентности к API
  const latencyTests: number[] = [];
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    try {
      const response = await fetch('/api/health', { 
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        latencyTests.push(Date.now() - start);
      }
    } catch (e) {
      latencyTests.push(-1); // Ошибка
    }
  }
  
  const successfulTests = latencyTests.filter(t => t > 0);
  results.latencyTests = latencyTests;
  results.avgLatency = successfulTests.length > 0 
    ? Math.round(successfulTests.reduce((a, b) => a + b, 0) / successfulTests.length)
    : null;
  results.failedTests = latencyTests.filter(t => t < 0).length;
  
  if (results.failedTests > 0) {
    recommendations.push(`❌ ${results.failedTests} из 3 тестовых запросов не выполнены. Возможны проблемы с соединением.`);
  }
  
  if (results.avgLatency && results.avgLatency > 1000) {
    recommendations.push(`⚠️ Высокая латентность (${results.avgLatency}ms). Загрузка может быть медленной.`);
  } else if (results.avgLatency && results.avgLatency > 500) {
    recommendations.push(`⚠️ Средняя латентность (${results.avgLatency}ms). Возможны задержки при загрузке.`);
  }
  
  // Тест 4: Проверка Supabase
  try {
    const start = Date.now();
    const response = await fetch('/api/generations/list?limit=1', {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    });
    results.supabaseLatency = Date.now() - start;
    results.supabaseStatus = response.status;
    
    if (!response.ok) {
      if (response.status === 401) {
        recommendations.push('⚠️ Не авторизован. Попробуйте перелогиниться.');
      } else {
        recommendations.push(`❌ Ошибка API: ${response.status}`);
      }
    }
  } catch (e: any) {
    results.supabaseError = e.message;
    recommendations.push('❌ Не удалось подключиться к API. Проверьте соединение.');
  }
  
  // Итоговая оценка
  let summary = 'OK';
  if (!results.online) {
    summary = 'OFFLINE';
  } else if (results.failedTests >= 2 || results.supabaseError) {
    summary = 'CRITICAL';
  } else if (results.slowConnection || results.avgLatency > 1000 || results.failedTests > 0) {
    summary = 'DEGRADED';
  }
  
  // Общие рекомендации
  if (summary === 'CRITICAL' || summary === 'DEGRADED') {
    recommendations.push('💡 Попробуйте: 1) Перезагрузить страницу 2) Проверить VPN 3) Использовать WiFi вместо мобильного интернета');
  }
  
  console.log('=== Network Diagnostics ===');
  console.log('Summary:', summary);
  console.log('Details:', results);
  console.log('Recommendations:', recommendations);
  
  return {
    summary,
    details: results,
    recommendations,
  };
}

// Экспортируем в window для доступа из консоли
if (typeof window !== 'undefined') {
  (window as any).__networkDiagnostics = runNetworkDiagnostics;
  (window as any).__networkInfo = getNetworkDiagnostics;
}

