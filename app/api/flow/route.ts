import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET list of user's flows
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's flows
    const { data: flows, error, count } = await supabase
      .from('flows')
      .select('id, name, description, created_at, updated_at, is_template', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching flows:', error);
      return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
    }

    return NextResponse.json({
      flows: flows || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Get flows error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new flow
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name = 'Без названия', 
      description,
      nodes = [],
      edges = [],
      viewport_x = 0,
      viewport_y = 0,
      viewport_zoom = 1,
    } = body;

    // Create flow
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .insert({
        user_id: user.id,
        name,
        description,
        viewport_x,
        viewport_y,
        viewport_zoom,
      })
      .select()
      .single();

    if (flowError) {
      console.error('Error creating flow:', flowError);
      return NextResponse.json({ error: 'Failed to create flow' }, { status: 500 });
    }

    // Insert nodes if provided
    if (nodes.length > 0) {
      const nodesWithFlowId = nodes.map((node: any) => ({
        id: node.id,
        flow_id: flow.id,
        block_type: node.data?.blockType || node.block_type || 'text',
        position_x: node.position?.x || node.position_x || 0,
        position_y: node.position?.y || node.position_y || 0,
        data: node.data || {},
        model_id: node.data?.modelId || node.model_id,
        output_url: node.data?.outputUrl || node.output_url,
        output_type: node.data?.outputType || node.output_type,
        status: node.data?.status || node.status || 'idle',
        // Автор ноды
        created_by: user.id,
        created_by_email: user.email,
      }));

      const { error: nodesError } = await supabase
        .from('flow_nodes')
        .insert(nodesWithFlowId);

      if (nodesError) {
        console.error('Error creating nodes:', nodesError);
        // Don't fail the whole request, flow is created
      }
    }

    // Insert edges if provided
    if (edges.length > 0) {
      const edgesWithFlowId = edges.map((edge: any) => ({
        id: edge.id,
        flow_id: flow.id,
        source_node_id: edge.source,
        source_handle: edge.sourceHandle,
        target_node_id: edge.target,
        target_handle: edge.targetHandle,
        edge_type: edge.type || 'default',
      }));

      const { error: edgesError } = await supabase
        .from('flow_edges')
        .insert(edgesWithFlowId);

      if (edgesError) {
        console.error('Error creating edges:', edgesError);
        // Don't fail the whole request, flow is created
      }
    }

    return NextResponse.json({
      success: true,
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        created_at: flow.created_at,
        updated_at: flow.updated_at,
      },
    });

  } catch (error) {
    console.error('Create flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
