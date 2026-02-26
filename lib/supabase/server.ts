import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './types';

// Timeout для Supabase запросов — предотвращает бесконечно висящие промисы
// при замедлении/отказе Supabase, которые вызывают OOM + CPU spike
const SUPABASE_FETCH_TIMEOUT_MS = 10_000;          // 10 сек — auth, DB queries
const SUPABASE_STORAGE_TIMEOUT_MS = 300_000;        // 5 мин — upload/download файлов (видео до 500MB при upscale)

/**
 * Fetch-обёртка с AbortSignal.timeout.
 * Передаётся в Supabase через global.fetch — все запросы автоматически
 * получают timeout без изменения кода в 45+ route-файлах.
 *
 * Storage операции (upload/download) получают увеличенный timeout (120 сек),
 * т.к. загрузка видео/изображений может быть медленной.
 *
 * Использование в route-файлах с inline createServerClient:
 *   import { supabaseTimeoutFetch } from '@/lib/supabase/server';
 *   createServerClient(url, key, { ..., global: { fetch: supabaseTimeoutFetch } })
 */
export function supabaseTimeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Если вызывающий код уже передал signal — не перезаписываем
  if (init?.signal) {
    return fetch(input, init);
  }

  // Storage upload/download — увеличенный timeout
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isStorage = url.includes('/storage/v1/object');
  const timeout = isStorage ? SUPABASE_STORAGE_TIMEOUT_MS : SUPABASE_FETCH_TIMEOUT_MS;

  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(timeout),
  });
}

/**
 * Создаёт Supabase клиент для сервера (с cookies)
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server component can't set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server component can't remove cookies
          }
        },
      },
      global: {
        fetch: supabaseTimeoutFetch,
      },
    }
  );
}

/**
 * Singleton Service Role Client
 * Повторно использует одно подключение для всех admin операций
 */
let serviceRoleClientInstance: SupabaseClient<Database> | null = null;

export function createServiceRoleClient(): SupabaseClient<Database> {
  if (!serviceRoleClientInstance) {
    serviceRoleClientInstance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: supabaseTimeoutFetch,
        },
      }
    );
  }
  return serviceRoleClientInstance;
}

// Alias для обратной совместимости
export const getServiceRoleClient = createServiceRoleClient;
