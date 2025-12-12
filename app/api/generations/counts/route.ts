import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Fast endpoint to get only tab counts
 * Much faster than full list endpoint when only counts are needed
 */
export async function GET() {
  try {
    // Get current user from session
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get counts for all tabs (parallel queries for speed)
    const [allCount, processingCount, favoritesCount, failedCount] = await Promise.all([
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing']),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_favorite', true),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'failed'),
    ]);

    return NextResponse.json({
      all: allCount.count || 0,
      processing: processingCount.count || 0,
      favorites: favoritesCount.count || 0,
      failed: failedCount.count || 0,
    });
  } catch (error: any) {
    console.error('Get counts error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении счётчиков' },
      { status: 500 }
    );
  }
}







