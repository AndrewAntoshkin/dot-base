/**
 * Sync costs from Replicate API
 * Gets all predictions from Replicate and shows total cost
 * 
 * Run: npx tsx scripts/sync-replicate-costs.ts
 */

import Replicate from 'replicate';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Parse tokens from env
const tokensEnv = process.env.REPLICATE_API_TOKENS || '';
const tokens = tokensEnv.split(',').map(t => t.trim()).filter(Boolean);

if (tokens.length === 0) {
  console.error('No REPLICATE_API_TOKENS found');
  process.exit(1);
}

interface PredictionPage {
  results: Array<{
    id: string;
    status: string;
    model: string;
    created_at: string;
    metrics?: {
      predict_time?: number;
    };
  }>;
  next?: string;
}

interface TokenStats {
  predictions: number;
  succeeded: number;
  predictTime: number;
}

async function fetchTokenStats(token: string, tokenIndex: number): Promise<TokenStats> {
  let predictions = 0;
  let succeeded = 0;
  let predictTime = 0;
  let cursor: string | undefined;
  let pageNum = 0;

  try {
    while (true) {
      pageNum++;
      
      const url = cursor 
        ? `https://api.replicate.com/v1/predictions?cursor=${cursor}`
        : 'https://api.replicate.com/v1/predictions';
        
      const response = await fetch(url, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (!response.ok) {
        break;
      }

      const page: PredictionPage = await response.json();
      
      if (!page.results || page.results.length === 0) {
        break;
      }

      for (const pred of page.results) {
        predictions++;
        if (pred.status === 'succeeded') {
          succeeded++;
          predictTime += pred.metrics?.predict_time || 0;
        }
      }

      // Get next page cursor
      if (page.next) {
        try {
          const nextUrl = new URL(page.next);
          cursor = nextUrl.searchParams.get('cursor') || undefined;
          if (!cursor) break;
        } catch {
          break;
        }
      } else {
        break;
      }

      // Limit pages per token
      if (pageNum >= 50) break;
      
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (error: any) {
    console.log(`  Token ${tokenIndex + 1}: Error - ${error.message}`);
  }

  return { predictions, succeeded, predictTime };
}

async function syncCosts() {
  console.log('🔄 Fetching predictions from ALL Replicate tokens...\n');
  console.log(`Checking ${tokens.length} token(s)...\n`);

  let totalPredictions = 0;
  let totalSucceeded = 0;
  let totalPredictTime = 0;

  for (let i = 0; i < tokens.length; i++) {
    const stats = await fetchTokenStats(tokens[i], i);
    console.log(`  Token ${i + 1}: ${stats.predictions} predictions, ${stats.succeeded} succeeded, ${(stats.predictTime / 60).toFixed(1)} min`);
    
    totalPredictions += stats.predictions;
    totalSucceeded += stats.succeeded;
    totalPredictTime += stats.predictTime;
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ALL REPLICATE ACCOUNTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total predictions: ${totalPredictions}`);
  console.log(`Succeeded: ${totalSucceeded}`);
  console.log(`Total predict time: ${(totalPredictTime / 3600).toFixed(2)} hours (${(totalPredictTime / 60).toFixed(0)} min)`);
  
  // Estimate cost with different hardware prices
  const avgPricePerSecond = 0.001; // Average across hardware
  const estimatedCost = totalPredictTime * avgPricePerSecond;
  
  console.log('\n💰 Estimated costs:');
  console.log(`  Low estimate ($0.0005/sec):  $${(totalPredictTime * 0.0005).toFixed(2)}`);
  console.log(`  Mid estimate ($0.001/sec):   $${estimatedCost.toFixed(2)}`);
  console.log(`  High estimate ($0.002/sec):  $${(totalPredictTime * 0.002).toFixed(2)}`);
  console.log(`\n  Note: Actual cost depends on hardware used per model`);
  console.log(`  Check https://replicate.com/account/billing for exact figures`);
}

syncCosts().catch(console.error);
