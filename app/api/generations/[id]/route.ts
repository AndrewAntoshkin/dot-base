import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { cookies } from 'next/headers';
// NOTE: getReplicateClient используется только для отмены в DELETE
// Статус генерации обновляется через webhook, не при GET запросах

export const dynamic = 'force-dynamic';

// Type for generation from DB
interface GenerationRecord {
  id: string;
  user_id: string;
  status: string;
  replicate_prediction_id?: string;
  output_urls?: string[];
  output_text?: string;
  error_message?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Выполнить операцию с ретраями
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
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
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Получаем пользователя из нашей таблицы
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user.email || '')
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const typedDbUser = dbUser as { id: string; role: string };

    // Получаем workspaces пользователя
    const { data: userWorkspaces } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', typedDbUser.id);
    
    const userWorkspaceIds = (userWorkspaces as { workspace_id: string }[] | null)?.map(w => w.workspace_id) || [];

    // Получить генерацию с ретраями на случай проблем с БД
    const fetchGeneration = async () => {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    };
    
    let generation: GenerationRecord | null = null;
    let error;
    try {
      generation = await withRetry(fetchGeneration, 3, 500) as GenerationRecord;
    } catch (e) {
      error = e;
    }

    if (error || !generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Проверяем доступ: своя генерация ИЛИ в том же workspace ИЛИ super_admin
    const isOwner = generation.user_id === typedDbUser.id;
    const isInSameWorkspace = generation.workspace_id && userWorkspaceIds.includes(generation.workspace_id as string);
    const isSuperAdmin = typedDbUser.role === 'super_admin';

    if (!isOwner && !isInSameWorkspace && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем данные создателя если это не своя генерация
    let creator: { id: string; email: string; name: string } | null = null;
    if (!isOwner) {
      const { data: creatorUser } = await supabase
        .from('users')
        .select('id, email, telegram_first_name')
        .eq('id', generation.user_id)
        .single();
      
      if (creatorUser) {
        const typedCreator = creatorUser as { id: string; email: string; telegram_first_name: string | null };
        creator = {
          id: typedCreator.id,
          email: typedCreator.email,
          name: typedCreator.telegram_first_name || typedCreator.email?.split('@')[0] || 'User',
        };
      }
    }

    // NOTE: Статус обновляется через webhook (/api/webhook/replicate)
    // НЕ проверяем статус на Replicate при каждом GET запросе - это замедляет ответ
    // Webhook надёжно обрабатывает завершение генерации

    return NextResponse.json({
      ...generation,
      is_owner: isOwner,
      creator: creator,
    });
  } catch (error: any) {
    console.error('Get generation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
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
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Получить генерацию только своего пользователя
    const { data } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const generation = data as GenerationRecord | null;

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Если генерация в процессе, отменить на Replicate
    if (
      generation.status === 'processing' &&
      generation.replicate_prediction_id
    ) {
      try {
        const replicateClient = getReplicateClient();
        await replicateClient.cancelPrediction(
          generation.replicate_prediction_id
        );
      } catch (error) {
        console.error('Error canceling Replicate prediction:', error);
      }
    }

    // Удалить файлы из Storage (если есть)
    if (generation.output_urls && generation.output_urls.length > 0) {
      try {
        // Извлекаем имена файлов из URL
        const fileNames = generation.output_urls
          .map((url: string) => {
            // URL формата: https://xxx.supabase.co/storage/v1/object/public/generations/filename.ext
            const match = url.match(/\/generations\/([^?]+)/);
            return match ? match[1] : null;
          })
          .filter((name): name is string => name !== null);

        if (fileNames.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('generations')
            .remove(fileNames);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
      } catch (storageErr) {
        console.error('Error processing storage deletion:', storageErr);
      }
    }

    // Удалить запись из базы данных
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting generation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('Delete generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

