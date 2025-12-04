/**
 * Server-only admin utilities
 * For client components, use lib/admin-client.ts instead
 */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/supabase/types';
import { isAdminEmail, isSuperAdminEmail, getRoleFromEmail } from './admin-client';

// Re-export client-safe functions for convenience in server code
export { isAdminEmail, isSuperAdminEmail, getRoleFromEmail };

/**
 * Check if current user is admin or super admin
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  email: string | null;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false, isSuperAdmin: false, email: null, error: 'Not authenticated' };
    }
    
    const email = user.email || null;
    const isSuperAdmin = isSuperAdminEmail(email);
    const isAdmin = isAdminEmail(email);
    
    return { isAdmin, isSuperAdmin, email };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { isAdmin: false, isSuperAdmin: false, email: null, error: 'Server error' };
  }
}

/**
 * Get admin stats from database
 * Optimized: queries run in parallel
 */
export async function getAdminStats() {
  const supabase = createServiceRoleClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Run all queries in parallel
  const [
    usersResult, 
    activeTodayResult,
    generationsResult,
    generationsTodayResult,
    failedGenerationsResult,
    failedTodayResult,
    modelsResult,
  ] = await Promise.all([
    // User counts
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login', oneDayAgo),
    // Generation counts
    supabase.from('generations').select('id', { count: 'exact' }).limit(1),
    supabase.from('generations').select('id', { count: 'exact' }).gte('created_at', oneDayAgo).limit(1),
    // Failed generations
    supabase.from('generations').select('id', { count: 'exact' }).eq('status', 'failed').limit(1),
    supabase.from('generations').select('id', { count: 'exact' }).eq('status', 'failed').gte('created_at', oneDayAgo).limit(1),
    // Unique models used
    supabase.from('generations').select('model_name') as unknown as Promise<{ data: { model_name: string }[] | null; error: Error | null }>,
  ]);
  
  // Count unique models
  const uniqueModels = new Set(modelsResult.data?.map(g => g.model_name) || []);
  
  return {
    totalUsers: usersResult.count || 0,
    activeToday: activeTodayResult.count || 0,
    totalGenerations: generationsResult.count || 0,
    generationsToday: generationsTodayResult.count || 0,
    failedGenerations: failedGenerationsResult.count || 0,
    failedToday: failedTodayResult.count || 0,
    uniqueModelsCount: uniqueModels.size,
  };
}

/**
 * Get all users with their generation stats
 */
export async function getAdminUsers(options?: {
  search?: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
  limit?: number;
  offset?: number;
}) {
  const supabase = createServiceRoleClient();
  
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (options?.search) {
    query = query.or(`email.ilike.%${options.search}%,telegram_username.ilike.%${options.search}%`);
  }
  
  if (options?.role) {
    query = query.eq('role', options.role);
  }
  
  if (options?.status) {
    query = query.eq('is_active', options.status === 'active');
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  // Type for user data
  type UserData = {
    id: string;
    email?: string | null;
    telegram_username?: string | null;
    role?: string;
    is_active?: boolean;
    created_at?: string;
    last_login?: string;
    credits?: number;
    [key: string]: unknown;
  };

  const { data: users, error } = await query as unknown as { data: UserData[] | null; error: Error | null };
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Get generation counts for each user
  const userIds = users?.map(u => u.id) || [];
  
  if (userIds.length > 0) {
    type GenerationCount = { user_id: string; cost_credits: number | null };
    const { data: generationCounts } = await supabase
      .from('generations')
      .select('user_id, cost_credits')
      .in('user_id', userIds) as unknown as { data: GenerationCount[] | null };
    
    // Group by user
    const countsByUser: Record<string, { count: number; credits: number }> = {};
    generationCounts?.forEach(g => {
      if (!countsByUser[g.user_id]) {
        countsByUser[g.user_id] = { count: 0, credits: 0 };
      }
      countsByUser[g.user_id].count++;
      countsByUser[g.user_id].credits += g.cost_credits || 0;
    });
    
    // Merge with users
    return users?.map(user => ({
      ...user,
      generations_count: countsByUser[user.id]?.count || 0,
      total_credits_spent: countsByUser[user.id]?.credits || 0,
    })) || [];
  }
  
  return users || [];
}

/**
 * Update user role (super admin only can set admin role)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  requestingUserEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Only super admin can change roles to admin
  if (newRole === 'admin' && !isSuperAdminEmail(requestingUserEmail)) {
    return { success: false, error: 'Only super admin can assign admin role' };
  }
  
  // Cannot change super_admin role
  if (newRole === 'super_admin') {
    return { success: false, error: 'Cannot assign super_admin role' };
  }
  
  const supabase = createServiceRoleClient();
  
  // Check target user isn't a super admin
  const { data: targetUser } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', userId)
    .single() as unknown as { data: { role: string; email: string } | null };
    
  if (targetUser?.role === 'super_admin') {
    return { success: false, error: 'Cannot change super admin role' };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('users') as any)
    .update({ role: newRole })
    .eq('id', userId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  
  // Get current status
  const { data: user } = await supabase
    .from('users')
    .select('is_active, role')
    .eq('id', userId)
    .single() as unknown as { data: { is_active: boolean; role: string } | null };
    
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // Cannot deactivate super admin
  if (user.role === 'super_admin') {
    return { success: false, error: 'Cannot deactivate super admin' };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('users') as any)
    .update({ is_active: !user.is_active })
    .eq('id', userId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

