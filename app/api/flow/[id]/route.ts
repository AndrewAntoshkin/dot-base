import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET flow by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем flow
    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (flowError || !flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Получаем nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('flow_nodes')
      .select('*')
      .eq('flow_id', id);

    if (nodesError) {
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
    }

    // Получаем edges
    const { data: edges, error: edgesError } = await supabase
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, viewport_x, viewport_y, viewport_zoom, nodes, edges } = body;

    // Проверяем, что flow принадлежит пользователю
    const { data: existingFlow, error: checkError } = await supabase
      .from('flows')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existingFlow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    // Обновляем flow metadata
    const { error: updateError } = await supabase
      .from('flows')
      .update({
        name,
        viewport_x,
        viewport_y,
        viewport_zoom,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
    }

    // Обновляем nodes (delete + insert)
    if (nodes !== undefined) {
      // Сначала получаем существующие ноды, чтобы сохранить их авторов
      const { data: existingNodes } = await supabase
        .from('flow_nodes')
        .select('id, created_by, created_by_email')
        .eq('flow_id', id);
      
      const existingAuthors = new Map(
        (existingNodes || []).map((n: any) => [n.id, { created_by: n.created_by, created_by_email: n.created_by_email }])
      );
      
      await supabase.from('flow_nodes').delete().eq('flow_id', id);
      
      if (nodes.length > 0) {
        const { error: nodesError } = await supabase
          .from('flow_nodes')
          .insert(nodes.map((node: any) => {
            // Если нода уже существовала - сохраняем её автора, иначе - текущий пользователь
            const existingAuthor = existingAuthors.get(node.id);
            return {
              ...node,
              flow_id: id,
              created_by: existingAuthor?.created_by || user.id,
              created_by_email: existingAuthor?.created_by_email || user.email,
            };
          }));

        if (nodesError) {
          console.error('Nodes insert error:', nodesError);
        }
      }
    }

    // Обновляем edges (delete + insert)
    if (edges !== undefined) {
      await supabase.from('flow_edges').delete().eq('flow_id', id);
      
      if (edges.length > 0) {
        const { error: edgesError } = await supabase
          .from('flow_edges')
          .insert(edges.map((edge: any) => ({
            ...edge,
            flow_id: id,
          })));

        if (edgesError) {
          console.error('Edges insert error:', edgesError);
        }
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Удаляем flow (cascades to nodes and edges)
    const { error: deleteError } = await supabase
      .from('flows')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete flow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
