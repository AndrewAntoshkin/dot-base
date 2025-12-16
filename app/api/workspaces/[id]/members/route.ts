import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { WorkspaceMemberRole } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/workspaces/[id]/members - Добавить участника
export async function POST(request: Request, { params }: RouteParams) {
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
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права на добавление участников
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    const canManage = 
      dbUser.role === 'super_admin' || 
      ['owner', 'admin'].includes(membership?.role || '');

    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Валидация роли
    const validRoles: WorkspaceMemberRole[] = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Только owner может назначать owner
    if (role === 'owner' && membership?.role !== 'owner' && dbUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only owners can assign owner role' }, { status: 403 });
    }

    // Находим пользователя по email
    const { data: userToAdd } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single() as { data: { id: string; email: string } | null };

    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found. They must register first.' }, { status: 404 });
    }

    // Проверяем, не добавлен ли уже
    const { data: existingMember } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userToAdd.id)
      .single() as { data: { id: string } | null };

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Добавляем участника
    const { data: newMember, error } = await adminClient
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userToAdd.id,
        role,
        invited_by: dbUser.id,
      } as any)
      .select()
      .single() as { data: { id: string; role: string; joined_at: string } | null; error: any };

    if (error) {
      console.error('Error adding member:', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    return NextResponse.json({
      member: {
        id: newMember?.id,
        user_id: userToAdd.id,
        email: userToAdd.email,
        role: newMember?.role,
        joined_at: newMember?.joined_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/workspaces/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/members - Удалить участника
// При удалении генерации пользователя переносятся в другой workspace (если есть)
export async function DELETE(request: Request, { params }: RouteParams) {
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
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const migrateToWorkspaceId = searchParams.get('migrateToWorkspaceId'); // Опционально: куда перенести генерации

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Проверяем права
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    // Можно удалить себя или если есть права
    const isSelf = userId === dbUser.id;
    const canManage = 
      dbUser.role === 'super_admin' || 
      ['owner', 'admin'].includes(membership?.role || '');

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Нельзя удалить последнего owner
    const { data: memberToRemove } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single() as { data: { role: string } | null };

    if (memberToRemove?.role === 'owner') {
      // Проверяем, есть ли другие owners
      const { count } = await adminClient
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner');

      if (count === 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
      }
    }

    // Получаем другие workspaces пользователя для миграции генераций
    const { data: otherMemberships } = await adminClient
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .neq('workspace_id', workspaceId) as { data: { workspace_id: string }[] | null };

    const otherWorkspaceIds = otherMemberships?.map(m => m.workspace_id) || [];

    // Определяем куда переносить генерации
    let targetWorkspaceId: string | null = null;
    
    if (migrateToWorkspaceId && otherWorkspaceIds.includes(migrateToWorkspaceId)) {
      // Используем указанный workspace
      targetWorkspaceId = migrateToWorkspaceId;
    } else if (otherWorkspaceIds.length > 0) {
      // Используем первый доступный workspace
      targetWorkspaceId = otherWorkspaceIds[0];
    }
    // Если нет других workspaces - генерации останутся с workspace_id = null (или текущим)

    // Переносим генерации пользователя из этого workspace
    if (targetWorkspaceId) {
      const { error: migrateError } = await (adminClient
        .from('generations') as any)
        .update({ workspace_id: targetWorkspaceId })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (migrateError) {
        console.error('Error migrating generations:', migrateError);
        // Продолжаем удаление даже при ошибке миграции
      } else {
        console.log(`Migrated generations for user ${userId} from workspace ${workspaceId} to ${targetWorkspaceId}`);
      }
    } else {
      // Если некуда переносить - обнуляем workspace_id
      const { error: nullifyError } = await (adminClient
        .from('generations') as any)
        .update({ workspace_id: null })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (nullifyError) {
        console.error('Error nullifying workspace_id:', nullifyError);
      }
    }

    // Удаляем участника
    const { error } = await adminClient
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      generationsMigratedTo: targetWorkspaceId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/workspaces/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/workspaces/[id]/members - Изменить роль участника
export async function PATCH(request: Request, { params }: RouteParams) {
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
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем права (только owner может менять роли)
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    const canChangeRoles = 
      dbUser.role === 'super_admin' || 
      membership?.role === 'owner';

    if (!canChangeRoles) {
      return NextResponse.json({ error: 'Access denied: Only owners can change roles' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    // Валидация роли
    const validRoles: WorkspaceMemberRole[] = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Нельзя понизить последнего owner
    if (role !== 'owner') {
      const { data: targetMember } = await adminClient
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single() as { data: { role: string } | null };

      if (targetMember?.role === 'owner') {
        const { count } = await adminClient
          .from('workspace_members')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('role', 'owner');

        if (count === 1) {
          return NextResponse.json({ error: 'Cannot demote the last owner' }, { status: 400 });
        }
      }
    }

    // Обновляем роль
    const { data: updatedMember, error } = await (adminClient
      .from('workspace_members') as any)
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member role:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({
      member: updatedMember,
    });
  } catch (error) {
    console.error('Error in PATCH /api/workspaces/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
