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
          error_message: 'Generation timed out',
          completed_at: new Date().toISOString(),
        };
        
        if (gen.replicate_prediction_id) {
          try {
            const prediction = await replicateClient.getPrediction(gen.replicate_prediction_id);
            
            // Если генерация завершилась - обновляем статус
            if (prediction.status === 'succeeded') {
              // Для успешных генераций нужно сохранить медиа, но в cron это может быть долго
              // Поэтому просто обновляем статус и URL - медиа сохранится при следующем sync
              const output = prediction.output;
              let outputUrls: string[] = [];
              
              if (typeof output === 'string' && (output.startsWith('http://') || output.startsWith('https://'))) {
                outputUrls = [output];
              } else if (Array.isArray(output)) {
                outputUrls = output.filter((url: any) => 
                  typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))
                );
              }
              
              updateData = {
                status: 'completed',
                output_urls: outputUrls.length > 0 ? outputUrls : (Array.isArray(output) ? output : [output]),
                completed_at: new Date().toISOString(),
              };
            } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
              // Если генерация провалилась - обновляем статус
              updateData = {
                status: prediction.status === 'canceled' ? 'cancelled' : 'failed',
                error_message: prediction.error || 'Генерация не удалась',
                completed_at: new Date().toISOString(),
              };
            }
            // Если статус всё ещё 'starting' или 'processing' - оставляем как есть
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

