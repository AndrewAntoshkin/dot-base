import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Tab filter types
type TabFilter = 'all' | 'processing' | 'favorites' | 'failed';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const action = searchParams.get('action');
    const tab = (searchParams.get('tab') || 'all') as TabFilter;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query based on tab filter
    // Hide keyframe segments (only show final merge) - uses indexed boolean column
    let query = supabase
      .from('generations')
      .select('id, status, output_urls, prompt, model_id, model_name, action, created_at, viewed, is_favorite, error_message')
      .eq('user_id', user.id)
      .or('is_keyframe_segment.is.null,is_keyframe_segment.eq.false')
      .order('created_at', { ascending: false });

    // Apply tab filter
    switch (tab) {
      case 'processing':
        query = query.in('status', ['pending', 'processing']);
        break;
      case 'favorites':
        query = query.eq('is_favorite', true);
        break;
      case 'failed':
        query = query.eq('status', 'failed');
        break;
      // 'all' - no additional filter
    }

    if (action) {
      query = query.eq('action', action);
    }

    // Get paginated data
    const { data, error } = await query.range(from, to);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Ошибка при загрузке истории' }, { status: 500 });
    }

    // Get counts - skip if not needed (для silent polling можно пропустить)
    const skipCounts = searchParams.get('skipCounts') === 'true';
    
    let counts = { all: 0, processing: 0, favorites: 0, failed: 0 };
    
    if (!skipCounts) {
      // Parallel count queries - all use indexed is_keyframe_segment column
      const [allCount, processingCount, favoritesCount, failedCount] = await Promise.all([
        supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .or('is_keyframe_segment.is.null,is_keyframe_segment.eq.false'),
        supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing'])
          .or('is_keyframe_segment.is.null,is_keyframe_segment.eq.false'),
        supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_favorite', true)
          .or('is_keyframe_segment.is.null,is_keyframe_segment.eq.false'),
        supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'failed')
          .or('is_keyframe_segment.is.null,is_keyframe_segment.eq.false'),
      ]);
      
      counts = {
        all: allCount.count || 0,
        processing: processingCount.count || 0,
        favorites: favoritesCount.count || 0,
        failed: failedCount.count || 0,
      };
    }

    // Calculate total pages for current tab
    let totalForTab = counts.all;
    if (tab === 'processing') totalForTab = counts.processing;
    else if (tab === 'favorites') totalForTab = counts.favorites;
    else if (tab === 'failed') totalForTab = counts.failed;

    const totalPages = Math.ceil(totalForTab / limit) || 1;

    return NextResponse.json({
      generations: data || [],
      total: totalForTab,
      page,
      limit,
      totalPages,
      counts,
    });
  } catch (error: any) {
    console.error('List generations error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке истории' },
      { status: 500 }
    );
  }
}
