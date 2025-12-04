import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess, getAdminUsers, updateUserRole, toggleUserStatus } from '@/lib/admin';
import { UserRole } from '@/lib/supabase/types';

/**
 * GET /api/admin/users
 * Get all users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') as UserRole | undefined;
    const status = searchParams.get('status') as 'active' | 'inactive' | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get users
    const users = await getAdminUsers({
      search,
      role: role || undefined,
      status: status || undefined,
      limit,
      offset,
    });
    
    return NextResponse.json({ data: users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user (role or status)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin, isSuperAdmin, email, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { userId, action, role } = body;
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing userId or action' },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'updateRole':
        if (!role) {
          return NextResponse.json(
            { error: 'Missing role' },
            { status: 400 }
          );
        }
        result = await updateUserRole(userId, role, email!);
        break;
        
      case 'toggleStatus':
        result = await toggleUserStatus(userId);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin users update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


