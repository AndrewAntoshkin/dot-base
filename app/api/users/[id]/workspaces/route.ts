import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]/workspaces
 * Получить список пространств пользователя (для админов)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Проверяем права (только admin/super_admin или сам пользователь)
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = dbUser.role === 'admin' || dbUser.role === 'super_admin';
    const isSelf = dbUser.id === userId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем workspaces пользователя
    const { data: memberships } = await adminClient
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId) as { data: { workspace_id: string; role: string }[] | null };

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaceIds = memberships.map(m => m.workspace_id);

    // Получаем данные workspaces
    const { data: workspaces } = await adminClient
      .from('workspaces')
      .select('id, name, slug')
      .in('id', workspaceIds)
      .eq('is_active', true) as { data: { id: string; name: string; slug: string }[] | null };

    // Добавляем роль пользователя в каждом workspace
    const workspacesWithRole = (workspaces || []).map(ws => {
      const membership = memberships.find(m => m.workspace_id === ws.id);
      return {
        ...ws,
        role: membership?.role || 'member',
      };
    });

    return NextResponse.json({ workspaces: workspacesWithRole });
  } catch (error) {
    console.error('Error in GET /api/users/[id]/workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
