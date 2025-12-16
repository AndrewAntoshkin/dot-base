/**
 * Script to verify total cost for all generations
 * Run with: npx tsx scripts/verify-total-cost.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing constants (same as lib/pricing.ts)
const USD_TO_RUB = 80;
const MARKUP = 1.5; // 50% markup

async function verifyTotalCost() {
  console.log('Verifying total cost for all generations...\n');

  // Get all completed generations with cost
  const { data: generations, error } = await supabase
    .from('generations')
    .select('id, user_id, cost_usd, status, created_at')
    .eq('status', 'completed')
    .not('cost_usd', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${generations?.length || 0} completed generations with cost\n`);

  // Calculate totals
  let totalCostUsd = 0;
  const costByUser: Record<string, { count: number; costUsd: number }> = {};

  generations?.forEach(gen => {
    totalCostUsd += gen.cost_usd || 0;
    
    if (!costByUser[gen.user_id]) {
      costByUser[gen.user_id] = { count: 0, costUsd: 0 };
    }
    costByUser[gen.user_id].count++;
    costByUser[gen.user_id].costUsd += gen.cost_usd || 0;
  });

  // Convert to RUB with markup
  const totalCostRub = totalCostUsd * MARKUP * USD_TO_RUB;

  console.log('=== TOTAL COST ===');
  console.log(`USD (raw): $${totalCostUsd.toFixed(4)}`);
  console.log(`RUB (with 50% markup): ${Math.round(totalCostRub).toLocaleString('ru-RU')}₽`);
  console.log('');

  // Get user emails
  const userIds = Object.keys(costByUser);
  const { data: users } = await supabase
    .from('users')
    .select('id, email, telegram_username')
    .in('id', userIds);

  const userMap: Record<string, string> = {};
  users?.forEach(u => {
    userMap[u.id] = u.email || u.telegram_username || u.id;
  });

  // Top 10 users by cost
  const sortedUsers = Object.entries(costByUser)
    .map(([userId, data]) => ({
      user: userMap[userId] || userId,
      ...data,
      costRub: Math.round(data.costUsd * MARKUP * USD_TO_RUB)
    }))
    .sort((a, b) => b.costRub - a.costRub)
    .slice(0, 10);

  console.log('=== TOP 10 USERS BY COST ===');
  console.log('─'.repeat(60));
  sortedUsers.forEach((u, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${u.user.padEnd(35)} ${u.count.toString().padStart(4)} gens | ${u.costRub.toLocaleString('ru-RU').padStart(8)}₽`);
  });

  // Count generations without cost
  const { count: withoutCost } = await supabase
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .is('cost_usd', null);

  console.log('\n=== SUMMARY ===');
  console.log(`Generations with cost: ${generations?.length || 0}`);
  console.log(`Generations without cost: ${withoutCost || 0}`);
  console.log(`Total cost: ${Math.round(totalCostRub).toLocaleString('ru-RU')}₽`);
}

verifyTotalCost().catch(console.error);
