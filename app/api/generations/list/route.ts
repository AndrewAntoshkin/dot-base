import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // ВРЕМЕННО: убрана авторизация для разработки
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    // Уменьшен лимит для ускорения
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    const action = searchParams.get('action');
    const status = searchParams.get('status');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Убран count: 'exact' - он очень медленный!
    // Выбираем только нужные поля
    let query = supabase
      .from('generations')
      .select('id, status, output_urls, prompt, model_id, model_name, action, created_at, viewed')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (action) {
      query = query.eq('action', action);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      generations: data || [],
      total: data?.length || 0,
      page,
      limit,
      totalPages: 1, // Упрощено для скорости
    });
  } catch (error: any) {
    console.error('List generations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

