import { createServiceRoleClient } from './server';

/**
 * Создаёт Supabase клиент с правами администратора (service role)
 * Используется для операций, которые должны обходить RLS
 */
export function createAdminSupabaseClient() {
  return createServiceRoleClient();
}

// Alias
export const getAdminSupabaseClient = createAdminSupabaseClient;
