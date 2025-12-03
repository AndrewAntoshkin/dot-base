import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Mark all existing generations as viewed using raw SQL
    const { data, error } = await supabase.rpc('mark_all_generations_viewed');

    if (error) {
      // Fallback: use direct update if RPC doesn't exist
      const now = new Date().toISOString();
      const { error: updateError, count } = await (supabase
        .from('generations') as any)
        .update({ viewed: true, viewed_at: now })
        .eq('viewed', false);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        markedCount: count,
        message: `Помечено ${count} генераций как просмотренные`,
      });
    }

    return NextResponse.json({
      success: true,
      markedCount: data,
      message: `Помечено ${data} генераций как просмотренные`,
    });
  } catch (error: any) {
    console.error('Mark all viewed error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




