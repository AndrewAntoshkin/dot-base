import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/errors
 * Analyze failed generations
 */
export async function GET() {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Access denied' }, { status: 403 });
    }
    
    const supabase = createServiceRoleClient();
    
    // Define type for failed generations
    type FailedGeneration = {
      id: string;
      error_message: string | null;
      model_name: string;
      created_at: string;
      action: string;
    };

    // Get failed generations
    const { data: failed, error: queryError } = await supabase
      .from('generations')
      .select('id, error_message, model_name, created_at, action')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(200) as { data: FailedGeneration[] | null; error: Error | null };

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Group by error message
    const errorGroups: Record<string, { count: number; models: string[]; lastSeen: string }> = {};
    const modelErrors: Record<string, number> = {};
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayCount = 0;
    
    failed?.forEach(g => {
      // Count today's errors
      if (new Date(g.created_at) >= today) {
        todayCount++;
      }
      
      // Group by error
      const msg = g.error_message || 'No error message';
      const shortMsg = msg.substring(0, 150);
      
      if (!errorGroups[shortMsg]) {
        errorGroups[shortMsg] = { count: 0, models: [], lastSeen: g.created_at };
      }
      errorGroups[shortMsg].count++;
      if (!errorGroups[shortMsg].models.includes(g.model_name)) {
        errorGroups[shortMsg].models.push(g.model_name);
      }
      
      // Count by model
      modelErrors[g.model_name] = (modelErrors[g.model_name] || 0) + 1;
    });

    // Sort errors by count
    const topErrors = Object.entries(errorGroups)
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort models by error count
    const modelErrorsList = Object.entries(modelErrors)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total: failed?.length || 0,
      today: todayCount,
      topErrors,
      modelErrors: modelErrorsList,
      // Raw errors list for table view
      errors: failed?.map(g => ({
        id: g.id,
        error_message: g.error_message || 'No error message',
        model_name: g.model_name,
        created_at: g.created_at,
        action: g.action,
      })) || [],
    });
  } catch (error) {
    console.error('Error analysis failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

