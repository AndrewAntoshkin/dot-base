import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/loras/[id] - Get single LoRA details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    
    // Get LoRA with training images
    const { data: lora, error } = await serviceClient
      .from('user_loras')
      .select(`
        *,
        training_images:lora_training_images(id, image_url, caption)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !lora) {
      return NextResponse.json({ error: 'LoRA не найдена' }, { status: 404 });
    }

    // Type assertion for Supabase response
    const loraData = lora as any;
    const trainingImages = Array.isArray(loraData.training_images) ? loraData.training_images : [];

    return NextResponse.json({ 
      lora: {
        ...loraData,
        training_images_count: trainingImages.length,
      }
    });
  } catch (error) {
    logger.error('GET /api/loras/[id] error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// DELETE /api/loras/[id] - Soft delete LoRA
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    
    // Verify ownership
    const { data: lora } = await serviceClient
      .from('user_loras')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!lora) {
      return NextResponse.json({ error: 'LoRA не найдена' }, { status: 404 });
    }

    // Soft delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient as any)
      .from('user_loras')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      logger.error('Error deleting LoRA:', error);
      return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE /api/loras/[id] error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

