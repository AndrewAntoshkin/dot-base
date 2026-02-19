import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getReplicateClient } from '@/lib/replicate/client';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';

export const dynamic = 'force-dynamic';

// SAM 2 на Replicate (для изображений)
const SAM2_MODEL = 'meta/sam-2';
const SAM2_VERSION = 'fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83';

interface SegmentRequest {
  image_url: string;
}

async function postHandler(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SegmentRequest = await request.json();

    if (!body.image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    logger.info('[Segment] Starting segmentation for user:', user.id);

    const replicateClient = getReplicateClient();

    // Запускаем SAM 2 с дефолтными настройками для автоматической сегментации
    const input = {
      image: body.image_url,
      use_m2m: true,
      points_per_side: 32,  // Количество точек для генерации масок
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
    };

    const { prediction } = await replicateClient.run({
      model: SAM2_MODEL,
      version: SAM2_VERSION,
      input,
    });

    logger.debug('[Segment] SAM 2 prediction started:', prediction.id);

    // Ждём результат (SAM 2 обычно быстрый - ~14 секунд)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 60 секунд максимум

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token = process.env.REPLICATE_API_TOKENS?.split(',')[0];
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (statusResponse.ok) {
        result = await statusResponse.json();
      }
      attempts++;
    }

    if (result.status === 'failed') {
      logger.error('[Segment] SAM 2 failed:', result.error);
      return NextResponse.json({ error: 'Сегментация не удалась' }, { status: 500 });
    }

    if (result.status !== 'succeeded') {
      return NextResponse.json({ error: 'Таймаут сегментации' }, { status: 504 });
    }

    // Парсим результат SAM 2
    // Output: { combined_mask: string, individual_masks: string[] }
    const output = result.output;
    
    if (!output) {
      return NextResponse.json({ error: 'Пустой ответ от модели' }, { status: 500 });
    }

    // Формируем слои из individual_masks
    const individualMasks = output.individual_masks || [];
    const combinedMask = output.combined_mask;
    
    const layers = individualMasks.map((maskUrl: string, index: number) => ({
      id: `layer-${index + 1}`,
      name: index === 0 ? 'background' : `object_${index}`,
      mask_url: maskUrl,
      preview_url: maskUrl, // Маска как preview
      z_index: index,
      is_visible: true,
    }));

    // Если нет individual_masks, но есть combined_mask - используем её
    if (layers.length === 0 && combinedMask) {
      layers.push({
        id: 'layer-1',
        name: 'all_objects',
        mask_url: combinedMask,
        preview_url: combinedMask,
        z_index: 0,
        is_visible: true,
      });
    }

    logger.info('[Segment] Segmentation complete, layers:', layers.length);

    return NextResponse.json({
      layers,
      combined_mask: combinedMask,
      original_image: body.image_url,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ошибка сегментации' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(postHandler, { provider: 'replicate' });
