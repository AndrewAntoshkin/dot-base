import { createServiceRoleClient } from '../supabase/server';
import logger from '@/lib/logger';

interface CachedToken {
  id: number;
  token: string;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
}

interface TokenRecord {
  id: number;
  token: string;
  request_count: number;
  error_count: number;
  is_active?: boolean;
}

/**
 * Token Pool Manager - распределение нагрузки между токенами Replicate
 * In-memory кэш + Round-robin + Асинхронное обновление статистики
 */
export class ReplicateTokenPool {
  private static instance: ReplicateTokenPool;
  
  private tokens: CachedToken[] = [];
  private currentIndex = 0;
  private lastFetch = 0;
  private isRefreshing = false;
  
  private readonly CACHE_TTL = 60000; // 1 minute
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): ReplicateTokenPool {
    if (!ReplicateTokenPool.instance) {
      ReplicateTokenPool.instance = new ReplicateTokenPool();
    }
    return ReplicateTokenPool.instance;
  }

  async getNextToken(): Promise<{ id: number; token: string } | null> {
    const now = Date.now();
    const needsRefresh = this.tokens.length === 0 || (now - this.lastFetch > this.CACHE_TTL);
    
    if (needsRefresh && !this.isRefreshing) {
      await this.refreshTokensFromDb();
    }

    if (this.tokens.length === 0) {
      logger.error('No tokens available');
      return null;
    }

    const token = this.tokens[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    
    token.lastUsed = now;
    token.requestCount++;

    this.updateTokenStatsAsync(token.id);

    return { id: token.id, token: token.token };
  }

  private async refreshTokensFromDb(): Promise<void> {
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
        logger.error('Error fetching tokens:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const tokens = data as TokenRecord[];
        this.tokens = tokens.map(t => ({
          id: t.id,
          token: t.token,
          lastUsed: 0,
          requestCount: t.request_count || 0,
          errorCount: t.error_count || 0,
        }));
        this.lastFetch = now;
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  private updateTokenStatsAsync(tokenId: number): void {
    setImmediate(async () => {
      try {
        const supabase = createServiceRoleClient();
        await supabase.rpc('get_next_replicate_token');
      } catch {}
    });
  }

  async reportTokenError(tokenId: number, errorMessage: string): Promise<void> {
    const cachedToken = this.tokens.find(t => t.id === tokenId);
    if (cachedToken) {
      cachedToken.errorCount++;
    }

    const supabase = createServiceRoleClient();
    await (supabase.from('replicate_tokens') as any)
      .update({
        error_count: cachedToken?.errorCount || 1,
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', tokenId);
  }

  async deactivateToken(tokenId: number): Promise<void> {
    this.tokens = this.tokens.filter(t => t.id !== tokenId);
    
    const supabase = createServiceRoleClient();
    await (supabase.from('replicate_tokens') as any)
      .update({ is_active: false })
      .eq('id', tokenId);
    
    logger.warn('Token deactivated:', tokenId);
  }

  async getTokensStats(): Promise<any[]> {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('replicate_tokens')
      .select('*')
      .order('request_count', { ascending: true });
    return data || [];
  }

  async forceRefresh(): Promise<void> {
    this.lastFetch = 0;
    await this.refreshTokensFromDb();
  }

  getCacheInfo(): { tokensCount: number; lastFetch: number; cacheAge: number } {
    return {
      tokensCount: this.tokens.length,
      lastFetch: this.lastFetch,
      cacheAge: Date.now() - this.lastFetch,
    };
  }
}
