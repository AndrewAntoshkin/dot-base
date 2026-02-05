/**
 * Script to generate a report for content team members
 * Run with: npx tsx scripts/content-team-report.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing constants
const USD_TO_RUB = 80;
const MARKUP = 1.6; // 60% markup

// Content team emails
const CONTENT_TEAM_EMAILS = [
  'tankis@yandex-team.ru',
  'katemin@yandex-team.ru',
  'lera24ks@yandex-team.ru',
  'pl-ulyankina@yandex-team.ru',
  'mariaovch@yandex-team.ru',
  'darikali@yandex-team.ru',
  'venera-erm@yandex-team.ru',
  'demkinyandex@yandex-team.ru',
];

interface UserReport {
  email: string;
  userId: string | null;
  totalGenerations: number;
  completedGenerations: number;
  failedGenerations: number;
  costUsd: number;
  costRub: number;
  generationsByAction: Record<string, number>;
}

async function generateContentTeamReport() {
  console.log('═'.repeat(70));
  console.log('  CONTENT TEAM REPORT');
  console.log('  Markup: 60% | Exchange rate: 80 RUB/USD');
  console.log('═'.repeat(70));
  console.log('');

  const reports: UserReport[] = [];

  // Get all auth users to map emails to IDs
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  // Also check public.users table for email mapping
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id, email, telegram_username');

  if (publicError) {
    console.error('Error fetching public users:', publicError);
  }

  // Create email to user ID mapping
  const emailToUserId: Record<string, string> = {};
  
  authUsers.users.forEach(u => {
    if (u.email) {
      emailToUserId[u.email.toLowerCase()] = u.id;
    }
  });

  publicUsers?.forEach(u => {
    if (u.email) {
      emailToUserId[u.email.toLowerCase()] = u.id;
    }
  });

  // Process each content team member
  for (const email of CONTENT_TEAM_EMAILS) {
    const userId = emailToUserId[email.toLowerCase()];
    
    const report: UserReport = {
      email,
      userId,
      totalGenerations: 0,
      completedGenerations: 0,
      failedGenerations: 0,
      costUsd: 0,
      costRub: 0,
      generationsByAction: {},
    };

    if (!userId) {
      console.log(`⚠️  ${email} - USER NOT FOUND`);
      reports.push(report);
      continue;
    }

    // Get all generations for this user
    const { data: generations, error: genError } = await supabase
      .from('generations')
      .select('id, action, status, cost_usd, created_at')
      .eq('user_id', userId);

    if (genError) {
      console.error(`Error fetching generations for ${email}:`, genError);
      continue;
    }

    report.totalGenerations = generations?.length || 0;
    
    generations?.forEach(gen => {
      // Count by status
      if (gen.status === 'completed') {
        report.completedGenerations++;
      } else if (gen.status === 'failed') {
        report.failedGenerations++;
      }

      // Sum cost (only for completed generations with cost)
      if (gen.status === 'completed' && gen.cost_usd) {
        report.costUsd += gen.cost_usd;
      }

      // Count by action
      const action = gen.action || 'unknown';
      report.generationsByAction[action] = (report.generationsByAction[action] || 0) + 1;
    });

    // Calculate cost in RUB with markup
    report.costRub = report.costUsd * MARKUP * USD_TO_RUB;

    reports.push(report);
  }

  // Print individual reports
  console.log('\n📊 INDIVIDUAL REPORTS');
  console.log('─'.repeat(70));

  reports.forEach(r => {
    if (!r.userId) {
      console.log(`\n${r.email}`);
      console.log('   ❌ User not found in database');
      return;
    }

    console.log(`\n${r.email}`);
    console.log(`   Generations: ${r.totalGenerations} total (✅ ${r.completedGenerations} completed, ❌ ${r.failedGenerations} failed)`);
    
    if (Object.keys(r.generationsByAction).length > 0) {
      const actionsList = Object.entries(r.generationsByAction)
        .map(([action, count]) => `${action}: ${count}`)
        .join(', ');
      console.log(`   By action: ${actionsList}`);
    }
    
    console.log(`   Cost: $${r.costUsd.toFixed(4)} USD → ${Math.round(r.costRub).toLocaleString('ru-RU')}₽`);
  });

  // Print summary
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  SUMMARY');
  console.log('═'.repeat(70));

  const activeReports = reports.filter(r => r.userId);
  const notFoundReports = reports.filter(r => !r.userId);

  const totalGenerations = activeReports.reduce((sum, r) => sum + r.totalGenerations, 0);
  const totalCompleted = activeReports.reduce((sum, r) => sum + r.completedGenerations, 0);
  const totalFailed = activeReports.reduce((sum, r) => sum + r.failedGenerations, 0);
  const totalCostUsd = activeReports.reduce((sum, r) => sum + r.costUsd, 0);
  const totalCostRub = totalCostUsd * MARKUP * USD_TO_RUB;

  console.log(`\nUsers found: ${activeReports.length}/${CONTENT_TEAM_EMAILS.length}`);
  
  if (notFoundReports.length > 0) {
    console.log(`Users not found: ${notFoundReports.map(r => r.email).join(', ')}`);
  }

  console.log(`\nTotal generations: ${totalGenerations}`);
  console.log(`  - Completed: ${totalCompleted}`);
  console.log(`  - Failed: ${totalFailed}`);
  console.log(`  - Other: ${totalGenerations - totalCompleted - totalFailed}`);

  console.log(`\n💰 TOTAL COST`);
  console.log(`   Raw USD: $${totalCostUsd.toFixed(4)}`);
  console.log(`   With 60% markup: $${(totalCostUsd * MARKUP).toFixed(4)}`);
  console.log(`   In RUB (rate 80): ${Math.round(totalCostRub).toLocaleString('ru-RU')}₽`);

  // Table format for copy-paste
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('  TABLE FORMAT (for spreadsheet)');
  console.log('═'.repeat(70));
  console.log('\nEmail\tGenerations\tCompleted\tFailed\tCost USD\tCost RUB');
  
  reports.forEach(r => {
    console.log(`${r.email}\t${r.totalGenerations}\t${r.completedGenerations}\t${r.failedGenerations}\t${r.costUsd.toFixed(4)}\t${Math.round(r.costRub)}`);
  });

  console.log(`TOTAL\t${totalGenerations}\t${totalCompleted}\t${totalFailed}\t${totalCostUsd.toFixed(4)}\t${Math.round(totalCostRub)}`);
}

generateContentTeamReport().catch(console.error);
