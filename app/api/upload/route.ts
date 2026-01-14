import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 14;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

interface ParsedFile {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  size: number;
}

function validateMimeType(mimeType: string, index: number) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Файл ${index + 1}: тип "${mimeType}" не поддерживается. Допустимые: JPG, PNG, WebP, GIF, MP4, WebM`
    );
  }
}

function ensureSize(size: number, index: number) {
  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / 1024 / 1024).toFixed(1);
    throw new Error(`Файл ${index + 1}: размер ${sizeMB}MB превышает лимит 10MB`);
  }
}

function parseDataUrl(dataUrl: string, index: number): ParsedFile {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error(
      `Файл ${index + 1}: неверный формат data URL. Ожидается data:mime/type;base64,содержимое`
    );
  }

  const [, mimeType, content] = matches;
  validateMimeType(mimeType, index);

  const buffer = Buffer.from(content, 'base64');
  ensureSize(buffer.length, index);

  return { buffer, mimeType, size: buffer.length };
}

async function parseJsonFiles(request: NextRequest): Promise<ParsedFile[]> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new Error('Неверный формат запроса. Ожидается JSON с полем files');
  }

  const { files } = body;
  if (!files) {
    throw new Error('Отсутствует поле files в запросе');
  }

  if (!Array.isArray(files)) {
    throw new Error('Поле files должно быть массивом');
  }

  if (files.length === 0) {
    throw new Error('Массив files пустой');
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    throw new Error('Максимум 14 файлов за раз');
  }

  return files.map((file: string, index: number) => parseDataUrl(file, index));
}

// Supported buckets
const ALLOWED_BUCKETS = ['generations', 'lora-training-images', 'lora-models'];

async function uploadBuffers(
  userId: string,
  files: ParsedFile[],
  bucket: string = 'generations'
): Promise<{ uploaded: string[]; errors: string[] }> {
  const supabase = createServiceRoleClient();
  const uploadedUrls: string[] = [];
  const errors: string[] = [];

  // Validate bucket
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    errors.push(`Недопустимый bucket: ${bucket}`);
    return { uploaded: uploadedUrls, errors };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    logger.debug(`Upload: Processing file ${i}, type: ${file.mimeType}, size: ${file.size} bytes, bucket: ${bucket}`);

    const extension = EXTENSION_MAP[file.mimeType] || 'bin';
    const filename = file.originalName
      ? `input-${userId}-${uuidv4()}-${file.originalName}`
      : `input-${userId}-${uuidv4()}.${extension}`;
    
    // Different path structure for different buckets
    const filePath = bucket === 'generations' 
      ? `inputs/${filename}`
      : `${userId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (uploadError) {
      logger.error(`Upload error for file ${i}:`, uploadError);
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

    // For lora-training-images, use signed URLs (valid for 24 hours)
    // This ensures Replicate can access them even if bucket is not public
    if (bucket === 'lora-training-images') {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
      
      if (signedError || !signedData?.signedUrl) {
        logger.error(`Signed URL error for file ${i}:`, signedError);
        errors.push(`Файл ${i + 1}: ошибка получения signed URL`);
        continue;
      }
      
      uploadedUrls.push(signedData.signedUrl);
      logger.debug(`Upload: File ${i} uploaded with signed URL:`, signedData.signedUrl);
    } else {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        try {
          new URL(urlData.publicUrl);
          uploadedUrls.push(urlData.publicUrl);
          logger.debug(`Upload: File ${i} uploaded successfully:`, urlData.publicUrl);
        } catch {
          errors.push(`Файл ${i + 1}: ошибка получения URL`);
        }
      }
    }
  }

  return { uploaded: uploadedUrls, errors };
}

export async function POST(request: NextRequest) {
  try {
    logger.debug('=== UPLOAD API START ===');

    const cookieStore = await cookies();
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

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      logger.debug('Upload: Unauthorized');
      return NextResponse.json(
        {
          error: 'Требуется авторизация',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    logger.debug('Upload: User authenticated:', user.id);

    const contentType = request.headers.get('content-type') || '';
    let parsedFiles: ParsedFile[];
    let bucket = 'generations'; // Default bucket

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Get bucket from form data (optional)
      const bucketField = formData.get('bucket');
      if (bucketField && typeof bucketField === 'string') {
        bucket = bucketField;
      }
      
      // Parse files from already parsed formData
      const fileEntries = formData.getAll('files');
      
      if (fileEntries.length === 0) {
        throw new Error('Поле files отсутствует или пустое');
      }

      if (fileEntries.length > MAX_FILES_PER_REQUEST) {
        throw new Error('Максимум 14 файлов за раз');
      }

      parsedFiles = [];
      for (let i = 0; i < fileEntries.length; i++) {
        const entry = fileEntries[i];
        if (typeof entry === 'string') {
          parsedFiles.push(parseDataUrl(entry, i));
          continue;
        }

        const blob = entry as File;
        validateMimeType(blob.type, i);

        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        ensureSize(buffer.length, i);

        parsedFiles.push({
          buffer,
          mimeType: blob.type,
          originalName: blob.name,
          size: buffer.length,
        });
      }
    } else {
      parsedFiles = await parseJsonFiles(request);
    }

    const { uploaded, errors } = await uploadBuffers(user.id, parsedFiles, bucket);

    logger.debug('Upload: Complete. Uploaded:', uploaded.length, 'Errors:', errors.length);

    if (uploaded.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Не удалось загрузить файлы',
          details: errors,
          code: 'UPLOAD_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      urls: uploaded,
      errors: errors.length > 0 ? errors : undefined,
      uploaded: uploaded.length,
      failed: errors.length,
    });
  } catch (error: any) {
    logger.error('=== UPLOAD API ERROR ===', error);

    let friendlyMessage = 'Ошибка загрузки файлов';
    let code = 'INTERNAL_ERROR';

    if (error.message?.includes('Body exceeded')) {
      friendlyMessage =
        'Запрос слишком большой. Попробуйте загрузить меньше файлов или файлы меньшего размера';
      code = 'PAYLOAD_TOO_LARGE';
    } else if (error.message?.includes('Неверный формат запроса')) {
      friendlyMessage = error.message;
      code = 'INVALID_REQUEST';
    } else if (error.message) {
      friendlyMessage = error.message;
      code = 'VALIDATION_ERROR';
    }

    return NextResponse.json(
      {
        error: friendlyMessage,
        code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: code === 'PAYLOAD_TOO_LARGE' ? 413 : 400 }
    );
  }
}

