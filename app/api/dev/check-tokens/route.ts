import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DEV ONLY: Check Replicate tokens
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: tokens, error } = await supabase
      .from('replicate_tokens')
      .select('id, is_active, request_count, error_count, last_used_at, created_at');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      total: tokens?.length || 0,
      tokens: tokens || [],
      active_count: tokens?.filter(t => t.is_active).length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

