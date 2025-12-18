import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFullAuth } from '@/lib/supabase/auth-helpers';

// GET /api/users/profile - Get current user's profile
export async function GET() {
  try {
    // Используем кэшированный auth - данные уже есть в dbUser
    const auth = await getFullAuth();
    
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Получаем полный профиль (dbUser содержит только базовые поля)
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, cover_url, role, created_at')
      .eq('id', auth.dbUser.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    // Используем кэшированный auth
    const auth = await getFullAuth();
    
    if (!auth.isAuthenticated || !auth.dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, avatar_url, cover_url } = body;

    // Build update object with only provided fields
    const updateData: Record<string, string | null> = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (cover_url !== undefined) updateData.cover_url = cover_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    const { data: profile, error } = await (supabase
      .from('users') as any)
      .update(updateData)
      .eq('id', auth.dbUser.id)
      .select('id, email, display_name, avatar_url, cover_url, role, created_at')
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
