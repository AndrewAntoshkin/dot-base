import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Upload: User authenticated:', user.id);

    const body = await request.json();
    const { files } = body; // Array of base64 strings

    console.log('Upload: Received files count:', files?.length || 0);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const base64Data = files[i];
      if (!base64Data || typeof base64Data !== 'string') {
        errors.push(`File ${i}: invalid data`);
        continue;
      }

      // Parse base64 data
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        errors.push(`File ${i}: invalid base64 format`);
        continue;
      }

      const mimeType = matches[1];
      const base64Content = matches[2];
      const buffer = Buffer.from(base64Content, 'base64');

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
      const ext = extMap[mimeType] || 'png';

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
        errors.push(`File ${i}: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generations')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
        console.log(`Upload: File ${i} uploaded successfully:`, urlData.publicUrl);
      }
    }

    console.log('Upload: Complete. Uploaded:', uploadedUrls.length, 'Errors:', errors.length);

    if (uploadedUrls.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to upload files', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ urls: uploadedUrls, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    console.error('=== UPLOAD API ERROR ===', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

