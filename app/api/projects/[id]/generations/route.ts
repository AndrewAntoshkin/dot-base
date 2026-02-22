import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/generations?type=image|video&page=1&limit=40
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project and verify access
    const { data: project } = await adminClient
      .from('projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .eq('is_active', true)
      .single() as { data: { id: string; workspace_id: string } | null };

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check access: project member, workspace member, or super_admin
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (dbUser.role !== 'super_admin') {
      const { data: projMember } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', dbUser.id)
        .single() as { data: { role: string } | null };

      if (!projMember) {
        const { data: wsMember } = await adminClient
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', project.workspace_id)
          .eq('user_id', dbUser.id)
          .single() as { data: { role: string } | null };

        if (!wsMember) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'image', 'video', 'all'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10), 100);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('generations')
      .select('id, action, model_id, model_name, prompt, status, output_urls, output_thumbs, created_at, user_id', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type === 'image') {
      query = query.not('action', 'like', 'video_%');
    } else if (type === 'video') {
      query = query.like('action', 'video_%');
    }

    const { data: generations, count, error } = await query;

    if (error) {
      logger.error('Error fetching project generations:', error);
      return NextResponse.json({ error: 'Failed to fetch generations' }, { status: 500 });
    }

    return NextResponse.json({
      generations: generations || [],
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    logger.error('Error in GET /api/projects/[id]/generations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
