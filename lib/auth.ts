/**
 * Централизованный модуль авторизации
 * Снижает дублирование кода в API routes
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from './supabase/server';

export interface AuthUser {
  id: string;
  email: string;
  dbUserId: string;
  role: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: NextResponse | null;
}

/**
 * Получить текущего пользователя из сессии
 * Используйте вместо дублирования кода авторизации в каждом API route
 * 
 * @example
 * const { user, error } = await getAuthUser();
 * if (error) return error;
 * // user гарантированно не null
 */
export async function getAuthUser(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component can't set cookies
            }
          },
        },
      }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    // Получаем пользователя из нашей БД
    const serviceClient = createServiceRoleClient();
    const { data: dbUser } = await serviceClient
      .from('users')
      .select('id, role')
      .eq('email', authUser.email.toLowerCase())
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return {
        user: null,
        error: NextResponse.json({ error: 'User not found' }, { status: 404 }),
      };
    }

    return {
      user: {
        id: authUser.id,
        email: authUser.email,
        dbUserId: dbUser.id,
        role: dbUser.role,
      },
      error: null,
    };
  } catch (err) {
    console.error('Auth error:', err);
    return {
      user: null,
      error: NextResponse.json({ error: 'Auth failed' }, { status: 500 }),
    };
  }
}

/**
 * Проверить, что пользователь авторизован и является админом
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await getAuthUser();
  
  if (result.error) return result;
  
  if (!result.user || !['admin', 'super_admin'].includes(result.user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
    };
  }
  
  return result;
}

/**
 * Проверить, что пользователь является super_admin
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const result = await getAuthUser();
  
  if (result.error) return result;
  
  if (!result.user || result.user.role !== 'super_admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
    };
  }
  
  return result;
}
