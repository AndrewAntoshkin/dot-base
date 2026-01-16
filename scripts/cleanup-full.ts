import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Количество генераций которые оставляем (по умолчанию последние 10)
const KEEP_LATEST = parseInt(process.env.KEEP_LATEST || '10');

// Удалять генерации старше X дней (0 = не учитывать возраст)
const DELETE_OLDER_THAN_DAYS = parseInt(process.env.DELETE_OLDER_THAN_DAYS || '0');

async function cleanupGenerations() {
  console.log('🧹 Полная очистка старых генераций...\n');
  console.log(`📋 Параметры:`);
  console.log(`   - Оставляем последних: ${KEEP_LATEST}`);
  console.log(`   - Удаляем старше дней: ${DELETE_OLDER_THAN_DAYS || 'не ограничено'}\n`);

  // 1. Получить ВСЕ генерации для анализа
  const { data: allGenerations, error: fetchAllError } = await supabase
    .from('generations')
    .select('id, model_name, created_at, output_urls, input_image_url')
    .order('created_at', { ascending: false });

  if (fetchAllError) {
    console.error('❌ Ошибка при получении генераций:', fetchAllError);
    return;
  }

  console.log(`📊 Всего генераций в базе: ${allGenerations?.length || 0}\n`);

  if (!allGenerations || allGenerations.length === 0) {
    console.log('✅ Нет генераций для очистки');
    return;
  }

  // 2. Определяем что оставляем, а что удаляем
  const toKeep = allGenerations.slice(0, KEEP_LATEST);
  let toDelete = allGenerations.slice(KEEP_LATEST);

  // Фильтр по возрасту если задан
  if (DELETE_OLDER_THAN_DAYS > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DELETE_OLDER_THAN_DAYS);
    
    toDelete = toDelete.filter(gen => new Date(gen.created_at) < cutoffDate);
    console.log(`📅 Фильтр по возрасту: удаляем генерации старше ${cutoffDate.toLocaleDateString()}`);
  }

  console.log(`✅ Сохраняем последние ${toKeep.length} генераций:`);
  toKeep.slice(0, 5).forEach((gen, index) => {
    console.log(`   ${index + 1}. ${gen.model_name} (${new Date(gen.created_at).toLocaleString()})`);
  });
  if (toKeep.length > 5) {
    console.log(`   ... и ещё ${toKeep.length - 5}`);
  }

  if (toDelete.length === 0) {
    console.log('\n✅ Нет генераций для удаления');
    return;
  }

  console.log(`\n🗑️  К удалению: ${toDelete.length} генераций`);

  // 3. Собираем все файлы для удаления из Storage
  const filesToDelete: string[] = [];
  
  for (const gen of toDelete) {
    // Output файлы
    if (gen.output_urls && Array.isArray(gen.output_urls)) {
      for (const url of gen.output_urls) {
        const fileName = extractFileName(url);
        if (fileName) {
          filesToDelete.push(fileName);
        }
      }
    }
    
    // Input файл (если загружен в наш Storage)
    if (gen.input_image_url && gen.input_image_url.includes(supabaseUrl)) {
      const fileName = extractFileName(gen.input_image_url);
      if (fileName) {
        filesToDelete.push(fileName);
      }
    }
  }

  console.log(`\n📁 Файлов в Storage к удалению: ${filesToDelete.length}`);

  // 4. Удаляем файлы из Storage
  if (filesToDelete.length > 0) {
    console.log('🗑️  Удаляем файлы из Storage...');
    
    // Удаляем батчами по 100 файлов
    const batchSize = 100;
    let deletedFiles = 0;
    
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);
      
      const { error: storageError } = await supabase.storage
        .from('generations')
        .remove(batch);
      
      if (storageError) {
        console.error(`   ⚠️  Ошибка удаления батча ${i / batchSize + 1}:`, storageError.message);
      } else {
        deletedFiles += batch.length;
      }
    }
    
    console.log(`   ✅ Удалено файлов: ${deletedFiles}`);
  }

  // 5. Удаляем записи из БД
  console.log('\n🗑️  Удаляем записи из базы данных...');
  
  const idsToDelete = toDelete.map(g => g.id);
  
  const { error: deleteError } = await supabase
    .from('generations')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('❌ Ошибка при удалении из БД:', deleteError);
    return;
  }

  console.log(`   ✅ Удалено записей: ${idsToDelete.length}`);

  // 6. Показать итоговое количество
  const { count } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Итого осталось генераций: ${count}`);
  console.log('\n✨ Очистка завершена!');
  
  // 7. Оцениваем освобожденное место
  console.log('\n💡 Совет: Проверьте использование Storage в Supabase Dashboard');
  console.log('   Storage > Buckets > generations');
}

/**
 * Извлекает имя файла из URL Supabase Storage
 */
function extractFileName(url: string): string | null {
  try {
    // URL вида: https://xxx.supabase.co/storage/v1/object/public/generations/filename.png
    const match = url.match(/\/generations\/([^?]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

// Запуск
cleanupGenerations().catch(console.error);





















