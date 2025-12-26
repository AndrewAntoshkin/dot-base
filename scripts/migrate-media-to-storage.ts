/**
 * Скрипт для миграции медиа из временных Replicate URL в Supabase Storage
 * 
 * Запуск: npx tsx scripts/migrate-media-to-storage.ts
 * 
 * ВАЖНО: Перед запуском убедитесь что:
 * 1. Storage bucket 'generations' существует в Supabase
 * 2. Bucket настроен как PUBLIC
 * 3. Есть .env.local с SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Определить тип медиа
function getMediaTypeInfo(url: string, contentType?: string) {
  const lowercaseUrl = url.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const isVideo = videoExtensions.some(ext => lowercaseUrl.includes(ext)) || contentType?.startsWith('video/');
  
  if (isVideo) {
    if (lowercaseUrl.includes('.webm')) return { extension: 'webm', mimeType: 'video/webm' };
    if (lowercaseUrl.includes('.mov')) return { extension: 'mov', mimeType: 'video/quicktime' };
    return { extension: 'mp4', mimeType: 'video/mp4' };
  }
  
  if (lowercaseUrl.includes('.webp')) return { extension: 'webp', mimeType: 'image/webp' };
  if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg')) return { extension: 'jpg', mimeType: 'image/jpeg' };
  if (lowercaseUrl.includes('.gif')) return { extension: 'gif', mimeType: 'image/gif' };
  
  return { extension: 'png', mimeType: 'image/png' };
}

// Проверить что URL это временный Replicate URL
function isReplicateUrl(url: string): boolean {
  return url.includes('replicate.delivery') || 
         url.includes('replicate.com') ||
         url.includes('pbxt.replicate.delivery');
}

// Сохранить медиа в Storage
async function saveMediaToStorage(mediaUrl: string, generationId: string, index: number): Promise<string | null> {
  try {
    console.log(`  Downloading: ${mediaUrl.substring(0, 80)}...`);
    
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.log(`  ❌ Failed to fetch (status ${response.status})`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const mediaInfo = getMediaTypeInfo(mediaUrl, contentType);
    
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const fileName = `${generationId}-${index}.${mediaInfo.extension}`;

    console.log(`  Uploading: ${fileName} (${mediaInfo.mimeType})`);

    const { error } = await supabase.storage
      .from('generations')
      .upload(fileName, buffer, {
        contentType: mediaInfo.mimeType,
        upsert: true,
      });

    if (error) {
      console.log(`  ❌ Upload error: ${error.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    console.log(`  ✅ Saved: ${publicUrlData.publicUrl.substring(0, 60)}...`);
    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function migrateGenerations() {
  console.log('🚀 Starting media migration...\n');

  // Получить все генерации с временными URL
  const { data: generations, error } = await supabase
    .from('generations')
    .select('id, output_urls, status')
    .eq('status', 'completed')
    .not('output_urls', 'is', null);

  if (error) {
    console.error('Error fetching generations:', error);
    process.exit(1);
  }

  console.log(`Found ${generations?.length || 0} completed generations\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const gen of generations || []) {
    const urls = gen.output_urls as string[];
    
    if (!urls || urls.length === 0) {
      skippedCount++;
      continue;
    }

    // Проверить, нужна ли миграция
    const needsMigration = urls.some(isReplicateUrl);
    if (!needsMigration) {
      console.log(`⏭️  ${gen.id} - Already migrated`);
      skippedCount++;
      continue;
    }

    console.log(`\n📦 Migrating: ${gen.id}`);

    const newUrls: string[] = [];
    let allSuccess = true;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      if (!isReplicateUrl(url)) {
        // Уже в Storage
        newUrls.push(url);
        continue;
      }

      const savedUrl = await saveMediaToStorage(url, gen.id, i);
      if (savedUrl) {
        newUrls.push(savedUrl);
      } else {
        allSuccess = false;
        // Оставляем старый URL если не удалось сохранить
        newUrls.push(url);
      }
    }

    // Обновить generation с новыми URL
    if (newUrls.length > 0) {
      const { error: updateError } = await supabase
        .from('generations')
        .update({ output_urls: newUrls })
        .eq('id', gen.id);

      if (updateError) {
        console.log(`  ❌ Update error: ${updateError.message}`);
        failedCount++;
      } else if (allSuccess) {
        migratedCount++;
      } else {
        failedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration complete!');
  console.log(`   ✅ Migrated: ${migratedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
}

// Проверить Storage bucket
async function checkStorageBucket() {
  console.log('🔍 Checking Storage bucket...\n');
  
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error listing buckets:', error.message);
    return false;
  }

  const generationsBucket = data?.find(b => b.name === 'generations');
  
  if (!generationsBucket) {
    console.error('❌ Bucket "generations" not found!');
    console.log('\n📝 Please create it in Supabase Dashboard:');
    console.log('   1. Go to Storage section');
    console.log('   2. Click "New bucket"');
    console.log('   3. Name: "generations"');
    console.log('   4. ✅ Check "Public bucket"');
    console.log('   5. Click "Create bucket"\n');
    return false;
  }

  console.log(`✅ Bucket "generations" exists (public: ${generationsBucket.public})\n`);
  
  if (!generationsBucket.public) {
    console.log('⚠️  Warning: Bucket is not public! Images won\'t be accessible.');
    console.log('   Go to Supabase Dashboard > Storage > generations > Settings > Make public\n');
  }

  return true;
}

async function main() {
  const bucketOk = await checkStorageBucket();
  
  if (!bucketOk) {
    console.log('Please fix the Storage bucket first, then run this script again.');
    process.exit(1);
  }

  await migrateGenerations();
}

main().catch(console.error);

















