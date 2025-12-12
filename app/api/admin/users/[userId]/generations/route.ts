import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/users/[userId]/generations
 * Get generations for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin access
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createServiceRoleClient();
    
    // Get user generations
    const { data: generations, error: genError } = await supabase
      .from('generations')
      .select('id, model_name, cost_credits, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (genError) {
      console.error('Error fetching user generations:', genError);
      return NextResponse.json(
        { error: 'Failed to fetch generations' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: generations || [] });
  } catch (error) {
    console.error('Admin user generations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






