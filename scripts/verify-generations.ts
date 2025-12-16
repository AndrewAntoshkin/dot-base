/**
 * Script to verify generation counts for all users
 * Run with: npx tsx scripts/verify-generations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyGenerations() {
  console.log('Verifying generation counts for all users...\n');

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, telegram_username')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`Found ${users?.length || 0} users\n`);

  // Get generation counts for each user
  const results: { user: string; count: number }[] = [];
  let totalGenerations = 0;

  for (const user of users || []) {
    const { count, error } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error(`Error for user ${user.email}:`, error);
      continue;
    }

    const genCount = count || 0;
    totalGenerations += genCount;
    
    results.push({
      user: user.email || user.telegram_username || user.id,
      count: genCount
    });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  console.log('Top 15 users by generations:');
  console.log('─'.repeat(50));
  results.slice(0, 15).forEach((r, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${r.user.padEnd(35)} ${r.count}`);
  });

  console.log('\n' + '─'.repeat(50));
  console.log(`Total users: ${users?.length}`);
  console.log(`Total generations: ${totalGenerations}`);
  
  // Verify total
  const { count: dbTotal } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true });
  
  console.log(`DB total generations: ${dbTotal}`);
  
  if (totalGenerations === dbTotal) {
    console.log('\n✅ Counts match!');
  } else {
    console.log(`\n⚠️ Mismatch: sum=${totalGenerations}, db=${dbTotal}`);
  }
}

verifyGenerations().catch(console.error);
