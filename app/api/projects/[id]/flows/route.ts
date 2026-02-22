import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { FlowWorkspaceStatus, FlowCard, FlowCardMember } from '@/lib/flow/types';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface FlowRow {
  id: string;
  name: string;
  description: string | null;
  status: FlowWorkspaceStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// GET /api/projects/[id]/flows
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

    const { data: project } = await adminClient
      .from('projects')
      .select('id, workspace_id')
      .eq('id', projectId)
      .eq('is_active', true)
      .single() as { data: { id: string; workspace_id: string } | null };

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check access
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

    // Fetch flows linked to this project
    const { data: flows, error: flowsError } = await adminClient
      .from('flows')
      .select('id, name, description, status, user_id, created_at, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }) as { data: FlowRow[] | null; error: unknown };

    if (flowsError) {
      logger.error('Error fetching project flows:', flowsError);
      return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
    }

    const flowIds = (flows || []).map(f => f.id);

    // Node counts
    let nodeCountsMap: Record<string, number> = {};
    if (flowIds.length > 0) {
      const { data: nodeCounts } = await adminClient
        .from('flow_nodes')
        .select('flow_id')
        .in('flow_id', flowIds);

      if (nodeCounts) {
        nodeCounts.forEach((n: { flow_id: string }) => {
          nodeCountsMap[n.flow_id] = (nodeCountsMap[n.flow_id] || 0) + 1;
        });
      }
    }

    // Flow members
    let membersMap: Record<string, FlowCardMember[]> = {};
    if (flowIds.length > 0) {
      const { data: flowMembers } = await adminClient
        .from('flow_members')
        .select('flow_id, user_id, role')
        .in('flow_id', flowIds);

      if (flowMembers) {
        const memberUserIds = [...new Set(flowMembers.map((m: { user_id: string }) => m.user_id))];
        const { data: users } = await adminClient
          .from('users')
          .select('id, email')
          .in('id', memberUserIds);

        const userEmailMap: Record<string, string> = {};
        if (users) {
          users.forEach((u: { id: string; email: string }) => {
            userEmailMap[u.id] = u.email;
          });
        }

        flowMembers.forEach((m: { flow_id: string; user_id: string; role: string }) => {
          if (!membersMap[m.flow_id]) membersMap[m.flow_id] = [];
          membersMap[m.flow_id].push({
            id: m.user_id,
            email: userEmailMap[m.user_id] || '',
            role: m.role as 'owner' | 'editor' | 'viewer',
          });
        });
      }
    }

    // Owner emails
    const ownerIds = [...new Set((flows || []).map(f => f.user_id))];
    let ownerEmailMap: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: owners } = await adminClient
        .from('users')
        .select('id, email')
        .in('id', ownerIds);

      if (owners) {
        owners.forEach((u: { id: string; email: string }) => {
          ownerEmailMap[u.id] = u.email;
        });
      }
    }

    const flowCards: FlowCard[] = (flows || []).map((flow) => ({
      id: flow.id,
      name: flow.name,
      description: flow.description || undefined,
      status: (flow.status || 'in_progress') as FlowWorkspaceStatus,
      created_at: flow.created_at,
      updated_at: flow.updated_at,
      user_id: flow.user_id,
      owner_email: ownerEmailMap[flow.user_id],
      members: membersMap[flow.id] || [],
      node_count: nodeCountsMap[flow.id] || 0,
    }));

    return NextResponse.json({
      flows: flowCards,
      total: flowCards.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/projects/[id]/flows:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
