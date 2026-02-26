import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient, supabaseTimeoutFetch } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import { getReplicateClient } from '@/lib/replicate/client';
import { withApiLogging } from '@/lib/with-api-logging';

export const dynamic = 'force-dynamic';

// Check Replicate status directly and update DB if webhook failed
async function checkAndSyncReplicateStatus(
  generation: any,
  supabase: any
): Promise<any> {
  if (!generation.replicate_prediction_id) return generation;
  if (generation.status !== 'processing') return generation;
  
  // Only check if processing for more than 30 seconds
  const startedAt = new Date(generation.started_at).getTime();
  const now = Date.now();
  const processingTime = now - startedAt;
  
  if (processingTime < 30000) return generation;
  
  try {
    const replicateClient = getReplicateClient();
    const prediction = await replicateClient.getPrediction(generation.replicate_prediction_id);
    
    if (!prediction) return generation;
    
    // If Replicate shows completed but our DB shows processing - sync it
    if (prediction.status === 'succeeded' && generation.status === 'processing') {
      logger.info(`Fallback sync: Generation ${generation.id} completed on Replicate but webhook missed`);
      
      const outputUrls = Array.isArray(prediction.output) 
        ? prediction.output 
        : prediction.output ? [prediction.output] : [];
      
      const { data: updated } = await (supabase
        .from('generations') as any)
        .update({
          status: 'completed',
          output_urls: outputUrls,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generation.id)
        .select()
        .single();
      
      // Trigger next segment or merge
      if (updated?.is_keyframe_segment) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL}/api/keyframes/continue/${generation.id}`, {
            method: 'POST',
          });
        } catch (e) {
          logger.error('Failed to trigger continue:', e);
        }
      }
      
      return updated || { ...generation, status: 'completed', output_urls: outputUrls };
    }
    
    if (prediction.status === 'failed') {
      logger.info(`Fallback sync: Generation ${generation.id} failed on Replicate`);
      
      const { data: updated } = await (supabase
        .from('generations') as any)
        .update({
          status: 'failed',
          error_message: prediction.error || 'Generation failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', generation.id)
        .select()
        .single();
      
      return updated || { ...generation, status: 'failed' };
    }
  } catch (error) {
    logger.error('Replicate status check error:', error);
  }
  
  return generation;
}

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyframeGroupId } = await params;
    const { searchParams } = new URL(request.url);
    const checkReplicate = searchParams.get('checkReplicate') === 'true';
    
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
        global: { fetch: supabaseTimeoutFetch },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get all generations for this keyframe group using JSONB containment
    let { data: generations, error } = await (supabase
      .from('generations') as any)
      .select('*')
      .eq('user_id', user.id)
      .contains('settings', { keyframe_group_id: keyframeGroupId })
      .order('created_at', { ascending: true });
    
    // Fallback: check Replicate status directly if requested and there are processing segments
    if (checkReplicate && generations) {
      const processingGenerations = generations.filter((g: any) => g.status === 'processing');
      for (const gen of processingGenerations) {
        const synced = await checkAndSyncReplicateStatus(gen, supabase);
        if (synced.status !== gen.status) {
          // Re-fetch all generations after sync
          const { data: refreshed } = await (supabase
            .from('generations') as any)
            .select('*')
            .eq('user_id', user.id)
            .contains('settings', { keyframe_group_id: keyframeGroupId })
            .order('created_at', { ascending: true });
          generations = refreshed;
          break;
        }
      }
    }

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

    // Get all completed segment videos
    const completedVideos = sortedSegments
      .filter((s: any) => s.status === 'completed' && s.output_urls?.[0])
      .map((s: any) => s.output_urls[0]);
    
    if (anySegmentFailed) {
      overallStatus = 'failed';
      currentStep = 'segment';
    } else if (mergeGeneration) {
      if (mergeGeneration.status === 'completed') {
        overallStatus = 'completed';
        currentStep = 'done';
      } else if (mergeGeneration.status === 'failed') {
        // Merge failed - fallback to showing segments as completed
        if (allSegmentsCompleted && completedVideos.length > 0) {
          overallStatus = 'completed';
          currentStep = 'done';
          logger.info('Merge failed, using segments as fallback');
        } else {
          overallStatus = 'failed';
          currentStep = 'merge';
        }
      } else {
        overallStatus = 'merging';
        currentStep = 'merge';
      }
    } else if (allSegmentsCompleted) {
      if (totalSegments === 1) {
        // Only 1 segment - no merge needed
        overallStatus = 'completed';
        currentStep = 'done';
      } else {
        // Multiple segments done - merge should start soon
        overallStatus = 'merging';
        currentStep = 'merge';
      }
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

    // Determine final video URL
    // Priority: merge result > segments (for fallback or single segment)
    let finalVideoUrl = mergeGeneration?.output_urls?.[0];
    
    // All segment video URLs for multi-part playback (fallback if merge failed)
    const allVideoUrls = completedVideos;
    
    // If no merge result but we have segments, use them
    if (!finalVideoUrl && completedVideos.length > 0) {
      finalVideoUrl = completedVideos[0]; // First video for thumbnail/preview
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
      finalVideoUrl,
      allVideoUrls, // All segment videos for multi-part playback
      mergeGenerationId: mergeGeneration?.id,
      mergeStatus: mergeGeneration?.status,
      error: overallStatus === 'failed' 
        ? (mergeGeneration?.error_message || segments.find((s: any) => s.error_message)?.error_message)
        : undefined,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(getHandler);


