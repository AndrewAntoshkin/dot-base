import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

// POST /api/support/reply - send reply to user's support request
// This creates a notification for the user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, title, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, message' },
        { status: 400 }
      );
    }

    // Create notification using admin client
    const adminSupabase = createAdminSupabaseClient();

    const { data: notification, error } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'support_reply',
        title: title || 'Ответ от поддержки',
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Support reply API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
