import { createServiceRoleClient } from './server';

/**
 * Сохранить изображение с Replicate в Supabase Storage
 */
export async function saveImageToStorage(
  imageUrl: string,
  generationId: string,
  index: number = 0
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();

    // Скачать изображение
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.statusText);
      return null;
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const fileName = `${generationId}-${index}.png`;

    // Загрузить в Supabase Storage
    const { data, error } = await supabase.storage
      .from('generations')
      .upload(fileName, buffer, {
        contentType: 'image/png',
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

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error saving image to storage:', error);
    return null;
  }
}

/**
 * Сохранить все изображения генерации
 */
export async function saveGenerationImages(
  imageUrls: string[],
  generationId: string
): Promise<string[]> {
  const savedUrls = await Promise.all(
    imageUrls.map((url, index) => saveImageToStorage(url, generationId, index))
  );

  // Фильтруем null значения
  return savedUrls.filter((url): url is string => url !== null);
}

