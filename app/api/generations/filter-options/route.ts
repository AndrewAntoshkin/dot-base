import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFullAuth } from '@/lib/supabase/auth-helpers';

export const dynamic = 'force-dynamic';

// GET /api/generations/filter-options - Получить доступные опции для фильтров
// ОПТИМИЗИРОВАНО: Используем RPC функцию для получения уникальных значений
export async function GET(request: NextRequest) {
  try {
    const auth = await getFullAuth();
    
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    // Используем оптимизированные запросы с DISTINCT
    // Это намного быстрее чем загружать все записи
    
    let modelsQuery = adminClient
      .from('generations')
      .select('model_name')
      .not('model_name', 'is', null)
      .not('is_keyframe_segment', 'is', true);

    let creatorsQuery = adminClient
      .from('generations')
      .select('user_id')
      .not('is_keyframe_segment', 'is', true);

    // Фильтруем по workspace если указан
    if (workspaceId) {
      modelsQuery = modelsQuery.eq('workspace_id', workspaceId);
      creatorsQuery = creatorsQuery.eq('workspace_id', workspaceId);
    } else {
      // Без workspace - только свои генерации
      modelsQuery = modelsQuery.eq('user_id', auth.dbUser.id);
      creatorsQuery = creatorsQuery.eq('user_id', auth.dbUser.id);
    }

    // Выполняем запросы параллельно, но ограничиваем результат
    // Limit 1000 для безопасности, потом уникализируем на клиенте
    const [modelsResult, creatorsResult] = await Promise.all([
      modelsQuery.limit(1000),
      creatorsQuery.limit(1000),
    ]);

    // Извлекаем уникальные модели
    const uniqueModels = [...new Set(
      (modelsResult.data || []).map((g: { model_name: string }) => g.model_name)
    )].filter(Boolean).sort();

    // Извлекаем уникальных создателей
    const uniqueUserIds = [...new Set(
      (creatorsResult.data || []).map((g: { user_id: string }) => g.user_id)
    )];
    
    let creators: { id: string; name: string }[] = [];
    
    if (uniqueUserIds.length > 0 && uniqueUserIds.length <= 100) {
      // Ограничиваем до 100 создателей для производительности
      const { data: users } = await adminClient
        .from('users')
        .select('id, email, telegram_first_name')
        .in('id', uniqueUserIds.slice(0, 100)) as { data: { id: string; email: string; telegram_first_name: string | null }[] | null };
      
      if (users) {
        creators = users.map(u => ({
          id: u.id,
          name: u.telegram_first_name || u.email?.split('@')[0] || 'Unknown'
        })).sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return NextResponse.json({
      creators,
      models: uniqueModels,
    });
  } catch (error) {
    console.error('Error in GET /api/generations/filter-options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
