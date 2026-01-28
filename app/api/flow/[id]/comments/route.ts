import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { FlowComment, FlowCommentWithUser } from '@/lib/flow/types';

// GET - получить все комментарии flow
export async function GET(
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

    // Проверяем доступ к flow
    const hasAccess = await checkFlowAccess(adminClient, flowId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Получаем комментарии
    const { data: comments, error } = await adminClient
      .from('flow_comments')
      .select('*')
      .eq('flow_id', flowId)
      .order('created_at', { ascending: true }) as { data: FlowComment[] | null; error: any };

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    // Получаем уникальные user_id
    const userIds = [...new Set(comments.map(c => c.user_id))];
    
    // Получаем данные пользователей отдельным запросом
    const { data: users } = await adminClient
      .from('users')
      .select('id, email, avatar_url, display_name')
      .in('id', userIds);
    
    // Создаем map пользователей
    const usersMap = new Map((users || []).map(u => [u.id, u]));

    // Добавляем данные пользователя к каждому комментарию
    const commentsWithUser = comments.map((c: any) => {
      const userData = usersMap.get(c.user_id);
      return {
        ...c,
        user_email: userData?.email || 'Unknown',
        user_avatar_url: userData?.avatar_url || null,
        user_display_name: userData?.display_name || null,
      };
    });

    return NextResponse.json({ comments: commentsWithUser });
  } catch (error) {
    console.error('Error in GET /api/flow/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать комментарий
export async function POST(
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

    // Проверяем доступ к flow
    const hasAccess = await checkFlowAccess(adminClient, flowId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { content, node_id, parent_id, position_x, position_y } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Создаём комментарий
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error } = await (adminClient as any)
      .from('flow_comments')
      .insert({
        flow_id: flowId,
        user_id: user.id,
        content: content.trim(),
        node_id: node_id || null,
        parent_id: parent_id || null,
        position_x: position_x ?? null,
        position_y: position_y ?? null,
        read_by: [user.id], // Автор сразу прочитал
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Получаем профиль пользователя для avatar_url
    const { data: userProfile } = await adminClient
      .from('users')
      .select('avatar_url, display_name')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ 
      comment: {
        ...comment,
        user_email: user.email,
        user_avatar_url: userProfile?.avatar_url || null,
        user_display_name: userProfile?.display_name || null,
      }
    });
  } catch (error) {
    console.error('Error in POST /api/flow/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Проверка доступа к flow
async function checkFlowAccess(adminClient: any, flowId: string, userId: string): Promise<boolean> {
  // Проверяем владельца
  const { data: flow } = await adminClient
    .from('flows')
    .select('user_id, workspace_id')
    .eq('id', flowId)
    .single();

  if (!flow) return false;
  if (flow.user_id === userId) return true;

  // Проверяем участие в пространстве
  if (flow.workspace_id) {
    const { data: workspaceMember } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', flow.workspace_id)
      .eq('user_id', userId)
      .single();
    
    if (workspaceMember) return true;
  }

  // Проверяем участие во flow
  const { data: flowMember } = await adminClient
    .from('flow_members')
    .select('id')
    .eq('flow_id', flowId)
    .eq('user_id', userId)
    .single();

  return !!flowMember;
}
