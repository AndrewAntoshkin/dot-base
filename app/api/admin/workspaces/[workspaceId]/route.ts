import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/workspaces/[workspaceId]
 * Delete (deactivate) a workspace
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    
    // Check admin access
    const { isAdmin, isSuperAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    // Only super admins can delete workspaces
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can delete workspaces' },
        { status: 403 }
      );
    }
    
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createServiceRoleClient();
    
    // Soft delete - set is_active to false
    const { error: deleteError } = await (supabase
      .from('workspaces') as any)
      .update({ is_active: false })
      .eq('id', workspaceId);
    
    if (deleteError) {
      console.error('Error deleting workspace:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete workspace' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

