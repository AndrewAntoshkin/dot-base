/**
 * Backfill cost_usd by fetching predict_time from Replicate API
 * 
 * This script fetches actual prediction data from Replicate API
 * for generations that don't have cost_usd, then calculates the cost.
 * 
 * Run: npx tsx scripts/backfill-costs-from-api.ts
 * 
 * Options:
 *   --user=<username>    Only process for specific user
 *   --dry-run            Show what would be updated without making changes
 *   --limit=<n>          Limit number of records to process
 */

import { createClient } from '@supabase/supabase-js';
import { calculateCostUsd } from '../lib/pricing';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Parse tokens from env
const tokensEnv = process.env.REPLICATE_API_TOKENS || '';
const tokens = tokensEnv.split(',').map(t => t.trim()).filter(Boolean);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (tokens.length === 0) {
  console.error('No REPLICATE_API_TOKENS found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line args
const args = process.argv.slice(2);
const userArg = args.find(a => a.startsWith('--user='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg) : undefined;

interface Generation {
  id: string;
  replicate_prediction_id: string | null;
  replicate_model: string;
  replicate_output: any;
  cost_usd: number | null;
}

interface ReplicatePrediction {
  id: string;
  status: string;
  metrics?: {
    predict_time?: number;
  };
  error?: string;
}

const BATCH_SIZE = 50;
let currentTokenIndex = 0;

function getNextToken(): string {
  const token = tokens[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
  return token;
}

async function fetchPrediction(predictionId: string): Promise<ReplicatePrediction | null> {
  const token = getNextToken();
  
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.status === 404) {
      return null; // Prediction not found
    }

    if (!response.ok) {
      console.log(`    API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.log(`    Fetch error: ${error.message}`);
    return null;
  }
}

async function backfillFromApi() {
  console.log('🔄 Backfilling costs from Replicate API...');
  console.log(`   Tokens available: ${tokens.length}`);
  if (userArg) console.log(`   Filtering by user: ${userArg}`);
  if (dryRun) console.log('   ⚠️  DRY RUN MODE - no changes will be made');
  if (limit) console.log(`   Limit: ${limit} records`);
  console.log('');

  // Build query
  let query = supabase
    .from('generations')
    .select(`
      id,
      replicate_prediction_id,
      replicate_model,
      replicate_output,
      cost_usd,
      users!inner(telegram_username)
    `)
    .eq('status', 'completed')
    .is('cost_usd', null)
    .not('replicate_prediction_id', 'is', null);

  if (userArg) {
    query = query.ilike('users.telegram_username', `%${userArg}%`);
  }

  if (limit) {
    query = query.limit(limit);
  } else {
    query = query.limit(1000);
  }

  const { data: generations, error } = await query;

  if (error) {
    console.error('Error fetching generations:', error);
    return;
  }

  if (!generations || generations.length === 0) {
    console.log('✅ No generations to process');
    return;
  }

  console.log(`Found ${generations.length} generations without cost_usd\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let alreadyHadTime = 0;
  let totalCostUsd = 0;

  const modelStats: Record<string, { count: number; cost: number }> = {};

  for (let i = 0; i < generations.length; i++) {
    const gen = generations[i] as any;
    
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`Processing ${i + 1}/${generations.length}...`);
    }

    // Check if we already have predict_time in replicate_output
    let predictTime = gen.replicate_output?.metrics?.predict_time;

    if (!predictTime && gen.replicate_prediction_id) {
      // Fetch from API
      const prediction = await fetchPrediction(gen.replicate_prediction_id);
      
      if (!prediction) {
        notFound++;
        continue;
      }

      predictTime = prediction.metrics?.predict_time;
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } else if (predictTime) {
      alreadyHadTime++;
    }

    if (!predictTime) {
      skipped++;
      continue;
    }

    const costUsd = calculateCostUsd(predictTime, gen.replicate_model);
    totalCostUsd += costUsd;

    // Track by model
    if (!modelStats[gen.replicate_model]) {
      modelStats[gen.replicate_model] = { count: 0, cost: 0 };
    }
    modelStats[gen.replicate_model].count++;
    modelStats[gen.replicate_model].cost += costUsd;

    if (!dryRun) {
      // Update both cost_usd and replicate_output with metrics if missing
      const updateData: any = { cost_usd: costUsd };
      
      if (!gen.replicate_output?.metrics?.predict_time) {
        updateData.replicate_output = {
          ...(gen.replicate_output || {}),
          metrics: {
            ...(gen.replicate_output?.metrics || {}),
            predict_time: predictTime,
          },
        };
      }

      const { error: updateError } = await supabase
        .from('generations')
        .update(updateData)
        .eq('id', gen.id);

      if (updateError) {
        console.log(`    Error updating ${gen.id}: ${updateError.message}`);
        skipped++;
        continue;
      }
    }

    updated++;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated}${dryRun ? ' (would be updated)' : ''}`);
  console.log(`⏭️  Skipped (no predict_time): ${skipped}`);
  console.log(`❌ Not found in API: ${notFound}`);
  console.log(`📦 Already had predict_time: ${alreadyHadTime}`);
  
  console.log('\n💰 Cost by model:');
  const sortedModels = Object.entries(modelStats)
    .sort((a, b) => b[1].cost - a[1].cost);
  
  for (const [model, stats] of sortedModels) {
    const modelName = model.split('/').pop() || model;
    console.log(`   ${modelName}: ${stats.count} × $${(stats.cost / stats.count).toFixed(4)} = $${stats.cost.toFixed(4)}`);
  }

  console.log('\n💵 TOTAL:');
  console.log(`   Cost USD: $${totalCostUsd.toFixed(4)}`);
  console.log(`   Cost RUB (×150): ${Math.round(totalCostUsd * 150).toLocaleString('ru-RU')}₽`);
}

backfillFromApi().catch(console.error);




