import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin, isSuperAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    // Получаем фильтры из query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createServiceRoleClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Базовые запросы
    const baseGenerationsFilter = () => {
      let query = supabase.from('generations').select('id', { count: 'exact', head: true });
      if (workspaceId) query = query.eq('workspace_id', workspaceId);
      if (userId) query = query.eq('user_id', userId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      return query;
    };
    
    // Запросы
    const queries: Promise<any>[] = [];
    
    // 1. Пространства (общее количество)
    queries.push(
      supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('is_active', true)
    );
    
    // 2. Пользователи (с учётом фильтра по workspace)
    if (workspaceId) {
      queries.push(
        supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
      );
    } else {
      queries.push(
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true)
      );
    }
    
    // 3. Активные сегодня пользователи
    queries.push(
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('last_login', oneDayAgo)
    );
    
    // 4. Всего генераций (с фильтрами)
    queries.push(baseGenerationsFilter());
    
    // 5. Генерации сегодня (с фильтрами)
    let todayQuery = supabase.from('generations').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo);
    if (workspaceId) todayQuery = todayQuery.eq('workspace_id', workspaceId);
    if (userId) todayQuery = todayQuery.eq('user_id', userId);
    queries.push(todayQuery);
    
    // 6. Ошибки (с фильтрами) - только для super_admin
    if (isSuperAdmin) {
      let failedQuery = supabase.from('generations').select('id', { count: 'exact', head: true }).eq('status', 'failed');
      if (workspaceId) failedQuery = failedQuery.eq('workspace_id', workspaceId);
      if (userId) failedQuery = failedQuery.eq('user_id', userId);
      if (startDate) failedQuery = failedQuery.gte('created_at', startDate);
      if (endDate) failedQuery = failedQuery.lte('created_at', endDate);
      queries.push(failedQuery);
      
      // 7. Ошибки сегодня
      let failedTodayQuery = supabase.from('generations').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', oneDayAgo);
      if (workspaceId) failedTodayQuery = failedTodayQuery.eq('workspace_id', workspaceId);
      if (userId) failedTodayQuery = failedTodayQuery.eq('user_id', userId);
      queries.push(failedTodayQuery);
    }
    
    const results = await Promise.all(queries);
    
    const stats = {
      totalWorkspaces: results[0].count || 0,
      totalUsers: results[1].count || 0,
      activeToday: results[2].count || 0,
      totalGenerations: results[3].count || 0,
      generationsToday: results[4].count || 0,
      cost: null, // Стоимость пока пустое значение
      failedGenerations: isSuperAdmin ? (results[5]?.count || 0) : 0,
      failedToday: isSuperAdmin ? (results[6]?.count || 0) : 0,
    };
    
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
