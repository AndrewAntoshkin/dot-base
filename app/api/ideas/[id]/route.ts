import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/ideas/[id] - Get a single idea
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: idea, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check if user has voted
    const { data: { user } } = await supabase.auth.getUser();
    let hasVoted = false;

    if (user) {
      const { data: vote } = await supabase
        .from('idea_votes')
        .select('id')
        .eq('idea_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      hasVoted = !!vote;
    }

    return NextResponse.json({ idea, hasVoted });
  } catch (error) {
    console.error('Error in GET /api/ideas/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ideas/[id] - Delete an idea (author or super_admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the idea to check ownership
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check if user is the author
    const isAuthor = idea.user_id === user.id;

    // Check if user is super_admin
    const adminClient = createServiceRoleClient();
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null };

    const isSuperAdmin = userData?.role === 'super_admin';

    if (!isAuthor && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the idea (use admin client to bypass RLS for super_admin)
    if (isSuperAdmin && !isAuthor) {
      const { error: deleteError } = await adminClient
        .from('ideas')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting idea:', deleteError);
        return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
      }
    } else {
      const { error: deleteError } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting idea:', deleteError);
        return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/ideas/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

