import { createServiceRoleClient } from '../supabase/server';

/**
 * Token Pool Manager для распределения нагрузки между токенами Replicate
 */
export class ReplicateTokenPool {
  private static instance: ReplicateTokenPool;

  private constructor() {}

  static getInstance(): ReplicateTokenPool {
    if (!ReplicateTokenPool.instance) {
      ReplicateTokenPool.instance = new ReplicateTokenPool();
    }
    return ReplicateTokenPool.instance;
  }

  /**
   * Получить следующий доступный токен из пула
   */
  async getNextToken(): Promise<{ id: number; token: string } | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('get_next_replicate_token');

    if (error || !data || data.length === 0) {
      console.error('Error getting next token:', error);
      return null;
    }

    return data[0];
  }

  /**
   * Пометить токен как ошибочный
   */
  async reportTokenError(tokenId: number, errorMessage: string): Promise<void> {
    const supabase = createServiceRoleClient();

    // Получаем текущий токен
    const { data: token } = await supabase
      .from('replicate_tokens')
      .select('error_count')
      .eq('id', tokenId)
      .single();

    // Обновляем с инкрементом
    await supabase
      .from('replicate_tokens')
      .update({
        error_count: (token?.error_count || 0) + 1,
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', tokenId);
  }

  /**
   * Деактивировать токен (при критических ошибках)
   */
  async deactivateToken(tokenId: number): Promise<void> {
    const supabase = createServiceRoleClient();

    await supabase
      .from('replicate_tokens')
      .update({ is_active: false })
      .eq('id', tokenId);
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
}

