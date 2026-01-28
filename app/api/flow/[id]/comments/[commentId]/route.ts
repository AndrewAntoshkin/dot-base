import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// PATCH - обновить комментарий
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: flowId, commentId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем комментарий
    const { data: existingComment, error: fetchError } = await adminClient
      .from('flow_comments')
      .select('*')
      .eq('id', commentId)
      .eq('flow_id', flowId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content, is_resolved, mark_as_read } = body;

    const updates: any = {};

    // Обновить контент может только автор
    if (content !== undefined) {
      if (existingComment.user_id !== user.id) {
        return NextResponse.json({ error: 'Only author can edit content' }, { status: 403 });
      }
      updates.content = content.trim();
    }

    // Resolve/unresolve может владелец flow или автор комментария
    if (is_resolved !== undefined) {
      const { data: flow } = await adminClient
        .from('flows')
        .select('user_id')
        .eq('id', flowId)
        .single();

      if (existingComment.user_id !== user.id && flow?.user_id !== user.id) {
        return NextResponse.json({ error: 'No permission to resolve' }, { status: 403 });
      }
      updates.is_resolved = is_resolved;
    }

    // Отметить как прочитанный - добавляем user_id в read_by
    if (mark_as_read) {
      const readBy = existingComment.read_by || [];
      if (!readBy.includes(user.id)) {
        updates.read_by = [...readBy, user.id];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ comment: existingComment });
    }

    const { data: comment, error: updateError } = await adminClient
      .from('flow_comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error in PATCH /api/flow/[id]/comments/[commentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить комментарий
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: flowId, commentId } = await params;
    const supabase = await createServerSupabaseClient();
    const adminClient = createServiceRoleClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем комментарий
    const { data: existingComment, error: fetchError } = await adminClient
      .from('flow_comments')
      .select('user_id')
      .eq('id', commentId)
      .eq('flow_id', flowId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Проверяем права (автор или владелец flow)
    const { data: flow } = await adminClient
      .from('flows')
      .select('user_id')
      .eq('id', flowId)
      .single();

    if (existingComment.user_id !== user.id && flow?.user_id !== user.id) {
      return NextResponse.json({ error: 'No permission to delete' }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('flow_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/flow/[id]/comments/[commentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
