import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyframeGroupId } = await params;
    
    // Auth check
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
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get all generations for this keyframe group
    const { data: generations, error } = await (supabase
      .from('generations') as any)
      .select('*')
      .eq('user_id', user.id)
      .contains('settings', { keyframe_group_id: keyframeGroupId })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching keyframe generations:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    if (!generations || generations.length === 0) {
      return NextResponse.json({
        id: keyframeGroupId,
        status: 'not_found',
        segments: [],
      });
    }

    // Separate segments and merge
    const segments = generations.filter((g: any) => !g.settings?.keyframe_merge);
    const mergeGeneration = generations.find((g: any) => g.settings?.keyframe_merge);

    // Build response
    const segmentStatuses = segments.map((s: any) => ({
      id: s.id,
      index: s.settings?.keyframe_index || 0,
      status: s.status,
      videoUrl: s.output_urls?.[0],
      error: s.error_message,
    }));

    // Determine overall status
    let overallStatus = 'generating';
    const allSegmentsCompleted = segments.every((s: any) => s.status === 'completed');
    const anySegmentFailed = segments.some((s: any) => s.status === 'failed');

    if (anySegmentFailed) {
      overallStatus = 'failed';
    } else if (mergeGeneration) {
      if (mergeGeneration.status === 'completed') {
        overallStatus = 'completed';
      } else if (mergeGeneration.status === 'failed') {
        overallStatus = 'failed';
      } else {
        overallStatus = 'merging';
      }
    } else if (allSegmentsCompleted) {
      overallStatus = 'merging';
    }

    return NextResponse.json({
      id: keyframeGroupId,
      status: overallStatus,
      segments: segmentStatuses.sort((a: any, b: any) => a.index - b.index),
      finalVideoUrl: mergeGeneration?.output_urls?.[0],
      mergeGenerationId: mergeGeneration?.id,
      error: mergeGeneration?.error_message || segments.find((s: any) => s.error_message)?.error_message,
    });

  } catch (error: any) {
    console.error('Keyframes status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


