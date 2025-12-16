import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { convertToRubWithMarkup } from '@/lib/pricing';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics with optional filters
 * Uses RPC functions to properly aggregate data (no 1000 row limit)
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
    
    const supabase = createServiceRoleClient();
    
    // Try to use RPC functions for accurate totals
    type DashboardTotals = { total_generations: number; total_cost_usd: number; total_failed: number };
    type TodayStats = { generations_today: number; cost_today_usd: number; failed_today: number };
    
    const [
      workspacesResult,
      usersResult,
      totalsResult,
      todayResult,
    ] = await Promise.all([
      // 1. Workspaces count
      supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // 2. Users count
      workspaceId
        ? supabase.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('workspace_id', workspaceId)
        : supabase.from('users').select('id', { count: 'exact', head: true }),
      
      // 3. Total stats via RPC
      (supabase.rpc as any)('get_dashboard_totals', {
        p_workspace_id: workspaceId || null,
        p_user_id: userId || null
      }) as Promise<{ data: DashboardTotals[] | null; error: Error | null }>,
      
      // 4. Today stats via RPC
      (supabase.rpc as any)('get_dashboard_today_stats', {
        p_workspace_id: workspaceId || null,
        p_user_id: userId || null
      }) as Promise<{ data: TodayStats[] | null; error: Error | null }>,
    ]);
    
    // Extract RPC results
    let totalGenerations = 0;
    let totalCostUsd = 0;
    let totalFailed = 0;
    let generationsToday = 0;
    let costTodayUsd = 0;
    let failedToday = 0;
    
    if (totalsResult.data && totalsResult.data.length > 0) {
      const totals = totalsResult.data[0];
      totalGenerations = totals.total_generations || 0;
      totalCostUsd = totals.total_cost_usd || 0;
      totalFailed = totals.total_failed || 0;
    } else if (totalsResult.error) {
      // Fallback if RPC not available
      console.warn('RPC get_dashboard_totals not available, using fallback');
      
      const { count: genCount } = await supabase
        .from('generations')
        .select('id', { count: 'exact', head: true });
      totalGenerations = genCount || 0;
      
      const { count: failedCount } = await supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed');
      totalFailed = failedCount || 0;
      
      // Cost requires fetching all rows (limited to 1000)
      const { data: costData } = await supabase
        .from('generations')
        .select('cost_usd')
        .eq('status', 'completed')
        .not('cost_usd', 'is', null);
      totalCostUsd = (costData || []).reduce((sum, row: { cost_usd: number }) => sum + (row.cost_usd || 0), 0);
    }
    
    if (todayResult.data && todayResult.data.length > 0) {
      const today = todayResult.data[0];
      generationsToday = today.generations_today || 0;
      costTodayUsd = today.cost_today_usd || 0;
      failedToday = today.failed_today || 0;
    } else if (todayResult.error) {
      // Fallback
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { count: todayCount } = await supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);
      generationsToday = todayCount || 0;
    }
    
    // Convert to RUB with markup
    const totalCostRub = convertToRubWithMarkup(totalCostUsd);
    const todayCostRub = convertToRubWithMarkup(costTodayUsd);
    
    const stats = {
      totalWorkspaces: workspacesResult.count || 0,
      totalUsers: usersResult.count || 0,
      activeToday: 0, // Not critical, can skip
      totalGenerations,
      generationsToday,
      cost: totalCostRub > 0 ? Math.round(totalCostRub) : null,
      costToday: todayCostRub > 0 ? Math.round(todayCostRub) : null,
      failedGenerations: isSuperAdmin ? totalFailed : 0,
      failedToday: isSuperAdmin ? failedToday : 0,
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
