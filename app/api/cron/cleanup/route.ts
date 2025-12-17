import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const STALE_THRESHOLD_MINUTES = 30;

interface StaleGeneration {
  id: string;
  replicate_prediction_id: string | null;
}

/**
 * GET /api/cron/cleanup
 * Vercel Cron - каждые 10 минут
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const supabase = createServiceRoleClient();
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('generations')
      .select('id, replicate_prediction_id')
      .in('status', ['pending', 'processing'])
      .lt('created_at', staleThreshold);
    
    const staleGenerations = (data || []) as StaleGeneration[];
    
    if (staleGenerations.length === 0) {
      return NextResponse.json({ cleaned: 0 });
    }
    
    const replicateClient = getReplicateClient();
    let cleaned = 0;
    
    for (const gen of staleGenerations) {
      try {
        let updateData: any = {
          status: 'failed',
          error_message: 'Превышено время ожидания',
          completed_at: new Date().toISOString(),
        };
        
        if (gen.replicate_prediction_id) {
          try {
            const prediction = await replicateClient.getPrediction(gen.replicate_prediction_id);
            if (prediction.status === 'succeeded') {
              updateData = {
                status: 'completed',
                output_urls: Array.isArray(prediction.output) ? prediction.output : [prediction.output],
                completed_at: new Date().toISOString(),
              };
            }
          } catch {}
        }
        
        await (supabase.from('generations') as any)
          .update(updateData)
          .eq('id', gen.id);
        cleaned++;
      } catch {}
    }
    
    logger.info('Cron cleanup:', cleaned, 'of', staleGenerations.length);
    
    return NextResponse.json({
      success: true,
      cleaned,
      total: staleGenerations.length,
    });
  } catch (error: any) {
    logger.error('Cron error:', error.message);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

