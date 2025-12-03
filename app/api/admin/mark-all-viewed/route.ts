import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Mark all existing generations as viewed
    const result = await supabase
      .from('generations')
      .update({ 
        viewed: true,
        viewed_at: new Date().toISOString()
      } as any)
      .eq('viewed', false);
    
    const { error, count } = result;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      markedCount: count,
      message: `Помечено ${count} генераций как просмотренные`,
    });
  } catch (error: any) {
    console.error('Mark all viewed error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




