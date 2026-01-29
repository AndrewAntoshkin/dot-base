import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workspaces/[id]/import-user-generations
 * Перенести ВСЕ генерации пользователя в это пространство
 * Body: { userId: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetWorkspaceId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Проверяем права (только admin/super_admin)
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = dbUser.role === 'admin' || dbUser.role === 'super_admin';
    
    // Также проверяем workspace-роль
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', targetWorkspaceId)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    const canManage = isAdmin || ['owner', 'admin'].includes(membership?.role || '');

    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Проверяем что target workspace существует
    const { data: targetWorkspace } = await adminClient
      .from('workspaces')
      .select('id, name')
      .eq('id', targetWorkspaceId)
      .eq('is_active', true)
      .single() as { data: { id: string; name: string } | null };

    if (!targetWorkspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Проверяем что пользователь является членом этого workspace
    const { data: targetMembership } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', targetWorkspaceId)
      .eq('user_id', userId)
      .single() as { data: { id: string } | null };

    if (!targetMembership) {
      return NextResponse.json({ 
        error: 'User must be a member of this workspace' 
      }, { status: 400 });
    }

    // Считаем сколько генераций будет перенесено (не из текущего workspace)
    const { count: generationsCount } = await adminClient
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('workspace_id', targetWorkspaceId);

    // Переносим ВСЕ генерации пользователя в это пространство
    const { error: migrateError } = await (adminClient
      .from('generations') as any)
      .update({ workspace_id: targetWorkspaceId })
      .eq('user_id', userId);

    if (migrateError) {
      logger.error('Error importing generations:', migrateError);
      return NextResponse.json({ error: 'Failed to import generations' }, { status: 500 });
    }

    logger.info(`Imported ${generationsCount || 0} generations for user ${userId} to workspace ${targetWorkspaceId}`);

    return NextResponse.json({
      success: true,
      importedCount: generationsCount || 0,
      workspaceId: targetWorkspaceId,
      workspaceName: targetWorkspace.name,
    });
  } catch (error) {
    logger.error('Error in POST /api/workspaces/[id]/import-user-generations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
