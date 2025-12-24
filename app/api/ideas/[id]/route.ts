import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
        .single();
      
      hasVoted = !!vote;
    }

    return NextResponse.json({ idea, hasVoted });
  } catch (error) {
    console.error('Error in GET /api/ideas/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

