import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { FlowWorkspaceStatus, FlowCard, FlowCardMember } from '@/lib/flow/types';

interface FlowRow {
  id: string;
  name: string;
  description: string | null;
  status: FlowWorkspaceStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// GET: Получение флоу пространства, сгруппированных по статусам
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем, что пользователь - участник пространства
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 });
    }

    // Получаем все флоу пространства
    const { data: flows, error: flowsError } = await adminClient
      .from('flows')
      .select('id, name, description, status, user_id, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false }) as { data: FlowRow[] | null; error: unknown };

    if (flowsError) {
      console.error('Error fetching workspace flows:', flowsError);
      return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
    }

    // Получаем количество нод для каждого флоу
    const flowIds = (flows || []).map(f => f.id);
    
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

    // Получаем участников каждого флоу
    let membersMap: Record<string, FlowCardMember[]> = {};
    if (flowIds.length > 0) {
      const { data: flowMembers } = await adminClient
        .from('flow_members')
        .select('flow_id, user_id, role')
        .in('flow_id', flowIds);
      
      if (flowMembers) {
        // Получаем email пользователей
        const userIds = [...new Set(flowMembers.map((m: { user_id: string }) => m.user_id))];
        const { data: users } = await adminClient
          .from('users')
          .select('id, email')
          .in('id', userIds);
        
        const userEmailMap: Record<string, string> = {};
        if (users) {
          users.forEach((u: { id: string; email: string }) => {
            userEmailMap[u.id] = u.email;
          });
        }

        flowMembers.forEach((m: { flow_id: string; user_id: string; role: string }) => {
          if (!membersMap[m.flow_id]) {
            membersMap[m.flow_id] = [];
          }
          membersMap[m.flow_id].push({
            id: m.user_id,
            email: userEmailMap[m.user_id] || '',
            role: m.role as 'owner' | 'editor' | 'viewer',
          });
        });
      }
    }

    // Получаем email владельцев
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

    // Группируем по статусам
    const flowCards: Record<FlowWorkspaceStatus, FlowCard[]> = {
      in_progress: [],
      review: [],
      done: [],
      archived: [],
    };

    const counts: Record<FlowWorkspaceStatus, number> = {
      in_progress: 0,
      review: 0,
      done: 0,
      archived: 0,
    };

    (flows || []).forEach((flow) => {
      const status = (flow.status || 'in_progress') as FlowWorkspaceStatus;
      const card: FlowCard = {
        id: flow.id,
        name: flow.name,
        description: flow.description || undefined,
        status,
        created_at: flow.created_at,
        updated_at: flow.updated_at,
        user_id: flow.user_id,
        owner_email: ownerEmailMap[flow.user_id],
        members: membersMap[flow.id] || [],
        node_count: nodeCountsMap[flow.id] || 0,
      };
      
      flowCards[status].push(card);
      counts[status]++;
    });

    return NextResponse.json({
      flows: flowCards,
      counts,
      total: (flows || []).length,
    });

  } catch (error) {
    console.error('Get workspace flows error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Создание нового флоу в пространстве
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем, что пользователь - участник пространства
    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name = 'Без названия', 
      description,
      memberIds = [], // Array of user IDs from workspace
    } = body;

    // Создаём флоу (используем Record для нетипизированных полей)
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name,
      description,
      workspace_id: workspaceId,
      status: 'in_progress',
      viewport_x: 0,
      viewport_y: 0,
      viewport_zoom: 1,
    };

    const { data: flowData, error: flowError } = await adminClient
      .from('flows')
      .insert(insertData as never)
      .select()
      .single();

    if (flowError) {
      console.error('Error creating workspace flow:', flowError);
      return NextResponse.json({ error: 'Failed to create flow' }, { status: 500 });
    }

    const flow = flowData as unknown as {
      id: string;
      name: string;
      description: string | null;
      status: string;
      workspace_id: string;
      created_at: string;
    };

    // Добавляем участников
    if (memberIds.length > 0) {
      const membersToInsert = memberIds.map((userId: string) => ({
        flow_id: flow.id,
        user_id: userId,
        role: 'editor',
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      }));

      const { error: membersError } = await adminClient
        .from('flow_members')
        .insert(membersToInsert);

      if (membersError) {
        console.error('Error adding flow members:', membersError);
        // Не фейлим весь запрос
      }
    }

    return NextResponse.json({
      success: true,
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        status: flow.status,
        workspace_id: flow.workspace_id,
        created_at: flow.created_at,
      },
    });

  } catch (error) {
    console.error('Create workspace flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
