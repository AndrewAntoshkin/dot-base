import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Количество генераций которые оставляем по умолчанию
const DEFAULT_KEEP_LATEST = 20;

/**
 * POST /api/admin/cleanup
 * Очистка старых генераций (записи + файлы Storage)
 * 
 * Body: { keepLatest?: number, dryRun?: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const keepLatest = body.keepLatest || DEFAULT_KEEP_LATEST;
    const dryRun = body.dryRun || false;
    
    const supabase = createServiceRoleClient();

    // 1. Получить ВСЕ генерации
    const { data: allGenerations, error: fetchError } = await supabase
      .from('generations')
      .select('id, model_name, created_at, output_urls, input_image_url')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!allGenerations || allGenerations.length === 0) {
      return NextResponse.json({ 
        message: 'No generations to cleanup',
        deleted: { records: 0, files: 0 },
        remaining: 0
      });
    }

    // 2. Определяем что удалять
    const toKeep = allGenerations.slice(0, keepLatest);
    const toDelete = allGenerations.slice(keepLatest);

    if (toDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No generations to delete',
        deleted: { records: 0, files: 0 },
        remaining: allGenerations.length
      });
    }

    // 3. Собираем файлы для удаления
    const filesToDelete: string[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    for (const gen of toDelete) {
      if (gen.output_urls && Array.isArray(gen.output_urls)) {
        for (const url of gen.output_urls) {
          const fileName = extractFileName(url);
          if (fileName) {
            filesToDelete.push(fileName);
          }
        }
      }
      
      if (gen.input_image_url && gen.input_image_url.includes(supabaseUrl)) {
        const fileName = extractFileName(gen.input_image_url);
        if (fileName) {
          filesToDelete.push(fileName);
        }
      }
    }

    // Dry run - только показываем что будет удалено
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        message: 'Dry run - nothing deleted',
        wouldDelete: {
          records: toDelete.length,
          files: filesToDelete.length
        },
        remaining: toKeep.length,
        toDeleteIds: toDelete.slice(0, 10).map(g => g.id), // первые 10 ID для проверки
      });
    }

    // 4. Удаляем файлы из Storage
    let deletedFiles = 0;
    if (filesToDelete.length > 0) {
      const batchSize = 100;
      
      for (let i = 0; i < filesToDelete.length; i += batchSize) {
        const batch = filesToDelete.slice(i, i + batchSize);
        
        const { error: storageError } = await supabase.storage
          .from('generations')
          .remove(batch);
        
        if (!storageError) {
          deletedFiles += batch.length;
        }
      }
    }

    // 5. Удаляем записи из БД
    const idsToDelete = toDelete.map(g => g.id);
    
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      return NextResponse.json({ 
        error: 'Failed to delete records',
        details: deleteError.message,
        filesDeleted: deletedFiles
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      deleted: {
        records: toDelete.length,
        files: deletedFiles
      },
      remaining: toKeep.length
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
    const supabase = createServiceRoleClient();

    // Получить все генерации
    const { data: generations, error } = await supabase
      .from('generations')
      .select('id, created_at, output_urls')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Получить список файлов в Storage
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('generations')
      .list('', { limit: 1000 });

    // Посчитать статистику
    let totalOutputUrls = 0;
    generations?.forEach(gen => {
      if (gen.output_urls && Array.isArray(gen.output_urls)) {
        totalOutputUrls += gen.output_urls.length;
      }
    });

    // Группировка по дням
    const byDay: Record<string, number> = {};
    generations?.forEach(gen => {
      const day = new Date(gen.created_at).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return NextResponse.json({
      totalGenerations: generations?.length || 0,
      totalOutputUrls,
      storageFiles: storageFiles?.length || 0,
      storageError: storageError?.message,
      byDay: Object.entries(byDay)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 10) // последние 10 дней
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

