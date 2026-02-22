import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getDbUser(adminClient: any, email: string) {
  const { data } = await adminClient
    .from('users')
    .select('id, role')
    .eq('email', email)
    .single() as { data: { id: string; role: string } | null };
  return data;
}

async function getProjectAccess(adminClient: any, projectId: string, userId: string, globalRole: string) {
  // Get project with workspace info
  const { data: project } = await adminClient
    .from('projects')
    .select('id, name, slug, description, cover_url, workspace_id, created_at, updated_at, created_by, is_active')
    .eq('id', projectId)
    .single() as { data: any };

  if (!project) return { project: null, projectRole: null, wsRole: null };

  // Check project membership
  const { data: projMembership } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  // Check workspace membership
  const { data: wsMembership } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  const isSuperAdmin = globalRole === 'super_admin';
  const hasAccess = !!projMembership || !!wsMembership || isSuperAdmin;

  if (!hasAccess) return { project: null, projectRole: null, wsRole: null };

  return {
    project,
    projectRole: projMembership?.role || null,
    wsRole: wsMembership?.role || null,
  };
}

// GET /api/projects/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { project, projectRole, wsRole } = await getProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Fetch workspace name
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('name, slug')
      .eq('id', project.workspace_id)
      .single() as { data: { name: string; slug: string } | null };

    // Fetch members
    const { data: projectMembers } = await adminClient
      .from('project_members')
      .select('id, user_id, role, joined_at')
      .eq('project_id', id) as { data: { id: string; user_id: string; role: string; joined_at: string }[] | null };

    const userIds = projectMembers?.map(m => m.user_id) || [];
    let membersFormatted: any[] = [];
    if (userIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, email, telegram_first_name, role')
        .in('id', userIds) as { data: { id: string; email: string; telegram_first_name: string | null; role: string }[] | null };

      const usersMap = new Map(users?.map(u => [u.id, u]) || []);
      membersFormatted = (projectMembers || []).map(m => {
        const uInfo = usersMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          email: uInfo?.email,
          name: uInfo?.telegram_first_name || uInfo?.email?.split('@')[0],
          global_role: uInfo?.role,
        };
      });
    }

    // Fetch references
    const { data: references } = await adminClient
      .from('project_references')
      .select('id, url, media_type, file_name, sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }) as { data: any[] | null };

    const isSuperAdmin = dbUser.role === 'super_admin';
    const effectiveRole = projectRole || wsRole || (isSuperAdmin ? 'owner' : null);
    const canManage = ['owner', 'admin'].includes(effectiveRole || '') || isSuperAdmin;

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        cover_url: project.cover_url,
        workspace_id: project.workspace_id,
        workspace_name: workspace?.name || '',
        workspace_slug: workspace?.slug || '',
        created_at: project.created_at,
        updated_at: project.updated_at,
        member_count: projectMembers?.length || 0,
      },
      members: membersFormatted,
      references: references || [],
      current_user: {
        id: dbUser.id,
        role: effectiveRole,
        global_role: dbUser.role,
        can_manage: canManage,
      },
    });
  } catch (error) {
    logger.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { project, projectRole, wsRole } = await getProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const isSuperAdmin = dbUser.role === 'super_admin';
    const canEdit = ['owner', 'admin'].includes(projectRole || '') ||
      ['owner', 'admin'].includes(wsRole || '') || isSuperAdmin;

    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, cover_url, is_pinned, status } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (cover_url !== undefined) updates.cover_url = cover_url || null;
    if (is_pinned !== undefined) updates.is_pinned = !!is_pinned;
    if (status !== undefined && ['active', 'in_progress', 'archived'].includes(status)) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error } = await (adminClient
      .from('projects') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating project:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json({ project: updated });
  } catch (error) {
    logger.error('Error in PUT /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { project, projectRole, wsRole } = await getProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const isSuperAdmin = dbUser.role === 'super_admin';
    const canDelete = projectRole === 'owner' || wsRole === 'owner' || isSuperAdmin;

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied: Only owners can delete projects' }, { status: 403 });
    }

    const { error } = await (adminClient
      .from('projects') as any)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting project:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
