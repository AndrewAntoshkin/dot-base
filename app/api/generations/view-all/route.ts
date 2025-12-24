import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Помечаем все непросмотренные генерации как просмотренные
    const { error } = await supabase
      .from('generations')
      .update({ viewed: true })
      .eq('user_id', user.id)
      .eq('viewed', false);

    if (error) {
      console.error('Error marking all as viewed:', error);
      return NextResponse.json({ error: 'Failed to mark all as viewed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in view-all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

