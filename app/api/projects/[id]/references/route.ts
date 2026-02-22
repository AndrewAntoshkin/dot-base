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

async function checkProjectAccess(adminClient: any, projectId: string, userId: string, globalRole: string) {
  const { data: project } = await adminClient
    .from('projects')
    .select('id, workspace_id')
    .eq('id', projectId)
    .eq('is_active', true)
    .single() as { data: { id: string; workspace_id: string } | null };

  if (!project) return null;

  if (globalRole === 'super_admin') return project;

  const { data: projMember } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  if (projMember) return project;

  const { data: wsMember } = await adminClient
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', userId)
    .single() as { data: { role: string } | null };

  return wsMember ? project : null;
}

// GET /api/projects/[id]/references
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const project = await checkProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: references, error } = await adminClient
      .from('project_references')
      .select('id, url, media_type, file_name, sort_order, created_at')
      .eq('project_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Error fetching references:', error);
      return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 });
    }

    return NextResponse.json({ references: references || [] });
  } catch (error) {
    logger.error('Error in GET /api/projects/[id]/references:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[id]/references — add reference
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const project = await checkProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const body = await request.json();
    const { url, media_type, file_name } = body;

    if (!url || !media_type) {
      return NextResponse.json({ error: 'url and media_type are required' }, { status: 400 });
    }

    if (!['image', 'video'].includes(media_type)) {
      return NextResponse.json({ error: 'media_type must be image or video' }, { status: 400 });
    }

    // Get next sort_order
    const { data: lastRef } = await adminClient
      .from('project_references')
      .select('sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single() as { data: { sort_order: number } | null };

    const nextOrder = (lastRef?.sort_order || 0) + 1;

    const { data: reference, error } = await adminClient
      .from('project_references')
      .insert({
        project_id: id,
        url,
        media_type,
        file_name: file_name || null,
        sort_order: nextOrder,
        uploaded_by: dbUser.id,
      } as any)
      .select()
      .single() as { data: any; error: any };

    if (error) {
      logger.error('Error adding reference:', error);
      return NextResponse.json({ error: 'Failed to add reference' }, { status: 500 });
    }

    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/projects/[id]/references:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/references?refId=X
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createServiceRoleClient();
    const dbUser = await getDbUser(adminClient, user.email as string);
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const project = await checkProjectAccess(adminClient, id, dbUser.id, dbUser.role);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const refId = searchParams.get('refId');
    if (!refId) return NextResponse.json({ error: 'refId is required' }, { status: 400 });

    const { error } = await adminClient
      .from('project_references')
      .delete()
      .eq('id', refId)
      .eq('project_id', id);

    if (error) {
      logger.error('Error deleting reference:', error);
      return NextResponse.json({ error: 'Failed to delete reference' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/projects/[id]/references:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
