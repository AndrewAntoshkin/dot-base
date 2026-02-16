import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFullAuth } from '@/lib/supabase/auth-helpers';

export const dynamic = 'force-dynamic';

// Tab filter types
type TabFilter = 'all' | 'processing' | 'favorites' | 'failed';

// Прямой fetch к Supabase REST API - в 100 раз быстрее чем JS клиент
async function directSupabaseFetch<T>(
  endpoint: string,
  options?: { count?: boolean }
): Promise<{ data: T | null; count: number | null; error: string | null }> {
  const headers: Record<string, string> = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
  };
  
  if (options?.count) {
    headers['Prefer'] = 'count=exact';
  }
  
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${endpoint}`,
      { headers, cache: 'no-store' }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[DirectFetch] Error:', res.status, errorText);
      return { data: null, count: null, error: errorText };
    }
    
    const data = await res.json();
    const countHeader = res.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1]) : null;
    
    return { data, count, error: null };
  } catch (error: any) {
    console.error('[DirectFetch] Exception:', error);
    return { data: null, count: null, error: error.message };
  }
}

// Строим URL параметры для запроса
function buildQueryParams(params: {
  userId: string;
  workspaceId?: string | null;
  onlyMine: boolean;
  creatorId?: string | null;
  modelId?: string | null;
  modelName?: string | null;
  actionType?: string | null;
  statusFilter?: string | null;
  dateRange?: string | null;
  tab: TabFilter;
  action?: string | null;
  limit: number;
  offset: number;
  selectFields: string;
  forCount?: boolean;
}): string {
  const parts: string[] = [];
  
  // Select fields
  if (params.forCount) {
    parts.push('select=id');
  } else {
    parts.push(`select=${encodeURIComponent(params.selectFields)}`);
  }
  
  // Фильтр по keyframe segments и video_keyframes
  // Важно: этот фильтр должен соответствовать partial index
  parts.push('is_keyframe_segment=is.false');
  parts.push('action=neq.video_keyframes');
  
  // Workspace/user filter
  if (params.workspaceId) {
    parts.push(`workspace_id=eq.${params.workspaceId}`);
    if (params.onlyMine) {
      parts.push(`user_id=eq.${params.userId}`);
    }
  } else {
    parts.push(`user_id=eq.${params.userId}`);
  }
  
  // Creator filter
  if (params.creatorId) {
    parts.push(`user_id=eq.${params.creatorId}`);
  }
  
  // Model filters
  if (params.modelId) {
    parts.push(`model_id=eq.${params.modelId}`);
  }
  if (params.modelName) {
    parts.push(`model_name=eq.${encodeURIComponent(params.modelName)}`);
  }
  
  // Action type filter
  if (params.actionType) {
    if (params.actionType.endsWith('_')) {
      parts.push(`action=like.${params.actionType}*`);
    } else {
      parts.push(`action=eq.${params.actionType}`);
    }
  }
  
  // Status filter
  if (params.statusFilter) {
    parts.push(`status=eq.${params.statusFilter}`);
  }
  
  // Date range filter
  if (params.dateRange) {
    const now = new Date();
    let startDate: Date;
    
    switch (params.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        parts.push(`created_at=gte.${startDate.toISOString()}`);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        parts.push(`created_at=gte.${startDate.toISOString()}`);
        parts.push(`created_at=lt.${endYesterday.toISOString()}`);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        parts.push(`created_at=gte.${startDate.toISOString()}`);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        parts.push(`created_at=gte.${startDate.toISOString()}`);
        break;
    }
  }
  
  // Tab filter
  switch (params.tab) {
    case 'processing':
      parts.push('status=in.(pending,processing)');
      break;
    case 'favorites':
      parts.push('is_favorite=eq.true');
      break;
    case 'failed':
      parts.push('status=eq.failed');
      break;
  }
  
  // Action filter
  if (params.action) {
    parts.push(`action=eq.${params.action}`);
  }
  
  // Ordering
  parts.push('order=created_at.desc');
  
  // Pagination (только для не-count запросов)
  if (!params.forCount) {
    parts.push(`limit=${params.limit}`);
    parts.push(`offset=${params.offset}`);
  }
  
  return 'generations?' + parts.join('&');
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  
  try {
    // Auth check
    const authStart = Date.now();
    const auth = await getFullAuth();
    timings.auth = Date.now() - authStart;
    
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = auth.dbUser;
    const { searchParams } = new URL(request.url);
    
    // Parse params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const action = searchParams.get('action');
    const tab = (searchParams.get('tab') || 'all') as TabFilter;
    const workspaceId = searchParams.get('workspaceId');
    const onlyMine = searchParams.get('onlyMine') !== 'false';
    const creatorId = searchParams.get('creatorId');
    const modelId = searchParams.get('modelId');
    const dateRange = searchParams.get('dateRange');
    const modelName = searchParams.get('modelName');
    const actionType = searchParams.get('actionType');
    const statusFilter = searchParams.get('status');
    const skipCounts = searchParams.get('skipCounts') === 'true';
    
    const offset = (page - 1) * limit;
    
    // Select fields - убрали settings для ускорения (большой JSON)
    const selectFields = workspaceId && !onlyMine
      ? 'id,user_id,status,output_urls,output_thumbs,prompt,model_id,model_name,action,created_at,viewed,is_favorite,error_message,users!inner(email,telegram_first_name)'
      : 'id,user_id,status,output_urls,output_thumbs,prompt,model_id,model_name,action,created_at,viewed,is_favorite,error_message';
    
    const baseParams = {
      userId: dbUser.id,
      workspaceId,
      onlyMine,
      creatorId,
      modelId,
      modelName,
      actionType,
      statusFilter,
      dateRange,
      tab,
      action,
      limit,
      offset,
      selectFields,
    };
    
    // Main query - прямой fetch к REST API
    const queryStart = Date.now();
    const queryEndpoint = buildQueryParams(baseParams);
    const { data, error } = await directSupabaseFetch<any[]>(queryEndpoint);
    timings.query = Date.now() - queryStart;
    
    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Ошибка при загрузке истории' }, { status: 500 });
    }
    
    // Counts
    const countsStart = Date.now();
    let counts = { all: 0, processing: 0, favorites: 0, failed: 0 };
    
    if (!skipCounts) {
      const supabase = createServiceRoleClient();
      const hasFilters = creatorId || dateRange || modelName || actionType || statusFilter;
      
      // Try RPC first (намного быстрее чем 4 отдельных count запроса)
      if (!hasFilters) {
        if (workspaceId) {
          const { data: countsData, error: rpcError } = await supabase
            .rpc('get_workspace_generation_counts', { 
              p_workspace_id: workspaceId, 
              p_user_id: onlyMine ? dbUser.id : null 
            } as any)
            .single() as { data: any; error: any };

          if (!rpcError && countsData) {
            counts = {
              all: Number(countsData.all_count) || 0,
              processing: Number(countsData.processing_count) || 0,
              favorites: Number(countsData.favorites_count) || 0,
              failed: Number(countsData.failed_count) || 0,
            };
          }
        } else {
          const { data: countsData, error: rpcError } = await supabase
            .rpc('get_generation_counts', { p_user_id: dbUser.id } as any)
            .single() as { data: any; error: any };

          if (!rpcError && countsData) {
            counts = {
              all: Number(countsData.all_count) || 0,
              processing: Number(countsData.processing_count) || 0,
              favorites: Number(countsData.favorites_count) || 0,
              failed: Number(countsData.failed_count) || 0,
            };
          }
        }
      }
      
      // Fallback to direct count queries
      if (hasFilters || counts.all === 0) {
        const countBaseParams = { ...baseParams, forCount: true };
        
        const [allRes, processingRes, favoritesRes, failedRes] = await Promise.all([
          directSupabaseFetch<any[]>(buildQueryParams({ ...countBaseParams, tab: 'all' as TabFilter }), { count: true }),
          directSupabaseFetch<any[]>(buildQueryParams({ ...countBaseParams, tab: 'processing' as TabFilter }), { count: true }),
          directSupabaseFetch<any[]>(buildQueryParams({ ...countBaseParams, tab: 'favorites' as TabFilter }), { count: true }),
          directSupabaseFetch<any[]>(buildQueryParams({ ...countBaseParams, tab: 'failed' as TabFilter }), { count: true }),
        ]);
        
        counts = {
          all: allRes.count || 0,
          processing: processingRes.count || 0,
          favorites: favoritesRes.count || 0,
          failed: failedRes.count || 0,
        };
      }
    }
    timings.counts = Date.now() - countsStart;
    
    // Calculate pagination
    let totalForTab = counts.all;
    if (tab === 'processing') totalForTab = counts.processing;
    else if (tab === 'favorites') totalForTab = counts.favorites;
    else if (tab === 'failed') totalForTab = counts.failed;
    const totalPages = Math.ceil(totalForTab / limit) || 1;
    
    // Format response
    const generations = (data || []).map((gen: any) => {
      const { users, ...rest } = gen;
      return {
        ...rest,
        creator: users ? {
          email: users.email,
          name: users.telegram_first_name || users.email?.split('@')[0] || 'User',
        } : undefined,
      };
    });
    
    timings.total = Date.now() - startTime;
    
    return NextResponse.json({
      generations,
      total: totalForTab,
      page,
      limit,
      totalPages,
      counts,
      filters: { workspaceId, onlyMine, creatorId, modelId },
      _timings: process.env.NODE_ENV === 'development' ? timings : undefined,
    });
  } catch (error: any) {
    console.error('List generations error:', error);
    return NextResponse.json({ error: 'Ошибка при загрузке истории' }, { status: 500 });
  }
}
