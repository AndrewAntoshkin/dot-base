import { NextResponse } from 'next/server';
import { checkAdminAccess, getAdminStats } from '@/lib/admin';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
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
    
    // Get stats
    const stats = await getAdminStats();
    
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


