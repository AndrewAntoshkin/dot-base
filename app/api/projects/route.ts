import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFullAuth } from '@/lib/supabase/auth-helpers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TRANSLIT_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT_MAP[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) || `project-${Date.now()}`;
}

// GET /api/projects — list projects for current user
export async function GET(request: Request) {
  try {
    const auth = await getFullAuth();
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = auth.dbUser;
    const adminClient = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const statusFilter = searchParams.get('status'); // 'active' | 'in_progress' | 'archived'

    let projects: any[] = [];

    const buildQuery = () => {
      let query = adminClient
        .from('projects')
        .select(`
          id, name, slug, description, cover_url, workspace_id, created_at, created_by, status, is_pinned,
          workspaces!inner ( id, name, slug )
        `)
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      return query;
    };

    if (dbUser.role === 'super_admin') {
      let query = buildQuery();
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      const { data, error } = await query;
      if (error) {
        logger.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
      }
      projects = data || [];
    } else {
      const { data: memberships } = await adminClient
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', dbUser.id) as { data: { workspace_id: string }[] | null };

      const userWorkspaceIds = memberships?.map(m => m.workspace_id) || [];
      if (userWorkspaceIds.length === 0) {
        return NextResponse.json({ projects: [], user_role: dbUser.role });
      }

      let query = buildQuery()
        .in('workspace_id', workspaceId ? [workspaceId] : userWorkspaceIds);

      const { data, error } = await query;
      if (error) {
        logger.error('Error fetching projects:', error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
      }
      projects = data || [];
    }

    // Counts per status for tabs
    let statusCounts = { all: 0, active: 0, in_progress: 0, archived: 0 };
    {
      const wsFilter = workspaceId || null;
      let countQuery = adminClient
        .from('projects')
        .select('id, status')
        .eq('is_active', true);

      if (wsFilter) {
        countQuery = countQuery.eq('workspace_id', wsFilter);
      } else if (dbUser.role !== 'super_admin') {
        const { data: memberships2 } = await adminClient
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', dbUser.id) as { data: { workspace_id: string }[] | null };
        const wsIds = memberships2?.map(m => m.workspace_id) || [];
        if (wsIds.length > 0) {
          countQuery = countQuery.in('workspace_id', wsIds);
        }
      }
      const { data: allProjects } = await countQuery;
      if (allProjects) {
        statusCounts.all = allProjects.length;
        allProjects.forEach((p: any) => {
          if (p.status === 'active') statusCounts.active++;
          else if (p.status === 'in_progress') statusCounts.in_progress++;
          else if (p.status === 'archived') statusCounts.archived++;
        });
      }
    }

    // Fetch member counts and content counts
    const projectIds = projects.map((p: any) => p.id);

    let memberCountMap: Record<string, number> = {};
    let contentCountMap: Record<string, { images: number; videos: number; flows: number }> = {};

    if (projectIds.length > 0) {
      // Member counts
      const { data: memberCounts } = await adminClient
        .from('project_members')
        .select('project_id')
        .in('project_id', projectIds) as { data: { project_id: string }[] | null };

      if (memberCounts) {
        memberCounts.forEach(m => {
          memberCountMap[m.project_id] = (memberCountMap[m.project_id] || 0) + 1;
        });
      }

      // Content counts via RPC
      type ProjectContentCount = { project_id: string; images_count: number; videos_count: number; flows_count: number };
      const { data: counts, error: rpcError } = await (adminClient.rpc as any)(
        'get_projects_generation_counts',
        { p_project_ids: projectIds }
      ) as { data: ProjectContentCount[] | null; error: Error | null };

      if (!rpcError && counts) {
        counts.forEach((c) => {
          contentCountMap[c.project_id] = {
            images: c.images_count || 0,
            videos: c.videos_count || 0,
            flows: c.flows_count || 0,
          };
        });
      }

      // Fetch first 4 members for avatar group per project
      const { data: allProjMembers } = await adminClient
        .from('project_members')
        .select('project_id, user_id')
        .in('project_id', projectIds) as { data: { project_id: string; user_id: string }[] | null };

      if (allProjMembers && allProjMembers.length > 0) {
        const userIds = [...new Set(allProjMembers.map(m => m.user_id))];
        const { data: users } = await adminClient
          .from('users')
          .select('id, email, telegram_first_name')
          .in('id', userIds) as { data: { id: string; email: string; telegram_first_name: string | null }[] | null };

        const usersMap = new Map(users?.map(u => [u.id, u]) || []);

        // Attach members to contentCountMap temporarily; we'll format below
        const projMembersMap: Record<string, any[]> = {};
        allProjMembers.forEach(m => {
          if (!projMembersMap[m.project_id]) projMembersMap[m.project_id] = [];
          const userInfo = usersMap.get(m.user_id);
          projMembersMap[m.project_id].push({
            id: m.user_id,
            name: userInfo?.telegram_first_name || userInfo?.email?.split('@')[0] || 'User',
          });
        });

        // Store on projects below
        projects = projects.map((p: any) => ({
          ...p,
          _members: projMembersMap[p.id]?.slice(0, 4) || [],
        }));
      }
    }

    // Fetch preview images (last 4 generations) for each project
    let previewsMap: Record<string, string[]> = {};
    if (projectIds.length > 0) {
      const { data: previews } = await adminClient
        .from('generations')
        .select('project_id, output_urls')
        .in('project_id', projectIds)
        .eq('status', 'completed')
        .not('output_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200) as { data: { project_id: string; output_urls: string[] }[] | null };

      if (previews) {
        previews.forEach(g => {
          if (!previewsMap[g.project_id]) previewsMap[g.project_id] = [];
          if (previewsMap[g.project_id].length < 4 && g.output_urls?.[0]) {
            previewsMap[g.project_id].push(g.output_urls[0]);
          }
        });
      }
    }

    const formatted = projects.map((p: any) => {
      const counts = contentCountMap[p.id] || { images: 0, videos: 0, flows: 0 };
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        cover_url: p.cover_url,
        workspace_id: p.workspace_id,
        workspace_name: (p.workspaces as any)?.name || '',
        workspace_slug: (p.workspaces as any)?.slug || '',
        created_at: p.created_at,
        status: p.status || 'active',
        is_pinned: p.is_pinned || false,
        member_count: memberCountMap[p.id] || 0,
        images_count: counts.images,
        videos_count: counts.videos,
        flows_count: counts.flows,
        generations_count: counts.images + counts.videos,
        members: p._members || [],
        previews: previewsMap[p.id] || [],
      };
    });

    return NextResponse.json({ projects: formatted, user_role: dbUser.role, status_counts: statusCounts });
  } catch (error) {
    logger.error('Error in GET /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects — create a project within a workspace
export async function POST(request: Request) {
  try {
    const auth = await getFullAuth();
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = auth.dbUser;
    const adminClient = createServiceRoleClient();
    const body = await request.json();
    const { workspace_id, name, description, member_ids } = body;

    if (!workspace_id || !name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'workspace_id and name are required' }, { status: 400 });
    }

    // Verify user is a member of the workspace
    const { data: wsMembership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', dbUser.id)
      .single() as { data: { role: string } | null };

    if (!wsMembership && dbUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'You are not a member of this workspace' }, { status: 403 });
    }

    const slug = generateSlug(name);

    // Check slug uniqueness within workspace
    const { data: existing } = await adminClient
      .from('projects')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('slug', slug)
      .single() as { data: { id: string } | null };

    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    const { data: project, error: createError } = await (adminClient
      .from('projects') as any)
      .insert({
        workspace_id,
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        created_by: dbUser.id,
      })
      .select()
      .single() as { data: any; error: any };

    if (createError || !project) {
      logger.error('Error creating project:', createError);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Add creator as owner
    await (adminClient.from('project_members') as any).insert({
      project_id: project.id,
      user_id: dbUser.id,
      role: 'owner',
      invited_by: dbUser.id,
    });

    // Add additional members (must be workspace members)
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const idsToAdd = member_ids.filter((id: string) => id !== dbUser.id);
      if (idsToAdd.length > 0) {
        // Verify they are workspace members
        const { data: validMembers } = await adminClient
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace_id)
          .in('user_id', idsToAdd) as { data: { user_id: string }[] | null };

        if (validMembers && validMembers.length > 0) {
          const inserts = validMembers.map(m => ({
            project_id: project.id,
            user_id: m.user_id,
            role: 'member' as const,
            invited_by: dbUser.id,
          }));
          await (adminClient.from('project_members') as any).insert(inserts);
        }
      }
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        workspace_id: project.workspace_id,
        created_at: project.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
