import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('assistant_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('assistant_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[Conversation] Messages error:', msgError);
    }

    return NextResponse.json({
      conversation,
      messages: messages || []
    });
  } catch (error) {
    console.error('[Conversation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update conversation (toggle favorite, update title, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { is_favorite, title } = body;

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (typeof is_favorite === 'boolean') {
      updateData.is_favorite = is_favorite;
    }
    if (title !== undefined) {
      updateData.title = title;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update conversation
    const { data: conversation, error } = await supabase
      .from('assistant_conversations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', profile.id)
      .select()
      .single();

    if (error) {
      console.error('[Conversation] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[Conversation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single() as { data: { id: string } | null };

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabase
      .from('assistant_conversations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      console.error('[Conversation] Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Conversation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
