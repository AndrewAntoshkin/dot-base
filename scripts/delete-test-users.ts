/**
 * Script to delete test users from the database
 * Run with: npx tsx scripts/delete-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test users to delete (based on screenshots)
const TEST_USERS = [
  'test@basecraft.ru',
  'test2@basecraft.ru',
];

const TEST_USERNAMES = [
  'testuser',
];

async function deleteTestUsers() {
  console.log('Starting test user cleanup...\n');

  // Find test users by email
  const { data: usersByEmail } = await supabase
    .from('users')
    .select('id, email, telegram_username')
    .in('email', TEST_USERS);

  // Find test users by username
  const { data: usersByUsername } = await supabase
    .from('users')
    .select('id, email, telegram_username')
    .in('telegram_username', TEST_USERNAMES);

  const allTestUsers = [...(usersByEmail || []), ...(usersByUsername || [])];
  const uniqueUsers = allTestUsers.filter((user, index, self) => 
    index === self.findIndex((u) => u.id === user.id)
  );

  if (uniqueUsers.length === 0) {
    console.log('No test users found.');
    return;
  }

  console.log('Found test users:');
  uniqueUsers.forEach(user => {
    console.log(`  - ${user.email || user.telegram_username} (ID: ${user.id})`);
  });
  console.log('');

  const userIds = uniqueUsers.map(u => u.id);

  // Delete related data first (foreign keys)
  console.log('Deleting related generations...');
  const { error: genError, count: genCount } = await supabase
    .from('generations')
    .delete({ count: 'exact' })
    .in('user_id', userIds);
  
  if (genError) {
    console.error('Error deleting generations:', genError);
  } else {
    console.log(`  Deleted ${genCount} generations`);
  }

  // Delete workspace memberships
  console.log('Deleting workspace memberships...');
  const { error: memberError, count: memberCount } = await supabase
    .from('workspace_members')
    .delete({ count: 'exact' })
    .in('user_id', userIds);
  
  if (memberError) {
    console.error('Error deleting workspace memberships:', memberError);
  } else {
    console.log(`  Deleted ${memberCount} memberships`);
  }

  // Delete the users themselves
  console.log('Deleting users...');
  const { error: userError, count: userCount } = await supabase
    .from('users')
    .delete({ count: 'exact' })
    .in('id', userIds);
  
  if (userError) {
    console.error('Error deleting users:', userError);
  } else {
    console.log(`  Deleted ${userCount} users`);
  }

  console.log('\n✅ Test user cleanup complete!');
}

deleteTestUsers().catch(console.error);
