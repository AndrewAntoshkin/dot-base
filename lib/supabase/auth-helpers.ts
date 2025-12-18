import { cache } from 'react';
import { createServerSupabaseClient, createServiceRoleClient } from './server';
import type { UserRole } from '@/contexts/user-context';

export interface AuthUser {
  id: string;
  email: string;
}

export interface DbUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  user: AuthUser | null;
  dbUser: DbUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Кэшированная функция получения auth пользователя
 * React cache() дедуплицирует вызовы в рамках одного request
 * Это значит что layout.tsx, page.tsx и компоненты получат один и тот же результат
 * без дополнительных запросов к Supabase
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || !user.email) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('[Auth] getAuthUser error:', error);
    return null;
  }
});

/**
 * Кэшированная функция получения пользователя из нашей БД
 * Включает роль пользователя
 */
export const getDbUser = cache(async (email: string): Promise<DbUser | null> => {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .single() as { data: { id: string; email: string; role: string } | null; error: any };
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      email: data.email,
      role: (data.role as UserRole) || 'user',
    };
  } catch (error) {
    console.error('[Auth] getDbUser error:', error);
    return null;
  }
});

/**
 * Полная проверка авторизации - комбинирует auth + DB user
 * Использует кэширование для дедупликации
 */
export const getFullAuth = cache(async (): Promise<AuthResult> => {
  const user = await getAuthUser();
  
  if (!user) {
    return {
      user: null,
      dbUser: null,
      isAuthenticated: false,
      isAdmin: false,
    };
  }
  
  const dbUser = await getDbUser(user.email);
  
  return {
    user,
    dbUser,
    isAuthenticated: true,
    isAdmin: dbUser?.role === 'admin' || dbUser?.role === 'super_admin',
  };
});

/**
 * Быстрая проверка - только auth, без DB lookup
 * Используется когда не нужна роль
 */
export const checkAuth = cache(async (): Promise<{ isAuthenticated: boolean; email: string | null }> => {
  const user = await getAuthUser();
  return {
    isAuthenticated: !!user,
    email: user?.email || null,
  };
});
