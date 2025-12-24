import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/ideas/[id]/vote - Vote for an idea
export async function POST(
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

    // Check if idea exists
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', id)
      .single();

    if (ideaError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('idea_votes')
      .select('id')
      .eq('idea_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingVote) {
      // Remove vote (toggle)
      const { error: deleteError } = await supabase
        .from('idea_votes')
        .delete()
        .eq('idea_id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
      }

      // Get updated votes count
      const { data: updatedIdea } = await supabase
        .from('ideas')
        .select('votes_count')
        .eq('id', id)
        .single();

      return NextResponse.json({ 
        voted: false, 
        votesCount: updatedIdea?.votes_count || 0 
      });
    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from('idea_votes')
        .insert({
          idea_id: id,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error adding vote:', insertError);
        return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 });
      }

      // Get updated votes count
      const { data: updatedIdea } = await supabase
        .from('ideas')
        .select('votes_count')
        .eq('id', id)
        .single();

      return NextResponse.json({ 
        voted: true, 
        votesCount: updatedIdea?.votes_count || 0 
      });
    }
  } catch (error) {
    console.error('Error in POST /api/ideas/[id]/vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

