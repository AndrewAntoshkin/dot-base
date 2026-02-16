import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkAdminAccess } from '@/lib/admin';

// Количество генераций которые оставляем по умолчанию
const DEFAULT_KEEP_LATEST = 20;

// Тип для генерации из БД
interface Generation {
  id: string;
  model_name: string;
  created_at: string;
  output_urls: string[] | null;
  input_image_url?: string | null;
}

// Тип для статистики генерации
interface GenerationStats {
  id: string;
  created_at: string;
  output_urls: string[] | null;
}

/**
 * POST /api/admin/cleanup
 * Очистка старых генераций (записи + файлы Storage)
 * 
 * Body: { keepLatest?: number, dryRun?: boolean }
 */
export async function POST(request: Request) {
  try {
    // Check admin access
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const keepLatest = body.keepLatest || DEFAULT_KEEP_LATEST;
    const dryRun = body.dryRun || false;
    
    const supabase = createServiceRoleClient();
    const BATCH_SIZE = 1000;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    // 1. Сначала узнаём общее количество
    const { count: totalCount, error: countError } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (!totalCount || totalCount === 0) {
      return NextResponse.json({
        message: 'No generations to cleanup',
        deleted: { records: 0, files: 0 },
        remaining: 0
      });
    }

    if (totalCount <= keepLatest) {
      return NextResponse.json({
        message: 'No generations to delete',
        deleted: { records: 0, files: 0 },
        remaining: totalCount
      });
    }

    // Dry run — считаем сколько будет удалено без загрузки всех данных
    const toDeleteCount = totalCount - keepLatest;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        message: 'Dry run - nothing deleted',
        wouldDelete: {
          records: toDeleteCount,
        },
        remaining: keepLatest,
      });
    }

    // 2. Обрабатываем батчами: загружаем по BATCH_SIZE старых записей и удаляем
    let totalDeletedRecords = 0;
    let totalDeletedFiles = 0;

    while (totalDeletedRecords < toDeleteCount) {
      // Загружаем батч самых старых записей (ascending order — самые старые первыми)
      const { data: batchData, error: fetchError } = await (supabase
        .from('generations') as any)
        .select('id, output_urls, input_image_url')
        .order('created_at', { ascending: true })
        .range(0, BATCH_SIZE - 1);

      const batch = batchData as Generation[] | null;
      if (fetchError || !batch || batch.length === 0) break;

      // Собираем файлы для удаления из этого батча
      const filesToDelete: string[] = [];
      for (const gen of batch) {
        if (gen.output_urls && Array.isArray(gen.output_urls)) {
          for (const url of gen.output_urls) {
            const fileName = extractFileName(url);
            if (fileName) filesToDelete.push(fileName);
          }
        }
        if (gen.input_image_url && gen.input_image_url.includes(supabaseUrl)) {
          const fileName = extractFileName(gen.input_image_url);
          if (fileName) filesToDelete.push(fileName);
        }
      }

      // Удаляем файлы из Storage батчами по 100
      for (let i = 0; i < filesToDelete.length; i += 100) {
        const storageBatch = filesToDelete.slice(i, i + 100);
        const { error: storageError } = await supabase.storage
          .from('generations')
          .remove(storageBatch);
        if (!storageError) totalDeletedFiles += storageBatch.length;
      }

      // Удаляем записи из БД
      const idsToDelete = batch.map(g => g.id);
      const { error: deleteError } = await supabase
        .from('generations')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) break;

      totalDeletedRecords += batch.length;

      // Проверка: не удаляем больше, чем нужно
      if (totalDeletedRecords >= toDeleteCount) break;
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      deleted: {
        records: totalDeletedRecords,
        files: totalDeletedFiles
      },
      remaining: totalCount - totalDeletedRecords
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/cleanup
 * Получить статистику для очистки
 */
export async function GET() {
  try {
    // Check admin access
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 }
      );
    }

    const supabase = createServiceRoleClient();

    // Считаем общее количество через count (не загружаем все записи)
    const { count: totalGenerations, error: countError } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Получить список файлов в Storage
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('generations')
      .list('', { limit: 1000 });

    // Группировка по дням — берём только последние 500 записей для статистики
    const { data: recentGenerations } = await supabase
      .from('generations')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    const byDay: Record<string, number> = {};
    (recentGenerations || []).forEach((gen: { created_at: string }) => {
      const day = new Date(gen.created_at).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return NextResponse.json({
      totalGenerations: totalGenerations || 0,
      storageFiles: storageFiles?.length || 0,
      storageError: storageError?.message,
      byDay: Object.entries(byDay)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 10)
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Извлекает имя файла из URL Supabase Storage
 */
function extractFileName(url: string): string | null {
  try {
    const match = url.match(/\/generations\/([^?]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}



