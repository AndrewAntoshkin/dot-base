/**
 * Скрипт для отправки уведомления всем пользователям
 * 
 * Использование:
 * npx tsx scripts/send-broadcast-notification.ts
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

// Конфигурация уведомления
const NOTIFICATION = {
  type: 'update' as const,
  title: 'Обновление v0.2.6',
  message: `Добавлена система поддержки и уведомлений:

• Кнопка поддержки — в правом нижнем углу на всех страницах
• Форма обращения — выбор темы, описание, до 5 скриншотов
• Центр уведомлений — в хедере с индикатором непрочитанных
• Ответы от поддержки приходят мгновенно

Также добавлены комментарии в Flow для командной работы.`,
  link: '/docs/changelog',
};

async function sendBroadcast() {
  console.log('🚀 Начинаю рассылку уведомлений...\n');
  console.log('📝 Текст уведомления:');
  console.log('─'.repeat(50));
  console.log(`Заголовок: ${NOTIFICATION.title}`);
  console.log(`Сообщение:\n${NOTIFICATION.message}`);
  console.log(`Ссылка: ${NOTIFICATION.link}`);
  console.log('─'.repeat(50));
  console.log('');

  // Получаем всех пользователей
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('⚠️ Нет пользователей для отправки');
    process.exit(0);
  }

  console.log(`📊 Найдено пользователей: ${users.length}\n`);

  // Создаём уведомления для всех пользователей
  const notifications = users.map(user => ({
    user_id: user.id,
    type: NOTIFICATION.type,
    title: NOTIFICATION.title,
    message: NOTIFICATION.message,
    link: NOTIFICATION.link,
    is_read: false,
    metadata: {},
  }));

  // Вставляем все уведомления одним запросом
  const { data: inserted, error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)
    .select('id');

  if (insertError) {
    console.error('❌ Ошибка отправки уведомлений:', insertError.message);
    process.exit(1);
  }

  console.log(`✅ Успешно отправлено уведомлений: ${inserted?.length || 0}`);
  
  // Показываем список получателей
  console.log('\n📬 Получатели:');
  users.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.display_name || user.email || user.id}`);
  });
}

sendBroadcast().catch(console.error);
