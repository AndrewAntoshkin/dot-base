import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface FlowRow {
  id: string;
  user_id: string;
  workspace_id?: string;
  name?: string;
  description?: string;
  viewport_x?: number;
  viewport_y?: number;
  viewport_zoom?: number;
  status?: string;
}

interface FlowMemberRow {
  id?: string;
  role: string;
}

interface WorkspaceMemberRow {
  id: string;
  role?: string;
}

// GET flow by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем flow (через adminClient для обхода RLS)
    const { data: flowData, error: flowError } = await adminClient
      .from('flows')
      .select('*')
      .eq('id', id)
      .single();

    if (flowError || !flowData) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const flow = flowData as unknown as FlowRow;

    // Проверяем доступ
    let hasAccess = flow.user_id === user.id;

    // Проверяем участие в пространстве
    if (!hasAccess && flow.workspace_id) {
      const { data: membership } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', flow.workspace_id)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!(membership as unknown as WorkspaceMemberRow | null);
    }

    // Проверяем участие во флоу
    if (!hasAccess) {
      const { data: flowMember } = await adminClient
        .from('flow_members')
        .select('id')
        .eq('flow_id', id)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!(flowMember as unknown as FlowMemberRow | null);
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем nodes
    const { data: nodes, error: nodesError } = await adminClient
      .from('flow_nodes')
      .select('*')
      .eq('flow_id', id);

    if (nodesError) {
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
    }

    // Получаем edges
    const { data: edges, error: edgesError } = await adminClient
      .from('flow_edges')
      .select('*')
      .eq('flow_id', id);

    if (edgesError) {
      return NextResponse.json({ error: 'Failed to fetch edges' }, { status: 500 });
    }

    return NextResponse.json({
      flow,
      nodes: nodes || [],
      edges: edges || [],
    });

  } catch (error) {
    console.error('Get flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// UPDATE flow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, viewport_x, viewport_y, viewport_zoom, nodes, edges } = body;

    // Получаем флоу
    const { data: existingFlowData, error: checkError } = await adminClient
      .from('flows')
      .select('id, user_id, workspace_id')
      .eq('id', id)
      .single();

    if (checkError || !existingFlowData) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const existingFlow = existingFlowData as unknown as FlowRow;

    // Проверяем доступ для редактирования
    let hasAccess = existingFlow.user_id === user.id;

    if (!hasAccess && existingFlow.workspace_id) {
      const { data: membership } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', existingFlow.workspace_id)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!(membership as unknown as WorkspaceMemberRow | null);
    }

    if (!hasAccess) {
      const { data: flowMemberData } = await adminClient
        .from('flow_members')
        .select('role')
        .eq('flow_id', id)
        .eq('user_id', user.id)
        .single();
      
      const flowMember = flowMemberData as unknown as FlowMemberRow | null;
      hasAccess = flowMember?.role === 'owner' || flowMember?.role === 'editor';
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Обновляем flow metadata
    const updateData = {
      name,
      viewport_x,
      viewport_y,
      viewport_zoom,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await adminClient
      .from('flows')
      .update(updateData as never)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
    }

    // Обновляем nodes (delete + insert)
    if (nodes !== undefined) {
      const { error: deleteNodesError } = await adminClient
        .from('flow_nodes')
        .delete()
        .eq('flow_id', id);

      if (deleteNodesError) {
        console.error('Nodes delete error:', deleteNodesError);
        return NextResponse.json({ error: 'Failed to delete nodes', details: deleteNodesError.message }, { status: 500 });
      }
      
      if (nodes.length > 0) {
        const nodesData = nodes.map((node: any) => ({
          id: node.id,
          flow_id: id,
          block_type: node.block_type,
          position_x: node.position_x,
          position_y: node.position_y,
          data: node.data,
          model_id: node.model_id,
          output_url: node.output_url,
          output_type: node.output_type,
          status: node.status || 'idle',
        }));

        console.log('Inserting nodes:', JSON.stringify(nodesData.map((n: any) => ({ id: n.id, block_type: n.block_type }))));

        const { error: nodesError } = await adminClient
          .from('flow_nodes')
          .insert(nodesData);

        if (nodesError) {
          console.error('Nodes insert error:', nodesError);
          return NextResponse.json({ error: 'Failed to insert nodes', details: nodesError.message }, { status: 500 });
        }
      }
    }

    // Обновляем edges (delete + insert)
    // Примечание: edges могут быть уже удалены каскадом при удалении nodes
    if (edges !== undefined && edges.length > 0) {
      // React Flow генерирует edge ID как строки (не UUID), поэтому генерируем новые UUID
      const edgesData = edges.map((edge: any) => ({
        // Не используем edge.id - он не UUID. Supabase сгенерирует UUID автоматически
        flow_id: id,
        source_node_id: edge.source,
        source_handle: edge.sourceHandle || null,
        target_node_id: edge.target,
        target_handle: edge.targetHandle || null,
        edge_type: edge.type || 'default',
      }));

      console.log('Inserting edges:', JSON.stringify(edgesData.map((e: any) => ({ 
        source: e.source_node_id, 
        target: e.target_node_id 
      }))));

      const { error: edgesError } = await adminClient
        .from('flow_edges')
        .insert(edgesData);

      if (edgesError) {
        console.error('Edges insert error:', edgesError);
        return NextResponse.json({ error: 'Failed to insert edges', details: edgesError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE flow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем флоу для проверки доступа
    const { data: flowData } = await adminClient
      .from('flows')
      .select('id, user_id, workspace_id')
      .eq('id', id)
      .single();

    if (!flowData) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const flow = flowData as unknown as FlowRow;

    // Проверяем права на удаление (владелец или админ пространства)
    let canDelete = flow.user_id === user.id;

    if (!canDelete && flow.workspace_id) {
      const { data: membershipData } = await adminClient
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', flow.workspace_id)
        .eq('user_id', user.id)
        .single();
      
      const membership = membershipData as unknown as WorkspaceMemberRow | null;
      canDelete = membership?.role === 'owner' || membership?.role === 'admin';
    }

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Удаляем flow (cascades to nodes and edges)
    const { error: deleteError } = await adminClient
      .from('flows')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
