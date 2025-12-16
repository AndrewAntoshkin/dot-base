import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
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
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get current favorite status
    const { data } = await supabase
      .from('generations')
      .select('is_favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const generation = data as { is_favorite: boolean } | null;

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Toggle favorite
    const newFavoriteStatus = !generation.is_favorite;

    const { error: updateError } = await (supabase
      .from('generations') as any)
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating favorite:', updateError);
      return NextResponse.json(
        { error: 'Failed to update favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      is_favorite: newFavoriteStatus 
    });
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

