import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/notifications/read - mark notification(s) as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
    } else if (notificationId) {
      // Mark single notification as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Missing notificationId or markAll' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
