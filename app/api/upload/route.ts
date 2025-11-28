import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Конфигурация для увеличения лимита body (до 50MB для множественных файлов)
export const maxDuration = 60; // 60 секунд таймаут

// Максимальный размер файла (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Допустимые MIME типы
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

/**
 * Валидация base64 данных
 */
function validateBase64(data: string, index: number): { 
  valid: boolean; 
  error?: string; 
  mimeType?: string; 
  content?: string 
} {
  if (!data || typeof data !== 'string') {
    return { valid: false, error: `Файл ${index + 1}: данные отсутствуют или имеют неверный тип` };
  }

  // Проверяем формат data URL
  if (!data.startsWith('data:')) {
    return { valid: false, error: `Файл ${index + 1}: неверный формат. Ожидается data URL (data:mime;base64,...)` };
  }

  // Парсим data URL
  const matches = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    // Попробуем альтернативный формат без ;base64
    const altMatches = data.match(/^data:([^,]+),(.+)$/);
    if (altMatches) {
      return { valid: false, error: `Файл ${index + 1}: отсутствует base64 encoding. Убедитесь что файл закодирован в base64` };
    }
    return { valid: false, error: `Файл ${index + 1}: неверный формат base64. Ожидается: data:mime/type;base64,содержимое` };
  }

  const mimeType = matches[1];
  const base64Content = matches[2];

  // Проверяем MIME тип
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { 
      valid: false, 
      error: `Файл ${index + 1}: тип "${mimeType}" не поддерживается. Допустимые: JPG, PNG, WebP, GIF, MP4, WebM` 
    };
  }

  // Проверяем что base64 контент не пустой
  if (!base64Content || base64Content.length < 100) {
    return { valid: false, error: `Файл ${index + 1}: файл пустой или поврежден` };
  }

  // Проверяем валидность base64 (простая проверка)
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(base64Content)) {
    return { valid: false, error: `Файл ${index + 1}: содержимое повреждено (невалидные символы в base64)` };
  }

  // Примерная проверка размера (base64 увеличивает размер ~33%)
  const estimatedSize = (base64Content.length * 3) / 4;
  if (estimatedSize > MAX_FILE_SIZE) {
    const sizeMB = (estimatedSize / 1024 / 1024).toFixed(1);
    return { valid: false, error: `Файл ${index + 1}: размер ${sizeMB}MB превышает лимит 10MB` };
  }

  return { valid: true, mimeType, content: base64Content };
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPLOAD API START ===');
    
    // Auth check
    const cookieStore = cookies();
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
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      console.log('Upload: Unauthorized');
      return NextResponse.json({ 
        error: 'Требуется авторизация',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    console.log('Upload: User authenticated:', user.id);

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Неверный формат запроса. Ожидается JSON с полем files',
        code: 'INVALID_REQUEST'
      }, { status: 400 });
    }

    const { files } = body;

    console.log('Upload: Received files count:', files?.length || 0);

    if (!files) {
      return NextResponse.json({ 
        error: 'Отсутствует поле files в запросе',
        code: 'MISSING_FILES'
      }, { status: 400 });
    }

    if (!Array.isArray(files)) {
      return NextResponse.json({ 
        error: 'Поле files должно быть массивом',
        code: 'INVALID_FILES_TYPE'
      }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ 
        error: 'Массив files пустой',
        code: 'EMPTY_FILES'
      }, { status: 400 });
    }

    if (files.length > 14) {
      return NextResponse.json({ 
        error: 'Максимум 14 файлов за раз',
        code: 'TOO_MANY_FILES'
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      // Валидация файла
      const validation = validateBase64(files[i], i);
      if (!validation.valid) {
        errors.push(validation.error!);
        continue;
      }

      const { mimeType, content } = validation;
      const buffer = Buffer.from(content!, 'base64');

      console.log(`Upload: Processing file ${i}, type: ${mimeType}, size: ${buffer.length} bytes`);

      // Determine file extension
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
      };
      const ext = extMap[mimeType!] || 'png';

      // Generate unique filename
      const filename = `input-${user.id}-${uuidv4()}.${ext}`;
      const filePath = `inputs/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('generations')
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for file ${i}:`, uploadError);
        
        // Более понятные сообщения об ошибках Storage
        let friendlyError = `Файл ${i + 1}: `;
        if (uploadError.message.includes('Bucket not found')) {
          friendlyError += 'хранилище не настроено. Обратитесь к администратору';
        } else if (uploadError.message.includes('exceeded')) {
          friendlyError += 'превышен лимит хранилища';
        } else if (uploadError.message.includes('duplicate')) {
          friendlyError += 'файл уже существует';
        } else {
          friendlyError += uploadError.message;
        }
        
        errors.push(friendlyError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generations')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        // Валидируем что URL корректный
        try {
          new URL(urlData.publicUrl);
          uploadedUrls.push(urlData.publicUrl);
          console.log(`Upload: File ${i} uploaded successfully:`, urlData.publicUrl);
        } catch {
          errors.push(`Файл ${i + 1}: ошибка получения URL`);
        }
      }
    }

    console.log('Upload: Complete. Uploaded:', uploadedUrls.length, 'Errors:', errors.length);

    if (uploadedUrls.length === 0 && errors.length > 0) {
      return NextResponse.json({
        error: 'Не удалось загрузить файлы',
        details: errors,
        code: 'UPLOAD_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      urls: uploadedUrls, 
      errors: errors.length > 0 ? errors : undefined,
      uploaded: uploadedUrls.length,
      failed: errors.length
    });
  } catch (error: any) {
    console.error('=== UPLOAD API ERROR ===', error);
    
    // Определяем тип ошибки
    let friendlyMessage = 'Ошибка загрузки файлов';
    let code = 'INTERNAL_ERROR';
    
    if (error.message?.includes('Body exceeded')) {
      friendlyMessage = 'Запрос слишком большой. Попробуйте загрузить меньше файлов или файлы меньшего размера';
      code = 'PAYLOAD_TOO_LARGE';
    } else if (error.message?.includes('JSON')) {
      friendlyMessage = 'Ошибка формата данных';
      code = 'INVALID_JSON';
    }
    
    return NextResponse.json({
      error: friendlyMessage,
      code,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

