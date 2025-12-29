import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';
import { getSupabaseUrl } from './proxy';

/**
 * Создаёт Supabase клиент для браузера
 * Автоматически использует прокси если он настроен (для обхода гео-блокировок)
 */
export function createClient() {
  const url = getSupabaseUrl();
  
  return createBrowserClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Включаем auto refresh, но через прокси URL
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}

/**
 * Создаёт Supabase клиент с прямым подключением (без прокси)
 * Использовать когда точно известно что прокси не нужен
 */
export function createDirectClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}



















