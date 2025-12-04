/**
 * Client-safe admin utilities
 * Роли теперь берутся из БД, не хардкодятся
 * 
 * Для клиентских компонентов: используйте useUser().isAdmin из contexts/user-context.tsx
 * Для серверных компонентов: используйте getUserRoleFromDb() из lib/admin.ts
 */

import { UserRole } from '@/lib/supabase/types';

/**
 * Проверить, является ли роль админской
 */
export function isAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

/**
 * Проверить, является ли роль super_admin
 */
export function isSuperAdminRole(role: UserRole | string | null | undefined): boolean {
  return role === 'super_admin';
}

/**
 * @deprecated Используйте isAdminRole() с ролью из БД или useUser().isAdmin
 * Оставлено для обратной совместимости на период миграции
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  console.warn('isAdminEmail() is deprecated. Use isAdminRole() with role from DB or useUser().isAdmin');
  // Временно возвращаем false - роли теперь в БД
  return false;
}

/**
 * @deprecated Используйте isSuperAdminRole() с ролью из БД или useUser().isSuperAdmin
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  console.warn('isSuperAdminEmail() is deprecated. Use isSuperAdminRole() with role from DB');
  return false;
}

/**
 * @deprecated Используйте роль напрямую из БД
 */
export function getRoleFromEmail(email: string | null | undefined): UserRole {
  console.warn('getRoleFromEmail() is deprecated. Get role from DB instead');
  return 'user';
}


