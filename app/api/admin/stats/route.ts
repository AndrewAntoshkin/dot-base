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
    
    // Выполняем запросы параллельно
    const [
      workspacesResult,
      usersResult,
      activeTodayResult,
      totalGenerationsResult,
      generationsTodayResult,
      failedResult,
      failedTodayResult,
    ] = await Promise.all([
      // 1. Пространства (общее количество)
      supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // 2. Пользователи (с учётом фильтра по workspace)
      workspaceId
        ? supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
        : supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // 3. Активные сегодня пользователи
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('last_login', oneDayAgo),
      
      // 4. Всего генераций (с фильтрами)
      baseGenerationsFilter(),
      
      // 5. Генерации сегодня (с фильтрами)
      (async () => {
        let query = supabase.from('generations').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo);
        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (userId) query = query.eq('user_id', userId);
        return query;
      })(),
      
      // 6. Ошибки (с фильтрами) - только для super_admin
      isSuperAdmin
        ? (async () => {
            let query = supabase.from('generations').select('id', { count: 'exact', head: true }).eq('status', 'failed');
            if (workspaceId) query = query.eq('workspace_id', workspaceId);
            if (userId) query = query.eq('user_id', userId);
            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);
            return query;
          })()
        : Promise.resolve({ count: 0 }),
      
      // 7. Ошибки сегодня
      isSuperAdmin
        ? (async () => {
            let query = supabase.from('generations').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', oneDayAgo);
            if (workspaceId) query = query.eq('workspace_id', workspaceId);
            if (userId) query = query.eq('user_id', userId);
            return query;
          })()
        : Promise.resolve({ count: 0 }),
    ]);
    
    const stats = {
      totalWorkspaces: workspacesResult.count || 0,
      totalUsers: usersResult.count || 0,
      activeToday: activeTodayResult.count || 0,
      totalGenerations: totalGenerationsResult.count || 0,
      generationsToday: generationsTodayResult.count || 0,
      cost: null, // Стоимость пока пустое значение
      failedGenerations: isSuperAdmin ? (failedResult?.count || 0) : 0,
      failedToday: isSuperAdmin ? (failedTodayResult?.count || 0) : 0,
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
