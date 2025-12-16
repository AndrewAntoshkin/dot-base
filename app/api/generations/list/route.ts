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

    // Workspace filters
    const workspaceId = searchParams.get('workspaceId');
    const onlyMine = searchParams.get('onlyMine') !== 'false'; // По умолчанию true
    
    // Filter by creator (для фильтра "Создатель")
    const creatorId = searchParams.get('creatorId');
    
    // Filter by model (legacy)
    const modelId = searchParams.get('modelId');
    
    // New filters
    const dateRange = searchParams.get('dateRange'); // today, yesterday, week, month
    const modelName = searchParams.get('modelName');
    const actionType = searchParams.get('actionType');
    const statusFilter = searchParams.get('status');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Получаем пользователя из нашей БД для workspace проверки
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query based on filters
    // Hide keyframe segments (only show final merge)
    // Using .not('is_keyframe_segment', 'is', true) instead of .or() for better index usage
    
    // Определяем какие поля выбирать - добавляем user info для workspace view
    const selectFields = workspaceId && !onlyMine
      ? 'id, user_id, status, output_urls, prompt, model_id, model_name, action, created_at, viewed, is_favorite, error_message, users!inner(email, telegram_first_name)'
      : 'id, user_id, status, output_urls, prompt, model_id, model_name, action, created_at, viewed, is_favorite, error_message';
    
    let query = supabase
      .from('generations')
      .select(selectFields)
      .not('is_keyframe_segment', 'is', true)
      .order('created_at', { ascending: false });
    
    // Фильтр по пространству или пользователю
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
      
      // Если onlyMine - показываем только свои
      if (onlyMine) {
        query = query.eq('user_id', dbUser.id);
      }
    } else {
      // Если нет workspace - показываем только свои (обратная совместимость)
      query = query.eq('user_id', dbUser.id);
    }
    
    // Фильтр по конкретному создателю (для фильтра "Создатель")
    if (creatorId) {
      query = query.eq('user_id', creatorId);
    }
    
    // Фильтр по модели (legacy)
    if (modelId) {
      query = query.eq('model_id', modelId);
    }
    
    // Фильтр по названию модели
    if (modelName) {
      query = query.eq('model_name', modelName);
    }
    
    // Фильтр по типу действия
    if (actionType) {
      // Поддерживаем частичное совпадение для групп (например video_ для всех видео)
      if (actionType.endsWith('_')) {
        query = query.like('action', `${actionType}%`);
      } else {
        query = query.eq('action', actionType);
      }
    }
    
    // Фильтр по статусу (отдельный от tab)
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    // Фильтр по дате
    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('created_at', startDate.toISOString()).lt('created_at', endYesterday.toISOString());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      if (dateRange !== 'yesterday') {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

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
      // Для workspace запросов или с любыми фильтрами - всегда используем fallback
      // RPC функция работает только для простого случая "мои генерации" без фильтров
      const hasFilters = creatorId || dateRange || modelName || actionType || statusFilter;
      const useRpc = !workspaceId && onlyMine && !hasFilters;
      
      if (useRpc) {
        // Try optimized SQL function first (single query instead of 4)
        const { data: countsData, error: rpcError } = await supabase
          .rpc('get_generation_counts', { p_user_id: dbUser.id } as any)
          .single() as { data: { all_count: number; processing_count: number; favorites_count: number; failed_count: number } | null; error: any };

        if (!rpcError && countsData) {
          counts = {
            all: Number(countsData.all_count) || 0,
            processing: Number(countsData.processing_count) || 0,
            favorites: Number(countsData.favorites_count) || 0,
            failed: Number(countsData.failed_count) || 0,
          };
        }
      }
      
      // Fallback: parallel count queries with filters
      if (!useRpc || counts.all === 0) {
        // Build base filter function with all active filters
        const buildCountQuery = () => {
          let q = supabase
          .from('generations')
          .select('id', { count: 'exact', head: true })
            .not('is_keyframe_segment', 'is', true);
          
          // Workspace/user filter
          if (workspaceId) {
            q = q.eq('workspace_id', workspaceId);
            if (onlyMine) {
              q = q.eq('user_id', dbUser.id);
            }
          } else {
            q = q.eq('user_id', dbUser.id);
          }
          
          // Creator filter
          if (creatorId) {
            q = q.eq('user_id', creatorId);
          }
          
          // Model filter
          if (modelName) {
            q = q.eq('model_name', modelName);
          }
          
          // Action type filter
          if (actionType) {
            if (actionType.endsWith('_')) {
              q = q.like('action', `${actionType}%`);
            } else {
              q = q.eq('action', actionType);
            }
          }
          
          // Status filter (separate from tab)
          if (statusFilter) {
            q = q.eq('status', statusFilter);
          }
          
          // Date range filter
          if (dateRange) {
            const now = new Date();
            let startDate: Date;
            
            switch (dateRange) {
              case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                q = q.gte('created_at', startDate.toISOString());
                break;
              case 'yesterday':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                q = q.gte('created_at', startDate.toISOString()).lt('created_at', endYesterday.toISOString());
                break;
              case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                q = q.gte('created_at', startDate.toISOString());
                break;
              case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                q = q.gte('created_at', startDate.toISOString());
                break;
            }
          }
          
          return q;
        };
        
        const [allCount, processingCount, favoritesCount, failedCount] = await Promise.all([
          buildCountQuery(),
          buildCountQuery().in('status', ['pending', 'processing']),
          buildCountQuery().eq('is_favorite', true),
          buildCountQuery().eq('status', 'failed'),
      ]);
      
      counts = {
        all: allCount.count || 0,
        processing: processingCount.count || 0,
        favorites: favoritesCount.count || 0,
        failed: failedCount.count || 0,
      };
      }
    }

    // Calculate total pages for current tab
    let totalForTab = counts.all;
    if (tab === 'processing') totalForTab = counts.processing;
    else if (tab === 'favorites') totalForTab = counts.favorites;
    else if (tab === 'failed') totalForTab = counts.failed;

    const totalPages = Math.ceil(totalForTab / limit) || 1;

    // Format response - flatten user data if present
    const generations = (data || []).map((gen: any) => {
      const { users, ...rest } = gen;
      return {
        ...rest,
        // Добавляем данные создателя если есть (для workspace view)
        creator: users ? {
          email: users.email,
          name: users.telegram_first_name || users.email?.split('@')[0] || 'User',
        } : undefined,
      };
    });

    return NextResponse.json({
      generations,
      total: totalForTab,
      page,
      limit,
      totalPages,
      counts,
      // Дополнительная информация для UI
      filters: {
        workspaceId,
        onlyMine,
        creatorId,
        modelId,
      },
    });
  } catch (error: any) {
    console.error('List generations error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке истории' },
      { status: 500 }
    );
  }
}
