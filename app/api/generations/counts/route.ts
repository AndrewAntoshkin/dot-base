import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFullAuth } from '@/lib/supabase/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * Fast endpoint to get only tab counts
 * Uses optimized SQL function for single query instead of 4 parallel queries
 */
export async function GET() {
  try {
    // Используем кэшированный auth
    const auth = await getFullAuth();
    
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = auth.dbUser;
    const supabase = createServiceRoleClient();

    // Try optimized SQL function first (single query instead of 4)
    const { data: countsData, error: rpcError } = await supabase
      .rpc('get_generation_counts', { p_user_id: dbUser.id } as any)
      .single() as { data: { all_count: number; processing_count: number; favorites_count: number; failed_count: number } | null; error: any };

    if (!rpcError && countsData) {
      return NextResponse.json({
        all: Number(countsData.all_count) || 0,
        processing: Number(countsData.processing_count) || 0,
        favorites: Number(countsData.favorites_count) || 0,
        failed: Number(countsData.failed_count) || 0,
      });
    }

    // Fallback to parallel queries if function doesn't exist
    // IMPORTANT: Filter out keyframe segments to match list endpoint
    const [allCount, processingCount, favoritesCount, failedCount] = await Promise.all([
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .not('is_keyframe_segment', 'is', true),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .in('status', ['pending', 'processing'])
        .not('is_keyframe_segment', 'is', true),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .eq('is_favorite', true)
        .not('is_keyframe_segment', 'is', true),
      supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .eq('status', 'failed')
        .not('is_keyframe_segment', 'is', true),
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
