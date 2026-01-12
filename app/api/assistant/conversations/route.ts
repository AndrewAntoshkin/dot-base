import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET - List conversations
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user profile to get user_id (not auth.uid)
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!profile) {
      return NextResponse.json({ conversations: [], total: 0 });
    }

    // Build query
    let query = supabase
      .from('assistant_conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    const { data: conversations, count, error } = await query;

    if (error) {
      console.error('[Conversations] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      conversations: conversations || [],
      total: count || 0,
      favoritesCount: favoritesOnly ? count : undefined
    });
  } catch (error) {
    console.error('[Conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { title, messages } = body;

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create conversation
    const firstUserMessage = messages?.find((m: { role: string }) => m.role === 'user');
    const previewText = firstUserMessage?.content?.slice(0, 150) || null;
    const previewImage = firstUserMessage?.images?.[0] || null;

    const { data: conversation, error: convError } = await supabase
      .from('assistant_conversations')
      .insert({
        user_id: profile.id,
        title: title || previewText?.slice(0, 100) || 'Новый чат',
        preview_text: previewText,
        preview_image_url: previewImage
      })
      .select()
      .single();

    if (convError) {
      console.error('[Conversations] Create error:', convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // Insert messages if provided
    if (messages && messages.length > 0) {
      const messagesToInsert = messages.map((m: { role: string; content: string; images?: string[]; context?: object }) => ({
        conversation_id: conversation.id,
        role: m.role,
        content: m.content,
        images: m.images || null,
        context: m.context || null
      }));

      const { error: msgError } = await supabase
        .from('assistant_messages')
        .insert(messagesToInsert);

      if (msgError) {
        console.error('[Conversations] Messages insert error:', msgError);
        // Don't fail the whole request, conversation is created
      }
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[Conversations] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

