import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { FlowWorkspaceStatus } from '@/lib/flow/types';

const VALID_STATUSES: FlowWorkspaceStatus[] = ['in_progress', 'review', 'done', 'archived'];

interface FlowRow {
  id: string;
  user_id: string;
  workspace_id?: string;
}

interface FlowMemberRow {
  role: string;
}

// PATCH: Обновление статуса флоу (для drag-and-drop в Kanban)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: flowId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body as { status: FlowWorkspaceStatus };

    // Валидация статуса
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Получаем флоу для проверки прав (используем * для получения всех полей включая workspace_id)
    const { data: flowData } = await adminClient
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (!flowData) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const flow = flowData as unknown as FlowRow;

    // Проверяем права доступа
    let hasAccess = flow.user_id === user.id;

    // Проверяем участие в пространстве
    if (!hasAccess && flow.workspace_id) {
      const { data: membership } = await adminClient
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', flow.workspace_id)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!membership;
    }

    // Проверяем участие во флоу
    if (!hasAccess) {
      const { data: flowMember } = await adminClient
        .from('flow_members')
        .select('role')
        .eq('flow_id', flowId)
        .eq('user_id', user.id)
        .single();
      
      const member = flowMember as unknown as FlowMemberRow | null;
      hasAccess = member?.role === 'owner' || member?.role === 'editor';
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Обновляем статус
    const updateData = { 
      status, 
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await adminClient
      .from('flows')
      .update(updateData as never)
      .eq('id', flowId);

    if (updateError) {
      console.error('Error updating flow status:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });

  } catch (error) {
    console.error('Update flow status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
