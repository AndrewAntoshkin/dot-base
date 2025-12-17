/**
 * Server-only admin utilities
 * Роли загружаются из БД, не хардкодятся
 * 
 * For client components, use useUser().isAdmin from contexts/user-context.tsx
 */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/supabase/types';
import { isAdminRole, isSuperAdminRole } from './admin-client';
import { convertToRubWithMarkup } from './pricing';

// Re-export helper functions
export { isAdminRole, isSuperAdminRole };

/**
 * Получить роль пользователя из БД по email
 */
export async function getUserRoleFromDb(email: string | null | undefined): Promise<UserRole> {
  if (!email) return 'user';
  
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('email', email.toLowerCase())
      .single() as { data: { role: string } | null };
    
    return (data?.role as UserRole) || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
}

/**
 * @deprecated Используйте isAdminRole с ролью из getUserRoleFromDb
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  console.warn('isAdminEmail() is deprecated. Use getUserRoleFromDb() + isAdminRole()');
  return false;
}

/**
 * @deprecated Используйте isSuperAdminRole с ролью из getUserRoleFromDb
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  console.warn('isSuperAdminEmail() is deprecated. Use getUserRoleFromDb() + isSuperAdminRole()');
  return false;
}

/**
 * Check if current user is admin or super admin
 * Роль загружается из БД
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  isSuperAdmin: boolean;
  email: string | null;
  role: UserRole;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false, isSuperAdmin: false, email: null, role: 'user', error: 'Not authenticated' };
    }
    
    const email = user.email || null;
    
    // Получаем роль из БД
    const role = await getUserRoleFromDb(email);
    
    return { 
      isAdmin: isAdminRole(role), 
      isSuperAdmin: isSuperAdminRole(role), 
      email,
      role,
    };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { isAdmin: false, isSuperAdmin: false, email: null, role: 'user', error: 'Server error' };
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
  workspaceId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = createServiceRoleClient();
  
  // Type for user data
  type UserData = {
    id: string;
    email?: string | null;
    telegram_username?: string | null;
    telegram_first_name?: string | null;
    role?: string;
    is_active?: boolean;
    created_at?: string;
    last_login?: string;
    credits?: number;
    [key: string]: unknown;
  };
  
  let userIds: string[] = [];
  
  // Если есть фильтр по workspace - сначала получаем пользователей из workspace
  if (options?.workspaceId) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', options.workspaceId);
    
    userIds = (members as { user_id: string }[] | null)?.map(m => m.user_id) || [];
    
    if (userIds.length === 0) {
      return [];
    }
  }
  
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Фильтр по workspace members
  if (options?.workspaceId && userIds.length > 0) {
    query = query.in('id', userIds);
  }
  
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

  const { data: users, error } = await query as unknown as { data: UserData[] | null; error: Error | null };
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Get generation counts for each user (TOTAL - without date filters)
  // Using RPC function to avoid Supabase 1000 row limit
  const fetchUserIds = users?.map(u => u.id) || [];
  
  if (fetchUserIds.length > 0) {
    // Try RPC function first, fallback to manual count
    type UserStats = { user_id: string; generations_count: number; total_cost_usd: number };
    
    let countsByUser: Record<string, { count: number; credits: number; costUsd: number }> = {};
    let hasFilteredGenerations: Record<string, boolean> = {};
    
    // Try RPC function
    const { data: rpcStats, error: rpcError } = await (supabase
      .rpc as any)('get_user_generation_stats', { p_user_ids: fetchUserIds }) as { data: UserStats[] | null; error: Error | null };
    
    if (!rpcError && rpcStats) {
      // Use RPC results
      rpcStats.forEach(stat => {
        countsByUser[stat.user_id] = {
          count: stat.generations_count || 0,
          credits: 0,
          costUsd: stat.total_cost_usd || 0
        };
      });
      
      // For date filtering, we still need to check which users have generations in the date range
      if (options?.startDate || options?.endDate) {
        // Query just to check date range (minimal data)
        let dateQuery = supabase
          .from('generations')
          .select('user_id, created_at')
          .in('user_id', fetchUserIds);
        
        if (options.workspaceId) {
          dateQuery = dateQuery.eq('workspace_id', options.workspaceId);
        }
        if (options.startDate) {
          dateQuery = dateQuery.gte('created_at', options.startDate);
        }
        if (options.endDate) {
          dateQuery = dateQuery.lte('created_at', options.endDate);
        }
        
        const { data: filteredGens } = await dateQuery;
        filteredGens?.forEach((g: { user_id: string }) => {
          hasFilteredGenerations[g.user_id] = true;
        });
      }
    } else {
      // Fallback: count individually for each user (slower but works without RPC)
      console.warn('RPC function not available, using fallback count method');
      
      for (const userId of fetchUserIds) {
        let countQuery = supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (options?.workspaceId) {
          countQuery = countQuery.eq('workspace_id', options.workspaceId);
        }
        
        const { count } = await countQuery;
        
        // Get cost sum
        let costQuery = supabase
          .from('generations')
          .select('cost_usd')
          .eq('user_id', userId)
          .not('cost_usd', 'is', null);
        
        if (options?.workspaceId) {
          costQuery = costQuery.eq('workspace_id', options.workspaceId);
        }
        
        const { data: costData } = await costQuery;
        const totalCost = (costData || []).reduce((sum: number, row: { cost_usd: number }) => sum + (row.cost_usd || 0), 0);
        
        countsByUser[userId] = {
          count: count || 0,
          credits: 0,
          costUsd: totalCost
        };
      }
      
      // Date filtering for fallback
      if (options?.startDate || options?.endDate) {
        for (const userId of fetchUserIds) {
          let dateQuery = supabase
            .from('generations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
          
          if (options.workspaceId) dateQuery = dateQuery.eq('workspace_id', options.workspaceId);
          if (options.startDate) dateQuery = dateQuery.gte('created_at', options.startDate);
          if (options.endDate) dateQuery = dateQuery.lte('created_at', options.endDate);
          
          const { count } = await dateQuery;
          if (count && count > 0) {
            hasFilteredGenerations[userId] = true;
          }
        }
      }
    }
    
    // Merge with users
    const usersWithStats = users?.map(user => {
      const userStats = countsByUser[user.id];
      const costRub = userStats?.costUsd ? Math.round(convertToRubWithMarkup(userStats.costUsd)) : null;
      
      return {
        ...user,
        generations_count: userStats?.count || 0,
        total_credits_spent: userStats?.credits || 0,
        cost_rub: costRub,
      };
    }) || [];
    
    // Если есть фильтр по датам - показываем только пользователей с генерациями В ЭТОТ ПЕРИОД
    if (options?.startDate || options?.endDate) {
      return usersWithStats.filter(u => hasFilteredGenerations[u.id]);
    }
    
    return usersWithStats;
  }
  
  return users || [];
}

/**
 * Update user role (super admin only can set admin role)
 * Проверяет роль запрашивающего пользователя из БД
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  requestingUserEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Получаем роль запрашивающего пользователя из БД
  const requestingRole = await getUserRoleFromDb(requestingUserEmail);
  
  // Only super admin can change roles to admin
  if (newRole === 'admin' && !isSuperAdminRole(requestingRole)) {
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
  
  const { error } = await (supabase.from('users') as any)
    .update({ is_active: !user.is_active })
    .eq('id', userId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

