/**
 * Backfill cost_usd for existing generations
 * 
 * Run: npx ts-node scripts/backfill-costs.ts
 * Or: npx tsx scripts/backfill-costs.ts
 */

import { createClient } from '@supabase/supabase-js';
import { calculateCostUsd } from '../lib/pricing';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Generation {
  id: string;
  replicate_model: string;
  replicate_output: {
    metrics?: {
      predict_time?: number;
    };
  } | null;
  cost_usd: number | null;
}

const BATCH_SIZE = 200;
const MAX_RETRIES = 3;

async function fetchBatchWithRetry(retries = MAX_RETRIES): Promise<Generation[] | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('id, replicate_model, replicate_output, cost_usd')
        .eq('status', 'completed')
        .is('cost_usd', null)
        .limit(BATCH_SIZE);

      if (error) {
        console.log(`  Retry ${i + 1}/${retries}: ${error.message}`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }

      return data as Generation[];
    } catch (e: any) {
      console.log(`  Retry ${i + 1}/${retries}: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return null;
}

async function backfillCosts() {
  console.log('🔄 Starting cost backfill...\n');

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let totalCostUsd = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\nBatch #${batchNum}...`);
    
    const generations = await fetchBatchWithRetry();

    if (!generations || generations.length === 0) {
      console.log('No more records to process');
      break;
    }

    console.log(`  Found ${generations.length} records`);

    for (const gen of generations) {
      const predictTime = gen.replicate_output?.metrics?.predict_time;
      
      if (!predictTime || !gen.replicate_model) {
        skipped++;
        continue;
      }

      const costUsd = calculateCostUsd(predictTime, gen.replicate_model);
      totalCostUsd += costUsd;

      const { error: updateError } = await supabase
        .from('generations')
        .update({ cost_usd: costUsd })
        .eq('id', gen.id);

      if (updateError) {
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`  ✅ Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);

    // Small delay between batches
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped (no predict_time): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`\n💰 Total cost backfilled: $${totalCostUsd.toFixed(2)} USD`);
  console.log(`   In RUB (with 50% markup): ${Math.round(totalCostUsd * 1.5 * 80).toLocaleString('ru-RU')}₽`);
}

backfillCosts().catch(console.error);
