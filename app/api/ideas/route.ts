import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/ideas - Get all ideas
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*')
      .order('votes_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ideas:', error);
      return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
    }

    // Check if user is authenticated to get their votes
    const { data: { user } } = await supabase.auth.getUser();
    
    let userVotes: string[] = [];
    if (user) {
      const { data: votes } = await supabase
        .from('idea_votes')
        .select('idea_id')
        .eq('user_id', user.id);
      
      userVotes = votes?.map(v => v.idea_id) || [];
    }

    return NextResponse.json({ 
      ideas: ideas || [],
      userVotes 
    });
  } catch (error) {
    console.error('Error in GET /api/ideas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ideas - Create a new idea (anonymous)
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { title, description } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 255) {
      return NextResponse.json({ error: 'Title is too long' }, { status: 400 });
    }

    const { data: idea, error } = await supabase
      .from('ideas')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating idea:', error);
      return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error in POST /api/ideas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

