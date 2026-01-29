/**
 * Скрипт для миграции генераций пользователей в новое пространство
 * 
 * Использование:
 * npx tsx scripts/migrate-workspace-generations.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Название нового пространства куда переносим
const TARGET_WORKSPACE_NAME = 'Яндекс Еда X Контент';

async function migrate() {
  console.log('🔍 Ищу пространство:', TARGET_WORKSPACE_NAME);
  
  // 1. Находим целевое пространство
  const { data: targetWorkspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('name', TARGET_WORKSPACE_NAME)
    .single();
    
  if (wsError || !targetWorkspace) {
    console.error('❌ Пространство не найдено:', wsError?.message);
    process.exit(1);
  }
  
  console.log('✅ Найдено пространство:', targetWorkspace.name, `(${targetWorkspace.id})`);
  
  // 2. Получаем участников этого пространства
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', targetWorkspace.id);
    
  if (membersError) {
    console.error('❌ Ошибка получения участников:', membersError.message);
    process.exit(1);
  }
  
  console.log(`\n📊 Участников в пространстве: ${members?.length || 0}\n`);
  
  if (!members || members.length === 0) {
    console.log('⚠️ Нет участников для миграции');
    process.exit(0);
  }
  
  // Получаем данные пользователей
  const userIds = members.map(m => m.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('id', userIds);
  
  const usersMap = new Map((users || []).map(u => [u.id, u]));
  
  // 3. Для каждого участника переносим генерации
  let totalMigrated = 0;
  
  for (const member of members) {
    const userId = member.user_id;
    const user = usersMap.get(userId) || { email: userId, display_name: null };
    
    // Считаем генерации НЕ в целевом пространстве
    const { count: genCount } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('workspace_id', targetWorkspace.id);
    
    if (!genCount || genCount === 0) {
      console.log(`  ⏭️  ${user.display_name || user.email}: уже все генерации в пространстве`);
      continue;
    }
    
    // Переносим генерации
    const { error: migrateError } = await supabase
      .from('generations')
      .update({ workspace_id: targetWorkspace.id })
      .eq('user_id', userId);
      
    if (migrateError) {
      console.error(`  ❌ ${user.display_name || user.email}: ошибка -`, migrateError.message);
      continue;
    }
    
    console.log(`  ✅ ${user.display_name || user.email}: перенесено ${genCount} генераций`);
    totalMigrated += genCount;
  }
  
  console.log(`\n🎉 Готово! Всего перенесено генераций: ${totalMigrated}`);
}

migrate().catch(console.error);
