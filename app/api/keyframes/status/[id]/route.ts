import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    // Get all generations for this keyframe group using JSONB containment
    const { data: generations, error } = await (supabase
      .from('generations') as any)
      .select('*')
      .eq('user_id', user.id)
      .contains('settings', { keyframe_group_id: keyframeGroupId })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching keyframe generations:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    if (!generations || generations.length === 0) {
      return NextResponse.json({
        id: keyframeGroupId,
        status: 'not_found',
        segments: [],
        progress: { completed: 0, total: 0, percent: 0 },
      });
    }

    // Separate segments and merge
    const segments = generations.filter((g: any) => g.is_keyframe_segment === true);
    const mergeGeneration = generations.find((g: any) => g.settings?.keyframe_merge === true);

    // Sort segments by index
    const sortedSegments = segments.sort((a: any, b: any) => 
      (a.settings?.keyframe_index || 0) - (b.settings?.keyframe_index || 0)
    );

    // Build detailed segment statuses
    const segmentStatuses = sortedSegments.map((s: any) => ({
      id: s.id,
      index: s.settings?.keyframe_index ?? 0,
      total: s.settings?.keyframe_total ?? segments.length,
      status: s.status,
      videoUrl: s.output_urls?.[0],
      error: s.error_message,
      startedAt: s.started_at,
      completedAt: s.completed_at,
    }));

    // Calculate progress
    const totalSegments = sortedSegments[0]?.settings?.keyframe_total || segments.length;
    const completedSegments = segments.filter((s: any) => s.status === 'completed').length;
    const processingSegment = segments.find((s: any) => s.status === 'processing');
    
    // Determine overall status
    let overallStatus = 'generating';
    let currentStep = 'segment';
    let currentSegmentIndex = processingSegment?.settings?.keyframe_index ?? completedSegments;
    
    const allSegmentsCompleted = completedSegments === totalSegments;
    const anySegmentFailed = segments.some((s: any) => s.status === 'failed');

    if (anySegmentFailed) {
      overallStatus = 'failed';
      currentStep = 'segment';
    } else if (mergeGeneration) {
      if (mergeGeneration.status === 'completed') {
        overallStatus = 'completed';
        currentStep = 'done';
      } else if (mergeGeneration.status === 'failed') {
        overallStatus = 'failed';
        currentStep = 'merge';
      } else {
        overallStatus = 'merging';
        currentStep = 'merge';
      }
    } else if (allSegmentsCompleted) {
      // Merge should start soon via webhook
      overallStatus = 'merging';
      currentStep = 'merge';
    }

    // Calculate overall progress percentage
    // Segments = 90%, Merge = 10%
    let progressPercent = 0;
    if (overallStatus === 'completed') {
      progressPercent = 100;
    } else if (currentStep === 'merge') {
      progressPercent = 90 + (mergeGeneration?.status === 'processing' ? 5 : 0);
    } else {
      progressPercent = Math.round((completedSegments / totalSegments) * 90);
    }

    return NextResponse.json({
      id: keyframeGroupId,
      status: overallStatus,
      currentStep,
      currentSegmentIndex,
      segments: segmentStatuses,
      progress: {
        completed: completedSegments,
        total: totalSegments,
        percent: progressPercent,
        isMerging: currentStep === 'merge',
      },
      finalVideoUrl: mergeGeneration?.output_urls?.[0],
      mergeGenerationId: mergeGeneration?.id,
      mergeStatus: mergeGeneration?.status,
      error: mergeGeneration?.error_message || segments.find((s: any) => s.error_message)?.error_message,
    });

  } catch (error: any) {
    logger.error('Keyframes status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}






