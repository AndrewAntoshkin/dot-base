import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './types';
import { getSupabaseUrl } from './proxy';

/**
 * Создаёт Supabase клиент для сервера (с cookies)
 * Автоматически использует прокси если он настроен
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();

  return createServerClient<Database>(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Отключаем автоматический refresh на сервере
        // чтобы избежать запросов к заблокированному Supabase
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
    }
  );
}

/**
 * Singleton Service Role Client
 * Повторно использует одно подключение для всех admin операций
 * Снижает latency и нагрузку на Supabase
 * Автоматически использует прокси если он настроен
 */
let serviceRoleClientInstance: SupabaseClient<Database> | null = null;
let lastServiceRoleUrl: string | null = null;

export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  
  // Пересоздаём клиент если URL изменился (например, переключились на прокси)
  if (!serviceRoleClientInstance || lastServiceRoleUrl !== url) {
    serviceRoleClientInstance = createClient<Database>(
      url,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    lastServiceRoleUrl = url;
  }
  return serviceRoleClientInstance;
}

// Alias для обратной совместимости
export const getServiceRoleClient = createServiceRoleClient;




