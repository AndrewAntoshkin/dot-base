import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]/users - Получить пользователей пространства с превью генераций
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Получаем текущего пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email || '')
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const typedDbUser = dbUser as { id: string; role: string };

    // Проверяем доступ к workspace
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', typedDbUser.id)
      .single();

    const isSuperAdmin = typedDbUser.role === 'super_admin';
    
    if (!membership && !isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем workspace
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Получаем всех участников workspace
    const { data: members } = await adminClient
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId);

    const memberUserIds = (members as { user_id: string }[] | null)?.map(m => m.user_id) || [];

    // Получаем данные пользователей
    const { data: users } = await adminClient
      .from('users')
      .select('id, email, telegram_first_name')
      .in('id', memberUserIds);

    // Get TOTAL generation counts using RPC (all generations, all workspaces)
    type UserStats = { user_id: string; generations_count: number; total_cost_usd: number };
    
    const { data: rpcStats, error: rpcError } = await (adminClient
      .rpc as any)('get_user_generation_stats', { p_user_ids: memberUserIds }) as { data: UserStats[] | null; error: Error | null };
    
    // Create a map for quick lookup
    const statsMap: Record<string, number> = {};
    if (rpcStats) {
      rpcStats.forEach(stat => {
        statsMap[stat.user_id] = stat.generations_count || 0;
      });
    }

    // Забираем последние N генераций по workspace одним запросом и группируем (убираем N+1)
    const { data: recentWorkspaceGens } = await adminClient
      .from('generations')
      .select('user_id, output_urls, output_thumbs, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'completed')
      .not('output_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    const previewsByUser: Record<string, string[]> = {};
    for (const g of (recentWorkspaceGens || []) as any[]) {
      const uid = g.user_id as string;
      if (!uid) continue;
      if (!previewsByUser[uid]) previewsByUser[uid] = [];
      if (previewsByUser[uid].length >= 3) continue;
      const thumb = g.output_thumbs?.[0];
      const full = g.output_urls?.[0];
      const url = thumb || full;
      if (url) previewsByUser[uid].push(url);
    }

    const usersWithGenerations = (users || []).map((u: any) => {
      const genCount = statsMap[u.id] ?? 0;
      return {
        id: u.id,
        email: u.email,
        name: u.telegram_first_name || u.email?.split('@')[0] || 'User',
        generations_count: genCount,
        previews: previewsByUser[u.id] || [],
      };
    });

    // Сортируем по количеству генераций (больше сверху)
    usersWithGenerations.sort((a, b) => b.generations_count - a.generations_count);

    return NextResponse.json({
      workspace,
      users: usersWithGenerations,
    });
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
