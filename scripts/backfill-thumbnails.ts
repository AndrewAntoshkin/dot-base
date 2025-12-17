/**
 * Backfill thumbnails for existing generations.
 *
 * Creates `${generationId}-${index}-thumb.webp` in Supabase Storage and stores URLs in `generations.output_thumbs`.
 * - Images/GIFs: generates a still WebP thumbnail (first frame for GIF)
 * - Videos: skipped (requires ffmpeg worker if needed)
 *
 * Run:
 *   npx tsx scripts/backfill-thumbnails.ts
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BATCH_SIZE = 50;
const MAX_BATCHES = 50; // safety guard

function isVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes('.mp4') || u.includes('.webm') || u.includes('.mov');
}

async function createThumbWebp(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

async function uploadThumb(generationId: string, index: number, thumb: Buffer): Promise<string> {
  const fileName = `${generationId}-${index}-thumb.webp`;

  const { error } = await supabase.storage
    .from('generations')
    .upload(fileName, thumb, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return supabase.storage.from('generations').getPublicUrl(fileName).data.publicUrl;
}

async function processGeneration(gen: { id: string; output_urls: string[] | null; output_thumbs: string[] | null }) {
  const urls = gen.output_urls || [];
  if (urls.length === 0) return;

  const thumbs: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (!url || isVideoUrl(url)) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (ct.startsWith('video/')) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      const thumbBuf = await createThumbWebp(buf);
      const thumbUrl = await uploadThumb(gen.id, i, thumbBuf);
      thumbs.push(thumbUrl);
    } catch {
      // skip failures
    }
  }

  if (thumbs.length > 0) {
    const { error } = await supabase
      .from('generations')
      .update({ output_thumbs: thumbs })
      .eq('id', gen.id);

    if (error) {
      console.error('Update failed:', gen.id, error.message);
    }
  }
}

async function main() {
  console.log('Backfill thumbnails started');

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const from = batch * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from('generations')
      .select('id, output_urls, output_thumbs')
      .eq('status', 'completed')
      .not('output_urls', 'is', null)
      .or('output_thumbs.is.null,output_thumbs.eq.{}')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch batch failed:', error.message);
      process.exit(1);
    }

    const gens = (data || []) as Array<{ id: string; output_urls: string[] | null; output_thumbs: string[] | null }>;
    if (gens.length === 0) break;

    console.log(`Batch ${batch + 1}: ${gens.length} generations`);

    for (const gen of gens) {
      await processGeneration(gen);
    }
  }

  console.log('Backfill thumbnails finished');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
