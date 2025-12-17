import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/workspaces - Список пространств пользователя
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Используем service role для надёжного доступа
    const adminClient = createServiceRoleClient();

    // Получаем пользователя из нашей таблицы
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Для super_admin - все пространства, для остальных - только свои
    let workspaces: any[] | null = null;
    let error: any = null;

    if (dbUser.role === 'super_admin') {
      // Super admin видит все пространства
      const result = await adminClient
        .from('workspaces')
        .select(`
          id,
          name,
          slug,
          description,
          created_at,
          is_active,
          workspace_members (
            role,
            user_id
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      workspaces = result.data as any[];
      error = result.error;
    } else {
      // Обычный пользователь - только свои пространства через join
      const result = await adminClient
        .from('workspace_members')
        .select(`
          role,
          workspaces!inner (
            id,
            name,
            slug,
            description,
            created_at,
            is_active
          )
        `)
        .eq('user_id', dbUser.id)
        .eq('workspaces.is_active', true);
      
      // Преобразуем формат данных
      if (result.data) {
        workspaces = (result.data as any[]).map((item: any) => ({
          ...item.workspaces,
          workspace_members: [{ role: item.role, user_id: dbUser.id }]
        }));
      }
      error = result.error;
    }

    if (error) {
      logger.error('Error fetching workspaces:', error);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    // Получаем участников для каждого workspace (первые 4 для отображения)
    const workspaceIds = workspaces?.map((ws: any) => ws.id) || [];
    
    let membersMap: Record<string, any[]> = {};
    
    if (workspaceIds.length > 0) {
      // Сначала получаем всех членов
      const { data: allMembers } = await adminClient
        .from('workspace_members')
        .select('workspace_id, user_id')
        .in('workspace_id', workspaceIds) as { data: { workspace_id: string; user_id: string }[] | null };
      
      if (allMembers && allMembers.length > 0) {
        // Получаем уникальные user_id
        const userIds = [...new Set(allMembers.map(m => m.user_id))];
        
        // Получаем данные пользователей отдельным запросом
        const { data: users } = await adminClient
          .from('users')
          .select('id, email, telegram_first_name')
          .in('id', userIds) as { data: { id: string; email: string; telegram_first_name: string | null }[] | null };
        
        const usersMap = new Map(users?.map(u => [u.id, u]) || []);
        
        // Группируем по workspace_id
        allMembers.forEach((m) => {
          if (!membersMap[m.workspace_id]) {
            membersMap[m.workspace_id] = [];
          }
          const userInfo = usersMap.get(m.user_id);
          membersMap[m.workspace_id].push({
            id: m.user_id,
            name: userInfo?.telegram_first_name || userInfo?.email?.split('@')[0] || 'User',
          });
        });
      }
    }

    // Получаем количество генераций для каждого workspace
    let generationsCountMap: Record<string, number> = {};
    
    if (workspaceIds.length > 0) {
      // Используем отдельные count запросы для точного подсчёта
      const countPromises = workspaceIds.map(async (wsId: string) => {
        const { count } = await adminClient
          .from('generations')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', wsId);
        return { wsId, count: count || 0 };
      });
      
      const counts = await Promise.all(countPromises);
      counts.forEach(({ wsId, count }) => {
        generationsCountMap[wsId] = count;
      });
    }

    // Форматируем ответ
    const formattedWorkspaces = workspaces?.map((ws: any) => {
      const memberInfo = ws.workspace_members?.find((m: any) => m.user_id === dbUser.id);
      const wsMembers = membersMap[ws.id] || [];
      
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        created_at: ws.created_at,
        member_role: memberInfo?.role || (dbUser.role === 'super_admin' ? 'owner' : 'member'),
        member_count: wsMembers.length || ws.workspace_members?.length || 0,
        generations_count: generationsCountMap[ws.id] || 0,
        members: wsMembers.slice(0, 4), // Первые 4 для avatar group
      };
    }) || [];

    return NextResponse.json({
      workspaces: formattedWorkspaces,
      user_role: dbUser.role,
    });
  } catch (error) {
    logger.error('Error in GET /api/workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/workspaces - Создать пространство (только admin/super_admin)
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();

    // Проверяем роль пользователя
    const { data: dbUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', user.email as string)
      .single() as { data: { id: string; role: string } | null };

    if (!dbUser || !['admin', 'super_admin'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, members } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Генерируем slug из названия с транслитерацией
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    
    const slug = name
      .toLowerCase()
      .split('')
      .map((char: string) => translitMap[char] || char)
      .join('')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) || `workspace-${Date.now()}`;

    // Проверяем уникальность slug
    const { data: existingWorkspace } = await adminClient
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single() as { data: { id: string } | null };

    if (existingWorkspace) {
      return NextResponse.json({ error: 'Workspace with this name already exists' }, { status: 400 });
    }

    // Создаём пространство
    const { data: workspace, error: createError } = await (adminClient
      .from('workspaces') as any)
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        created_by: dbUser.id,
      })
      .select()
      .single() as { data: { id: string; name: string; slug: string; description: string | null; created_at: string } | null; error: any };

    if (createError || !workspace) {
      logger.error('Error creating workspace:', createError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Добавляем создателя как owner
    await (adminClient.from('workspace_members') as any)
      .insert({
        workspace_id: workspace.id,
        user_id: dbUser.id,
        role: 'owner',
        invited_by: dbUser.id,
      });

    // Добавляем участников если указаны
    if (members && Array.isArray(members) && members.length > 0) {
      // Находим пользователей по email
      const { data: usersToAdd } = await adminClient
        .from('users')
        .select('id, email')
        .in('email', members.filter((m: string) => m !== user.email)) as { data: { id: string; email: string }[] | null };

      if (usersToAdd && usersToAdd.length > 0) {
        const memberInserts = usersToAdd.map(u => ({
          workspace_id: workspace.id,
          user_id: u.id,
          role: 'member' as const,
          invited_by: dbUser.id,
        }));

        await (adminClient.from('workspace_members') as any).insert(memberInserts);
      }
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        created_at: workspace.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/workspaces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
