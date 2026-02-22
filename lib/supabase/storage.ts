import { createServiceRoleClient } from './server';
import sharp from 'sharp';
import logger from '@/lib/logger';

// Отключаем кэш libvips — он держит нативную память (не видна в V8 heap, но видна в RSS)
// При 400+ генераций в день кэш sharp может занимать сотни MB
sharp.cache(false);
// Ограничиваем concurrency sharp (по умолчанию = кол-во ядер)
sharp.concurrency(1);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const STORAGE_PROXY_URL = process.env.STORAGE_PROXY_URL || '';

// Семафор: максимум 2 параллельных скачивания медиа чтобы не съесть RAM
const MAX_CONCURRENT_MEDIA = 2;
let activeMediaOps = 0;
const mediaQueue: Array<() => void> = [];

async function acquireMediaSlot(): Promise<void> {
  if (activeMediaOps < MAX_CONCURRENT_MEDIA) {
    activeMediaOps++;
    return;
  }
  return new Promise<void>(resolve => {
    mediaQueue.push(resolve);
  });
}

function releaseMediaSlot(): void {
  activeMediaOps--;
  const next = mediaQueue.shift();
  if (next) {
    activeMediaOps++;
    next();
  }
}

/**
 * Заменить Supabase Storage URL на проксированный через наш домен
 * https://xxx.supabase.co/storage/v1/... → https://basecraft.ru/storage/v1/...
 */
function proxyUrl(url: string): string {
  if (!STORAGE_PROXY_URL || !SUPABASE_URL) return url;
  return url.replace(SUPABASE_URL, STORAGE_PROXY_URL);
}

/**
 * Выполнить операцию с ретраями
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      logger.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Экспоненциальная задержка
        const delay = delayMs * Math.pow(2, attempt - 1);
        logger.debug(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Определить тип медиа и расширение по URL и content-type
 */
function getMediaTypeInfo(url: string, contentType?: string): { extension: string; mimeType: string; isVideo: boolean } {
  const lowercaseUrl = url.toLowerCase();
  
  // Проверяем по расширению в URL
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const isVideoByUrl = videoExtensions.some(ext => lowercaseUrl.includes(ext));
  
  // Проверяем по content-type
  const isVideoByContentType = contentType?.startsWith('video/');
  
  const isVideo = isVideoByUrl || isVideoByContentType;
  
  if (isVideo) {
    // Определяем конкретный формат видео
    if (lowercaseUrl.includes('.webm') || contentType === 'video/webm') {
      return { extension: 'webm', mimeType: 'video/webm', isVideo: true };
    }
    if (lowercaseUrl.includes('.mov') || contentType === 'video/quicktime') {
      return { extension: 'mov', mimeType: 'video/quicktime', isVideo: true };
    }
    // По умолчанию mp4
    return { extension: 'mp4', mimeType: 'video/mp4', isVideo: true };
  }
  
  // Определяем формат изображения
  if (lowercaseUrl.includes('.svg') || contentType === 'image/svg+xml') {
    return { extension: 'svg', mimeType: 'image/svg+xml', isVideo: false };
  }
  if (lowercaseUrl.includes('.webp') || contentType === 'image/webp') {
    return { extension: 'webp', mimeType: 'image/webp', isVideo: false };
  }
  if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg') || contentType === 'image/jpeg') {
    return { extension: 'jpg', mimeType: 'image/jpeg', isVideo: false };
  }
  if (lowercaseUrl.includes('.gif') || contentType === 'image/gif') {
    return { extension: 'gif', mimeType: 'image/gif', isVideo: false };
  }
  
  // По умолчанию png для изображений
  return { extension: 'png', mimeType: 'image/png', isVideo: false };
}

async function createThumbnailWebp(buffer: Buffer): Promise<Buffer> {
  // 512px bounding box — достаточно для карточек/превью
  return await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

/**
 * Сохранить медиа файл с Replicate в Supabase Storage
 * Поддерживает изображения и видео, включает ретраи
 */
export async function saveMediaToStorage(
  mediaUrl: string,
  generationId: string,
  index: number = 0
): Promise<{ url: string; thumbUrl?: string } | null> {
  await acquireMediaSlot();
  try {
    const supabase = createServiceRoleClient();
    
    // Определяем, это видео или изображение (для настройки ретраев)
    const lowercaseUrl = mediaUrl.toLowerCase();
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const isLikelyVideo = videoExtensions.some(ext => lowercaseUrl.includes(ext));
    
    // Для видео: больше ретраев и дольше ждём (CDN пропагация медленнее)
    const maxRetries = isLikelyVideo ? 5 : 3;
    const retryDelay = isLikelyVideo ? 3000 : 2000;
    const fetchTimeout = isLikelyVideo ? 60000 : 30000; // 60s для видео
    
    // Уменьшена начальная задержка для ускорения обработки
    // CDN обычно готов быстрее, а ретраи помогут если нет
    const initialDelay = isLikelyVideo ? 1000 : 500;
    logger.debug(`Waiting ${initialDelay}ms for CDN propagation before fetching media ${index}...`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    // Скачать файл с ретраями
    const fetchMedia = async () => {
      const response = await fetch(mediaUrl, {
        signal: AbortSignal.timeout(fetchTimeout),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    };
    
    const response = await withRetry(
      fetchMedia, 
      maxRetries, 
      retryDelay, 
      `Fetch media ${index}`
    );

    const contentType = response.headers.get('content-type') || '';
    const mediaInfo = getMediaTypeInfo(mediaUrl, contentType);
    
    const blob = await response.blob();
    const fileName = `${generationId}-${index}.${mediaInfo.extension}`;
    let buf: Buffer | null = Buffer.from(await blob.arrayBuffer());

    // Загрузить в Supabase Storage с ретраями
    const uploadToStorage = async () => {
      const { data, error } = await supabase.storage
        .from('generations')
        .upload(fileName, buf!, {
          contentType: mediaInfo.mimeType,
          cacheControl: '31536000',
          upsert: true,
        });

      if (error) {
        throw new Error(`Storage upload: ${error.message}`);
      }
      return data;
    };

    await withRetry(uploadToStorage, 3, 1000, `Upload ${fileName}`);

    // Получить публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    let thumbUrl: string | undefined;
    if (!mediaInfo.isVideo) {
      try {
        // Создаём thumbnail ДО обнуления буфера
        const thumbBuffer = await createThumbnailWebp(buf!);
        // Оригинальный буфер больше не нужен — освобождаем RAM
        buf = null;

        const thumbFileName = `${generationId}-${index}-thumb.webp`;

        const uploadThumb = async () => {
          const { error } = await supabase.storage
            .from('generations')
            .upload(thumbFileName, thumbBuffer, {
              contentType: 'image/webp',
              cacheControl: '31536000',
              upsert: true,
            });
          if (error) throw new Error(`Thumb upload: ${error.message}`);
        };

        await withRetry(uploadThumb, 2, 500, `Upload ${thumbFileName}`);
        thumbUrl = supabase.storage.from('generations').getPublicUrl(thumbFileName).data.publicUrl;
      } catch (e: any) {
        logger.warn('Thumbnail generation failed:', generationId, index, e?.message);
      }
    } else {
      // Для видео — сразу освобождаем буфер после загрузки
      buf = null;
    }

    logger.info(`Successfully saved media ${index} for generation ${generationId}`);
    return { url: proxyUrl(publicUrlData.publicUrl), thumbUrl: thumbUrl ? proxyUrl(thumbUrl) : undefined };
  } catch (error: any) {
    // Логируем URL для отладки (без query params для безопасности)
    const urlForLog = mediaUrl.split('?')[0];
    logger.error(`Error saving media to storage after retries: ${error.message}`, {
      generationId,
      index,
      url: urlForLog,
    });
    return null;
  } finally {
    releaseMediaSlot();
  }
}

/**
 * Сохранить изображение с Replicate в Supabase Storage
 * @deprecated Используйте saveMediaToStorage для поддержки видео
 */
export async function saveImageToStorage(
  imageUrl: string,
  generationId: string,
  index: number = 0
): Promise<string | null> {
  const result = await saveMediaToStorage(imageUrl, generationId, index);
  return result?.url || null;
}

/**
 * Сохранить все медиа файлы генерации (изображения и видео)
 */
export async function saveGenerationMedia(
  mediaUrls: string[],
  generationId: string
): Promise<{ urls: string[]; thumbs: string[] }> {
  const urls: string[] = [];
  const thumbs: string[] = [];

  // Sequential processing: не создаём все замыкания сразу через Promise.all,
  // каждый буфер полностью освобождается до начала следующего скачивания.
  // Семафор всё равно ограничивает до 2, но при Promise.all все N замыканий
  // с контекстом уже существуют в памяти и держат GC от сборки.
  for (let index = 0; index < mediaUrls.length; index++) {
    const item = await saveMediaToStorage(mediaUrls[index], generationId, index);
    if (!item) continue;
    urls.push(item.url);
    if (item.thumbUrl) thumbs.push(item.thumbUrl);
  }

  return { urls, thumbs };
}

/**
 * Сохранить все изображения генерации
 * @deprecated Используйте saveGenerationMedia для поддержки видео
 */
export async function saveGenerationImages(
  imageUrls: string[],
  generationId: string
): Promise<string[]> {
  const { urls } = await saveGenerationMedia(imageUrls, generationId);
  return urls;
}

