import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const STALE_THRESHOLD_MINUTES = 30;

interface StaleGeneration {
  id: string;
  user_id: string;
  status: string;
  replicate_prediction_id: string | null;
  created_at: string;
}

/**
 * POST /api/generations/cleanup-stale
 * Очищает зависшие генерации
 */
export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    
    const { data: staleGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, status, replicate_prediction_id, created_at')
      .in('status', ['pending', 'processing'])
      .lt('created_at', staleThreshold);
    
    if (fetchError) {
      logger.error('Failed to fetch stale generations:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    const generations = (staleGenerations || []) as StaleGeneration[];
    
    if (generations.length === 0) {
      return NextResponse.json({ message: 'No stale generations', cleaned: 0, synced: 0 });
    }
    
    const replicateClient = getReplicateClient();
    let cleanedCount = 0;
    let syncedCount = 0;
    
    for (const gen of generations) {
      try {
        if (gen.replicate_prediction_id) {
          const prediction = await replicateClient.getPrediction(gen.replicate_prediction_id);
          
          if (prediction.status === 'succeeded') {
            await (supabase.from('generations') as any)
              .update({
                status: 'completed',
                output_urls: Array.isArray(prediction.output) ? prediction.output : [prediction.output],
                replicate_output: prediction,
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            syncedCount++;
          } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
            await (supabase.from('generations') as any)
              .update({
                status: prediction.status === 'canceled' ? 'cancelled' : 'failed',
                error_message: prediction.error || 'Генерация не удалась',
                replicate_output: prediction,
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            cleanedCount++;
          } else {
            // Still processing but too long
            await (supabase.from('generations') as any)
              .update({
                status: 'failed',
                error_message: 'Превышено время ожидания. Попробуйте снова.',
                completed_at: new Date().toISOString(),
              })
              .eq('id', gen.id);
            cleanedCount++;
          }
        } else {
          // No prediction_id
          await (supabase.from('generations') as any)
            .update({
              status: 'failed',
              error_message: 'Генерация не была запущена. Попробуйте снова.',
              completed_at: new Date().toISOString(),
            })
            .eq('id', gen.id);
          cleanedCount++;
        }
      } catch (error: any) {
        logger.error('Error processing generation:', gen.id, error.message);
        await (supabase.from('generations') as any)
          .update({
            status: 'failed',
            error_message: 'Ошибка синхронизации. Попробуйте снова.',
            completed_at: new Date().toISOString(),
          })
          .eq('id', gen.id);
        cleanedCount++;
      }
    }
    
    logger.info('Cleanup completed:', { total: generations.length, synced: syncedCount, cleaned: cleanedCount });
    
    return NextResponse.json({
      message: 'Cleanup completed',
      total: generations.length,
      synced: syncedCount,
      cleaned: cleanedCount,
    });
  } catch (error: any) {
    logger.error('Cleanup error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/generations/cleanup-stale
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('generations')
      .select('user_id, status, created_at')
      .in('status', ['pending', 'processing'])
      .lt('created_at', staleThreshold);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const generations = data || [];
    const byUser: Record<string, number> = {};
    generations.forEach((g: any) => {
      byUser[g.user_id] = (byUser[g.user_id] || 0) + 1;
    });
    
    return NextResponse.json({
      staleCount: generations.length,
      affectedUsers: Object.keys(byUser).length,
      thresholdMinutes: STALE_THRESHOLD_MINUTES,
      byUser,
    });
  } catch (error: any) {
    logger.error('Get stale stats error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

