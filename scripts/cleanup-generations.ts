import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupGenerations() {
  console.log('🧹 Очистка старых генераций...');

  // 1. Получить последние 3 генерации
  const { data: latestGenerations, error: fetchError } = await supabase
    .from('generations')
    .select('id, model_name, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (fetchError) {
    console.error('❌ Ошибка при получении генераций:', fetchError);
    return;
  }

  console.log(`\n✅ Сохраняем последние 3 генерации:`);
  latestGenerations?.forEach((gen, index) => {
    console.log(`  ${index + 1}. ${gen.model_name} (${new Date(gen.created_at).toLocaleString()})`);
  });

  // 2. Удалить все остальные
  const latestIds = latestGenerations?.map(g => g.id) || [];
  
  const { data: deletedData, error: deleteError } = await supabase
    .from('generations')
    .delete()
    .not('id', 'in', `(${latestIds.map(id => `'${id}'`).join(',')})`)
    .select();

  if (deleteError) {
    console.error('❌ Ошибка при удалении:', deleteError);
    return;
  }

  console.log(`\n🗑️  Удалено генераций: ${deletedData?.length || 0}`);

  // 3. Показать итоговое количество
  const { count } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Осталось генераций в базе: ${count}`);
  console.log('\n✨ Готово!');
}

cleanupGenerations().catch(console.error);

