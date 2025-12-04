/**
 * Client-safe admin utilities
 * These functions can be used in both client and server components
 */

import { UserRole } from '@/lib/supabase/types';

// Super admin emails (hardcoded for security)
const SUPER_ADMIN_EMAILS = ['andrew.antoshkin@gmail.com'];
const ADMIN_EMAILS = ['antonbmx@list.ru'];

/**
 * Check if email belongs to super admin
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if email belongs to admin (including super admin)
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(emailLower) || ADMIN_EMAILS.includes(emailLower);
}

/**
 * Get user role from email
 */
export function getRoleFromEmail(email: string | null | undefined): UserRole {
  if (!email) return 'user';
  const emailLower = email.toLowerCase();
  
  if (SUPER_ADMIN_EMAILS.includes(emailLower)) return 'super_admin';
  if (ADMIN_EMAILS.includes(emailLower)) return 'admin';
  return 'user';
}


