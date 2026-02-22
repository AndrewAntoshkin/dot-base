import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ProjectMemberRole = 'owner' | 'admin' | 'member';
const VALID_ROLES: ProjectMemberRole[] = ['owner', 'admin', 'member'];

async function getDbUser(adminClient: any, email: string) {
  const { data } = await adminClient
    .from('users')
    .select('id, role')
    .eq('email', email)
    .single() as { data: { id: string; role: string } | null };
  return data;
}

async function getProjectAndAccess(adminClient: any, projectId: string, userId: string, globalRole: string) {
  const { data: project } = await adminClient
    .from('projects')
    .select('id, workspace_id, is_active')
    .eq('id', projectId)
    .eq('is_active', true)
    .single() as { data: { id: string; workspace_id: string; is_active: boolean } | null };

  if (!project) return null;

  const { data: projMembership } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  const { data: wsMembership } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  const isSuperAdmin = globalRole === 'super_admin';
  const canManage = ['owner', 'admin'].includes(projMembership?.role || '') ||
    ['owner', 'admin'].includes(wsMembership?.role || '') || isSuperAdmin;
  const isOwner = projMembership?.role === 'owner' || wsMembership?.role === 'owner' || isSuperAdmin;

  return { project, projRole: projMembership?.role, wsRole: wsMembership?.role, canManage, isOwner };
}

// GET /api/projects/[id]/members
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const access = await getProjectAndAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: members } = await adminClient
      .from('project_members')
      .select('id, user_id, role, joined_at')
      .eq('project_id', id) as { data: { id: string; user_id: string; role: string; joined_at: string }[] | null };

    const userIds = members?.map(m => m.user_id) || [];
    let formatted: any[] = [];

    if (userIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, email, telegram_first_name, role')
        .in('id', userIds) as { data: { id: string; email: string; telegram_first_name: string | null; role: string }[] | null };

      const usersMap = new Map(users?.map(u => [u.id, u]) || []);
      formatted = (members || []).map(m => {
        const u = usersMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          email: u?.email,
          name: u?.telegram_first_name || u?.email?.split('@')[0],
          global_role: u?.role,
        };
      });
    }

    // Also return workspace members not in project (for adding)
    const { data: wsMembers } = await adminClient
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', access.project.workspace_id) as { data: { user_id: string }[] | null };

    const projectMemberIds = new Set(userIds);
    const availableUserIds = (wsMembers || [])
      .map(m => m.user_id)
      .filter(uid => !projectMemberIds.has(uid));

    let availableMembers: any[] = [];
    if (availableUserIds.length > 0) {
      const { data: availUsers } = await adminClient
        .from('users')
        .select('id, email, telegram_first_name')
        .in('id', availableUserIds) as { data: { id: string; email: string; telegram_first_name: string | null }[] | null };

      availableMembers = (availUsers || []).map(u => ({
        id: u.id,
        email: u.email,
        name: u.telegram_first_name || u.email?.split('@')[0],
      }));
    }

    return NextResponse.json({
      members: formatted,
      available_members: availableMembers,
      can_manage: access.canManage,
    });
  } catch (error) {
    logger.error('Error in GET /api/projects/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/members — add member
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const access = await getProjectAndAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!access.canManage) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const { user_id, role = 'member' } = body;

    if (!user_id) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    if (role === 'owner' && !access.isOwner) {
      return NextResponse.json({ error: 'Only owners can assign owner role' }, { status: 403 });
    }

    // Verify user is a workspace member
    const { data: wsMembership } = await adminClient
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', access.project.workspace_id)
      .eq('user_id', user_id)
      .single() as { data: { user_id: string } | null };

    if (!wsMembership) {
      return NextResponse.json({ error: 'User must be a workspace member first' }, { status: 400 });
    }

    // Check if already a project member
    const { data: existing } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user_id)
      .single() as { data: { id: string } | null };

    if (existing) {
      return NextResponse.json({ error: 'User is already a project member' }, { status: 400 });
    }

    const { data: newMember, error } = await adminClient
      .from('project_members')
      .insert({
        project_id: id,
        user_id,
        role,
        invited_by: dbUser.id,
      } as any)
      .select()
      .single() as { data: any; error: any };

    if (error) {
      logger.error('Error adding project member:', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }

    // Fetch user info for response
    const { data: addedUser } = await adminClient
      .from('users')
      .select('email, telegram_first_name')
      .eq('id', user_id)
      .single() as { data: { email: string; telegram_first_name: string | null } | null };

    return NextResponse.json({
      member: {
        id: newMember?.id,
        user_id,
        email: addedUser?.email,
        name: addedUser?.telegram_first_name || addedUser?.email?.split('@')[0],
        role: newMember?.role,
        joined_at: newMember?.joined_at,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/projects/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/members?userId=X
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const access = await getProjectAndAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const isSelf = userId === dbUser.id;
    if (!isSelf && !access.canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prevent removing last owner
    const { data: memberToRemove } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', userId)
      .single() as { data: { role: string } | null };

    if (memberToRemove?.role === 'owner') {
      const { count } = await adminClient
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', id)
        .eq('role', 'owner');

      if (count === 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
      }
    }

    const { error } = await adminClient
      .from('project_members')
      .delete()
      .eq('project_id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error removing project member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/projects/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/members — change role
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const access = await getProjectAndAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!access.isOwner) return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });

    const body = await request.json();
    const { userId, role } = body;
    if (!userId || !role) return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

    // Prevent demoting last owner
    if (role !== 'owner') {
      const { data: target } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', id)
        .eq('user_id', userId)
        .single() as { data: { role: string } | null };

      if (target?.role === 'owner') {
        const { count } = await adminClient
          .from('project_members')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', id)
          .eq('role', 'owner');

        if (count === 1) {
          return NextResponse.json({ error: 'Cannot demote the last owner' }, { status: 400 });
        }
      }
    }

    const { data: updated, error } = await (adminClient
      .from('project_members') as any)
      .update({ role })
      .eq('project_id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating project member role:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ member: updated });
  } catch (error) {
    logger.error('Error in PATCH /api/projects/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
