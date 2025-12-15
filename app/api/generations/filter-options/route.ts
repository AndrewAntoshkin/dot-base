import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/generations/filter-options - Получить доступные опции для фильтров
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    // Получаем пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Базовый запрос для генераций
    let generationsQuery = adminClient
      .from('generations')
      .select('user_id, model_name');

    // Фильтруем по workspace если указан
    if (workspaceId) {
      generationsQuery = generationsQuery.eq('workspace_id', workspaceId);
    } else {
      // Без workspace - только свои генерации
      generationsQuery = generationsQuery.eq('user_id', dbUser.id);
    }

    const { data: generations } = await generationsQuery;

    if (!generations) {
      return NextResponse.json({ creators: [], models: [] });
    }

    // Получаем уникальные модели
    const uniqueModels = [...new Set(generations.map(g => g.model_name))].filter(Boolean).sort();

    // Получаем уникальных создателей
    const uniqueUserIds = [...new Set(generations.map(g => g.user_id))];
    
    let creators: { id: string; name: string }[] = [];
    
    if (uniqueUserIds.length > 0) {
      const { data: users } = await adminClient
        .from('users')
        .select('id, email, telegram_first_name')
        .in('id', uniqueUserIds);
      
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
