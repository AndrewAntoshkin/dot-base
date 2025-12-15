import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/filter-options
 * Get options for dashboard filters (workspaces, users)
 */
export async function GET() {
  try {
    // Check admin access
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    const supabase = createServiceRoleClient();
    
    // Получаем workspaces и users параллельно
    const [workspacesResult, usersResult] = await Promise.all([
      supabase
        .from('workspaces')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('users')
        .select('id, email, telegram_first_name')
        .eq('is_active', true)
        .order('email'),
    ]);
    
    const workspaces = (workspacesResult.data || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
    }));
    
    const users = (usersResult.data || []).map((u: any) => ({
      id: u.id,
      name: u.telegram_first_name || u.email?.split('@')[0] || 'User',
      email: u.email,
    }));
    
    return NextResponse.json({
      workspaces,
      users,
    });
  } catch (error) {
    console.error('Admin filter options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
