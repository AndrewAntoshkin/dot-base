/**
 * Скрипт для проверки генераций пользователя
 * Использование: npx tsx scripts/check-user-generations.ts antonbmx@list.ru
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Читаем .env.local вручную
const envPath = join(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.error('Could not read .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserGenerations(email: string) {
  console.log(`\n🔍 Поиск пользователя: ${email}\n`);

  // Найти пользователя по email в auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Ошибка получения пользователей:', authError);
    return;
  }

  const user = authUser.users.find(u => u.email === email);
  
  if (!user) {
    console.error(`❌ Пользователь с email ${email} не найден`);
    return;
  }

  console.log(`✅ Пользователь найден:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Создан: ${user.created_at}`);
  console.log(`   Последний вход: ${user.last_sign_in_at || 'нет данных'}`);

  // Получить последние генерации
  console.log(`\n📋 Последние генерации:\n`);

  const { data: generations, error: genError } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (genError) {
    console.error('Ошибка получения генераций:', genError);
    return;
  }

  if (!generations || generations.length === 0) {
    console.log('   Генерации не найдены');
    return;
  }

  generations.forEach((gen, index) => {
    console.log(`--- Генерация ${index + 1} ---`);
    console.log(`   ID: ${gen.id}`);
    console.log(`   Модель: ${gen.model_name} (${gen.model_id})`);
    console.log(`   Action: ${gen.action}`);
    console.log(`   Статус: ${gen.status}`);
    console.log(`   Создана: ${gen.created_at}`);
    
    if (gen.prompt) {
      console.log(`   Prompt: ${gen.prompt.substring(0, 100)}${gen.prompt.length > 100 ? '...' : ''}`);
    }
    
    if (gen.error_message) {
      console.log(`   ❌ ОШИБКА: ${gen.error_message}`);
    }
    
    if (gen.replicate_prediction_id) {
      console.log(`   Prediction ID: ${gen.replicate_prediction_id}`);
    }
    
    if (gen.output_urls && gen.output_urls.length > 0) {
      console.log(`   Output URLs: ${gen.output_urls.length} файл(ов)`);
    }
    
    if (gen.input_video_url) {
      console.log(`   Input Video: ${gen.input_video_url.substring(0, 80)}...`);
    }
    
    if (gen.replicate_input) {
      console.log(`   Replicate Input:`, JSON.stringify(gen.replicate_input, null, 2).substring(0, 500));
    }
    
    if (gen.replicate_output && gen.status === 'failed') {
      console.log(`   Replicate Output (error):`, JSON.stringify(gen.replicate_output, null, 2).substring(0, 500));
    }
    
    console.log('');
  });

  // Статистика
  console.log(`\n📊 Статистика:`);
  const stats = {
    total: generations.length,
    completed: generations.filter(g => g.status === 'completed').length,
    failed: generations.filter(g => g.status === 'failed').length,
    processing: generations.filter(g => g.status === 'processing').length,
    pending: generations.filter(g => g.status === 'pending').length,
  };
  
  console.log(`   Всего: ${stats.total}`);
  console.log(`   ✅ Завершено: ${stats.completed}`);
  console.log(`   ❌ Ошибки: ${stats.failed}`);
  console.log(`   ⏳ В процессе: ${stats.processing}`);
  console.log(`   🕐 Ожидает: ${stats.pending}`);

  // Показать failed генерации подробнее
  const failedGens = generations.filter(g => g.status === 'failed');
  if (failedGens.length > 0) {
    console.log(`\n🔴 Детали ошибок:`);
    failedGens.forEach((gen, i) => {
      console.log(`\n   ${i + 1}. ${gen.model_name}`);
      console.log(`      Ошибка: ${gen.error_message || 'Нет сообщения'}`);
      if (gen.replicate_output?.error) {
        console.log(`      Replicate error: ${gen.replicate_output.error}`);
      }
    });
  }
}

// Запуск
const email = process.argv[2] || 'antonbmx@list.ru';
checkUserGenerations(email).catch(console.error);

