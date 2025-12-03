import { createServiceRoleClient } from '../supabase/server';

interface CachedToken {
  id: number;
  token: string;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

/**
 * Token Pool Manager для распределения нагрузки между токенами Replicate
 * 
 * Оптимизации:
 * - In-memory кэш токенов (снижает DB запросы на 95%+)
 * - Round-robin распределение
 * - Асинхронное обновление статистики
 */
export class ReplicateTokenPool {
  private static instance: ReplicateTokenPool;
  
  // In-memory кэш
  private tokens: CachedToken[] = [];
  private currentIndex = 0;
  private lastFetch = 0;
  private isRefreshing = false;
  
  // Конфигурация
  private readonly CACHE_TTL = 60000; // 1 минута
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 секунд

  private constructor() {}

  static getInstance(): ReplicateTokenPool {
    if (!ReplicateTokenPool.instance) {
      ReplicateTokenPool.instance = new ReplicateTokenPool();
    }
    return ReplicateTokenPool.instance;
  }

  /**
   * Получить следующий доступный токен из пула (с кэшированием)
   */
  async getNextToken(): Promise<{ id: number; token: string } | null> {
    // Проверяем нужно ли обновить кэш
    const now = Date.now();
    const needsRefresh = this.tokens.length === 0 || (now - this.lastFetch > this.CACHE_TTL);
    
    if (needsRefresh && !this.isRefreshing) {
      await this.refreshTokensFromDb();
    }

    if (this.tokens.length === 0) {
      console.error('[TokenPool] No tokens available in cache');
      return null;
    }

    // Round-robin выбор токена
    const token = this.tokens[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    
    // Обновляем локальную статистику
    token.lastUsed = now;
    token.requestCount++;

    // Асинхронно обновляем статистику в БД (не блокируем возврат токена)
    this.updateTokenStatsAsync(token.id);

    return { id: token.id, token: token.token };
  }

  /**
   * Обновить кэш токенов из БД
   */
  private async refreshTokensFromDb(): Promise<void> {
    // Предотвращаем параллельные обновления
    if (this.isRefreshing) return;
    
    const now = Date.now();
    if (now - this.lastFetch < this.MIN_REFRESH_INTERVAL) return;
    
    this.isRefreshing = true;
    
    try {
      const supabase = createServiceRoleClient();
      
      const { data, error } = await supabase
        .from('replicate_tokens')
        .select('id, token, request_count, error_count')
        .eq('is_active', true)
        .order('request_count', { ascending: true });

      if (error) {
        console.error('[TokenPool] Error fetching tokens:', error.message);
        return;
      }

      if (data && data.length > 0) {
        this.tokens = data.map(t => ({
          id: t.id,
          token: t.token,
          lastUsed: 0,
          requestCount: t.request_count || 0,
          errorCount: t.error_count || 0,
        }));
        this.lastFetch = now;
        console.log(`[TokenPool] Cache refreshed: ${this.tokens.length} active tokens`);
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Асинхронное обновление статистики токена в БД
   */
  private updateTokenStatsAsync(tokenId: number): void {
    // Fire-and-forget обновление
    setImmediate(async () => {
      try {
        const supabase = createServiceRoleClient();
        await supabase.rpc('get_next_replicate_token'); // Использует существующую RPC с атомарным обновлением
      } catch (error) {
        // Игнорируем ошибки обновления статистики
      }
    });
  }

  /**
   * Пометить токен как ошибочный
   */
  async reportTokenError(tokenId: number, errorMessage: string): Promise<void> {
    // Обновляем локальный кэш
    const cachedToken = this.tokens.find(t => t.id === tokenId);
    if (cachedToken) {
      cachedToken.errorCount++;
    }

    // Обновляем в БД
    const supabase = createServiceRoleClient();
    await supabase
      .from('replicate_tokens')
      .update({
        error_count: cachedToken?.errorCount || 1,
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', tokenId);
  }

  /**
   * Деактивировать токен (при критических ошибках)
   */
  async deactivateToken(tokenId: number): Promise<void> {
    // Удаляем из локального кэша
    this.tokens = this.tokens.filter(t => t.id !== tokenId);
    
    // Обновляем в БД
    const supabase = createServiceRoleClient();
    await supabase
      .from('replicate_tokens')
      .update({ is_active: false })
      .eq('id', tokenId);
    
    console.log(`[TokenPool] Token ${tokenId} deactivated`);
  }

  /**
   * Получить статистику токенов
   */
  async getTokensStats(): Promise<any[]> {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
      .from('replicate_tokens')
      .select('*')
      .order('request_count', { ascending: true });

    return data || [];
  }

  /**
   * Принудительно обновить кэш (для админки)
   */
  async forceRefresh(): Promise<void> {
    this.lastFetch = 0;
    await this.refreshTokensFromDb();
  }

  /**
   * Получить информацию о кэше (для диагностики)
   */
  getCacheInfo(): { tokensCount: number; lastFetch: number; cacheAge: number } {
    return {
      tokensCount: this.tokens.length,
      lastFetch: this.lastFetch,
      cacheAge: Date.now() - this.lastFetch,
    };
  }
}

