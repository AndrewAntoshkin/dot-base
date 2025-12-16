import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id] - Детали пространства
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Получаем пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем пространство
    const { data: workspace, error } = await adminClient
      .from('workspaces')
      .select('id, name, slug, description, created_at, is_active, created_by')
      .eq('id', id)
      .single() as { data: { id: string; name: string; slug: string; description: string | null; created_at: string; is_active: boolean; created_by: string } | null; error: any };

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Получаем участников
    const { data: workspaceMembers } = await adminClient
      .from('workspace_members')
      .select('id, user_id, role, joined_at')
      .eq('workspace_id', id) as { data: { id: string; user_id: string; role: string; joined_at: string }[] | null };

    // Проверяем доступ
    const isMember = workspaceMembers?.some(m => m.user_id === dbUser.id);
    const isSuperAdmin = dbUser.role === 'super_admin';

    if (!isMember && !isSuperAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем данные пользователей отдельным запросом
    const userIds = workspaceMembers?.map(m => m.user_id) || [];
    const { data: users } = await adminClient
      .from('users')
      .select('id, email, telegram_first_name, role')
      .in('id', userIds) as { data: { id: string; email: string; telegram_first_name: string | null; role: string }[] | null };
    
    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Форматируем участников
    const members = workspaceMembers?.map(m => {
      const userInfo = usersMap.get(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: userInfo?.email,
        name: userInfo?.telegram_first_name || userInfo?.email?.split('@')[0],
        global_role: userInfo?.role,
      };
    }) || [];

    // Определяем роль текущего пользователя
    const currentMember = workspaceMembers?.find(m => m.user_id === dbUser.id);
    const memberRole = currentMember?.role || (isSuperAdmin ? 'owner' : null);

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        created_at: workspace.created_at,
        is_active: workspace.is_active,
        member_count: members.length,
      },
      members,
      current_user: {
        id: dbUser.id,
        role: memberRole,
        global_role: dbUser.role,
        can_manage: ['owner', 'admin'].includes(memberRole || '') || isSuperAdmin,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/workspaces/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/workspaces/[id] - Обновить пространство
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Получаем пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права на редактирование
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    const canEdit = 
      dbUser.role === 'super_admin' || 
      ['owner', 'admin'].includes(membership?.role || '');

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: workspace, error } = await (adminClient
      .from('workspaces') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('Error in PUT /api/workspaces/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id] - Удалить пространство
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Получаем пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права на удаление (только owner или super_admin)
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    const canDelete = 
      dbUser.role === 'super_admin' || 
      membership?.role === 'owner';

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied: Only owners can delete workspaces' }, { status: 403 });
    }

    // Мягкое удаление - деактивируем
    const { error } = await (adminClient
      .from('workspaces') as any)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting workspace:', error);
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/workspaces/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
