import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/workspaces
 * Get all workspaces with user counts
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
    
    // Get all workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id, name, slug, created_at')
      .eq('is_active', true)
      .order('name');
    
    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError);
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      );
    }
    
    // Get user counts for each workspace
    const workspacesList = (workspaces || []) as Array<{
      id: string;
      name: string;
      slug: string;
      created_at: string;
    }>;
    
    const workspacesWithCounts = await Promise.all(
      workspacesList.map(async (workspace) => {
        // Count users in workspace
        const { count: usersCount } = await supabase
          .from('workspace_users')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id);
        
        // Count generations in workspace
        const { count: generationsCount } = await supabase
          .from('generations')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id);
        
        return {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          created_at: workspace.created_at,
          users_count: usersCount || 0,
          generations_count: generationsCount || 0,
        };
      })
    );
    
    return NextResponse.json({ data: workspacesWithCounts });
  } catch (error) {
    console.error('Admin workspaces error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workspaces
 * Create a new workspace
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const { isAdmin, isSuperAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }
    
    // Only super admins can create workspaces
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can create workspaces' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { name } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const supabase = createServiceRoleClient();
    
    // Generate slug from name
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9а-яё\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    // Check if slug already exists
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();
    
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;
    
    // Create workspace
    const { data: workspace, error: createError } = await (supabase
      .from('workspaces') as any)
      .insert({
        name: name.trim(),
        slug: finalSlug,
        is_active: true,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating workspace:', createError);
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ data: workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

