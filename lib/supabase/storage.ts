import { createServiceRoleClient } from './server';

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

/**
 * Сохранить медиа файл с Replicate в Supabase Storage
 * Поддерживает изображения и видео
 */
export async function saveMediaToStorage(
  mediaUrl: string,
  generationId: string,
  index: number = 0
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();

    // Скачать файл
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      console.error('Failed to fetch media:', response.statusText);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const mediaInfo = getMediaTypeInfo(mediaUrl, contentType);
    
    console.log('Saving media:', { 
      url: mediaUrl.substring(0, 100), 
      contentType, 
      mediaInfo 
    });

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const fileName = `${generationId}-${index}.${mediaInfo.extension}`;

    // Загрузить в Supabase Storage
    const { data, error } = await supabase.storage
      .from('generations')
      .upload(fileName, buffer, {
        contentType: mediaInfo.mimeType,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Получить публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    console.log('Media saved successfully:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error saving media to storage:', error);
    return null;
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
  return saveMediaToStorage(imageUrl, generationId, index);
}

/**
 * Сохранить все медиа файлы генерации (изображения и видео)
 */
export async function saveGenerationMedia(
  mediaUrls: string[],
  generationId: string
): Promise<string[]> {
  const savedUrls = await Promise.all(
    mediaUrls.map((url, index) => saveMediaToStorage(url, generationId, index))
  );

  // Фильтруем null значения
  return savedUrls.filter((url): url is string => url !== null);
}

/**
 * Сохранить все изображения генерации
 * @deprecated Используйте saveGenerationMedia для поддержки видео
 */
export async function saveGenerationImages(
  imageUrls: string[],
  generationId: string
): Promise<string[]> {
  return saveGenerationMedia(imageUrls, generationId);
}

