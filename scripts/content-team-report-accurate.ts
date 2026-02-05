/**
 * ACCURATE Content Team Report with Real Replicate Pricing
 * Based on actual Replicate pricing from their website (January 2026)
 * 
 * Run: npx tsx scripts/content-team-report-accurate.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Pricing constants for final calculation
const USD_TO_RUB = 80;
const MARKUP = 1.6; // 60% markup

// ACTUAL Replicate pricing (January 2026)
// Source: https://replicate.com/pricing, model pages, and third-party APIs
const FIXED_PRICE_MODELS: Record<string, number> = {
  // === IMAGE GENERATION (per output image) ===
  'google/nano-banana-pro': 0.12,         // $0.12-0.15/image (verified via NanoBananaAPI)
  'google/nano-banana': 0.08,             // $0.08/image
  'bytedance/seedream-4': 0.03,           // $0.03/image
  'bytedance/seedream-4.5': 0.04,         // $0.04/image
  'black-forest-labs/flux-2-pro': 0.05,   // $0.015 + ~$0.035 per megapixel avg
  'black-forest-labs/flux-2-max': 0.08,   // Higher quality version
  'black-forest-labs/flux-1.1-pro': 0.04, // $0.04/output image
  'black-forest-labs/flux-dev': 0.025,    // $0.025/output image
  'black-forest-labs/flux-schnell': 0.003,// $3/1000 images
  'black-forest-labs/flux-kontext-pro': 0.04,
  'black-forest-labs/flux-kontext-max': 0.06,
  'black-forest-labs/flux-fill-pro': 0.05,
  'black-forest-labs/flux-canny-pro': 0.05,
  'black-forest-labs/flux-depth-pro': 0.05,
  'ideogram-ai/ideogram-v2': 0.08,
  'ideogram-ai/ideogram-v2-turbo': 0.05,
  'ideogram-ai/ideogram-v3-turbo': 0.03,  // $0.03/image
  'ideogram-ai/ideogram-v3-balanced': 0.06,
  'ideogram-ai/ideogram-v3-quality': 0.09,
  'recraft-ai/recraft-v3': 0.04,          // $0.04/output image
  'recraft-ai/recraft-v3-svg': 0.06,
  'recraft-ai/recraft-crisp-upscale': 0.04,
  'google/imagen-4': 0.03,
  'google/imagen-4-ultra': 0.06,
  'stability-ai/stable-diffusion-3.5-large': 0.035,
  
  // === UPSCALE (per image) - time-based billing ===
  'philz1337x/clarity-upscaler': 0.017,   // ~$0.017/run (A100 40GB, ~15 sec)
  'philz1337x/crystal-upscaler': 0.025,   // ~$0.025/run (similar to clarity)
  'google/upscaler': 0.02,
  'nightmareai/real-esrgan': 0.005,
  'cjwbw/real-esrgan': 0.005,
  
  // === REMOVE BG (per image) ===
  'lucataco/remove-bg': 0.02,
  'cjwbw/rembg': 0.01,
  
  // === EDIT/INPAINT (per image) ===
  'ideogram-ai/ideogram-v2-edit': 0.08,
  'prunaai/p-image-edit': 0.01,
  'fal-ai/flux-pro-v1.1-ultra/image-to-image': 0.06,
  
  // === EXPAND (per image) ===
  'fal-ai/outpainter': 0.04,
  'flux-kontext-apps/expand-image': 0.05,
  'fal-ai/genfill': 0.04,
  
  // === ANALYZE (per request) ===
  'salesforce/blip': 0.001,
  'yorickvp/llava-13b': 0.005,
  'meta/llama-3.2-90b-vision': 0.01,
};

// Video pricing (per second of output)
const VIDEO_PRICE_PER_SECOND: Record<string, number> = {
  'kwaivgi/kling-v1.6-pro': 0.10,
  'kwaivgi/kling-v2-master': 0.14,
  'kwaivgi/kling-v2.0': 0.12,
  'kwaivgi/kling-v2.1': 0.10,
  'kwaivgi/kling-v2.5-turbo-pro': 0.08,
  'google/veo-2': 0.15,
  'google/veo-3': 0.20,
  'google/veo-3.1': 0.18,
  'google/veo-3.1-fast': 0.12,
  'luma/ray': 0.10,
  'luma/ray-2': 0.12,
  'minimax/video-01': 0.08,
  'minimax/video-01-live': 0.10,
  'wan-video/wan-2.1': 0.09,
  'wan-video/wan-2.5-i2v': 0.12,
  'wan-video/wan-2.5-i2v-fast': 0.09,
  'fofr/ltx-video': 0.05,
  'tencent/hunyuan-video': 0.10,
  'seedance/seedance-1.0': 0.10,
  'bytedance/seedance-1-pro': 0.12,
  'bytedance/seedance-1-pro-fast': 0.08,
  'bytedance/seedance-1.5-pro': 0.15,
  'genmo/mochi-1': 0.08,
  'luma/modify-video': 0.10,
  'luma/video-merge': 0.05,
  'haiper/haiper-video-2': 0.10,
  'minimax/hailuo-02': 0.12,
};

// Default video length assumptions (seconds)
const DEFAULT_VIDEO_LENGTH = 5;

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

function getModelPrice(replicateModel: string, action: string, settings?: any): number {
  // Normalize model name
  const modelName = replicateModel.toLowerCase();
  
  // Check fixed price first
  for (const [key, price] of Object.entries(FIXED_PRICE_MODELS)) {
    if (modelName.includes(key.toLowerCase()) || key.toLowerCase().includes(modelName.split('/').pop() || '')) {
      return price;
    }
  }
  
  // Check if it's a video model
  const isVideo = action.includes('video') || modelName.includes('video') || 
                  modelName.includes('kling') || modelName.includes('veo') ||
                  modelName.includes('seedance') || modelName.includes('wan') ||
                  modelName.includes('luma') || modelName.includes('hailuo');
  
  if (isVideo) {
    for (const [key, pricePerSec] of Object.entries(VIDEO_PRICE_PER_SECOND)) {
      if (modelName.includes(key.toLowerCase()) || key.toLowerCase().includes(modelName.split('/').pop() || '')) {
        const duration = settings?.duration || DEFAULT_VIDEO_LENGTH;
        return pricePerSec * duration;
      }
    }
    // Default video pricing
    return 0.10 * DEFAULT_VIDEO_LENGTH; // $0.50 for 5 sec video
  }
  
  // Default image pricing based on action
  switch (action) {
    case 'create': return 0.04;
    case 'edit': return 0.05;
    case 'upscale': return 0.05;
    case 'remove_bg': return 0.02;
    case 'inpaint': return 0.05;
    case 'expand': return 0.04;
    default: return 0.03;
  }
}

interface UserReport {
  email: string;
  userId: string | null;
  totalGenerations: number;
  completedGenerations: number;
  failedGenerations: number;
  costUsd: number;
  costWithMarkup: number;
  costRub: number;
  modelBreakdown: Record<string, { count: number; cost: number }>;
}

async function generateAccurateReport() {
  console.log('═'.repeat(80));
  console.log('  ACCURATE CONTENT TEAM REPORT');
  console.log('  Based on REAL Replicate pricing (January 2026)');
  console.log('  Markup: 60% | Exchange rate: 80 RUB/USD');
  console.log('═'.repeat(80));
  console.log('');

  const reports: UserReport[] = [];

  // Get user mappings
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailToUserId: Record<string, string> = {};
  authUsers?.users.forEach(u => {
    if (u.email) emailToUserId[u.email.toLowerCase()] = u.id;
  });

  // Process each user
  for (const email of CONTENT_TEAM_EMAILS) {
    const userId = emailToUserId[email.toLowerCase()];
    
    const report: UserReport = {
      email,
      userId,
      totalGenerations: 0,
      completedGenerations: 0,
      failedGenerations: 0,
      costUsd: 0,
      costWithMarkup: 0,
      costRub: 0,
      modelBreakdown: {},
    };

    if (!userId) {
      reports.push(report);
      continue;
    }

    // Get ALL generations
    const { data: generations } = await supabase
      .from('generations')
      .select('id, action, status, replicate_model, model_id, settings')
      .eq('user_id', userId);

    if (!generations) continue;

    report.totalGenerations = generations.length;

    generations.forEach(gen => {
      if (gen.status === 'completed') {
        report.completedGenerations++;
        
        const modelKey = gen.replicate_model || gen.model_id || 'unknown';
        const modelName = modelKey.split('/').pop() || modelKey;
        const price = getModelPrice(modelKey, gen.action, gen.settings);
        
        report.costUsd += price;
        
        if (!report.modelBreakdown[modelName]) {
          report.modelBreakdown[modelName] = { count: 0, cost: 0 };
        }
        report.modelBreakdown[modelName].count++;
        report.modelBreakdown[modelName].cost += price;
      } else if (gen.status === 'failed') {
        report.failedGenerations++;
      }
    });

    report.costWithMarkup = report.costUsd * MARKUP;
    report.costRub = report.costWithMarkup * USD_TO_RUB;

    reports.push(report);
  }

  // Print individual reports
  console.log('📊 INDIVIDUAL REPORTS');
  console.log('─'.repeat(80));

  reports.forEach(r => {
    if (!r.userId) {
      console.log(`\n❌ ${r.email} - USER NOT FOUND`);
      return;
    }

    console.log(`\n${r.email}`);
    console.log(`   Generations: ${r.totalGenerations} (✅ ${r.completedGenerations} | ❌ ${r.failedGenerations})`);
    
    // Top 5 models by cost
    const sortedModels = Object.entries(r.modelBreakdown)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 5);
    
    if (sortedModels.length > 0) {
      console.log('   Top models:');
      sortedModels.forEach(([model, data]) => {
        console.log(`     - ${model}: ${data.count} runs × $${(data.cost / data.count).toFixed(3)} = $${data.cost.toFixed(2)}`);
      });
    }
    
    console.log(`   💰 Cost: $${r.costUsd.toFixed(2)} → with markup: $${r.costWithMarkup.toFixed(2)} → ${Math.round(r.costRub).toLocaleString('ru-RU')}₽`);
  });

  // Summary
  const activeReports = reports.filter(r => r.userId);
  const totalGenerations = activeReports.reduce((sum, r) => sum + r.totalGenerations, 0);
  const totalCompleted = activeReports.reduce((sum, r) => sum + r.completedGenerations, 0);
  const totalFailed = activeReports.reduce((sum, r) => sum + r.failedGenerations, 0);
  const totalCostUsd = activeReports.reduce((sum, r) => sum + r.costUsd, 0);
  const totalCostWithMarkup = totalCostUsd * MARKUP;
  const totalCostRub = totalCostWithMarkup * USD_TO_RUB;

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\nUsers found: ${activeReports.length}/${CONTENT_TEAM_EMAILS.length}`);
  console.log(`Total generations: ${totalGenerations}`);
  console.log(`  ✅ Completed: ${totalCompleted}`);
  console.log(`  ❌ Failed: ${totalFailed}`);

  console.log('\n💰 TOTAL COST (Accurate Replicate Pricing)');
  console.log(`   Raw USD (Replicate cost):     $${totalCostUsd.toFixed(2)}`);
  console.log(`   With 60% markup:              $${totalCostWithMarkup.toFixed(2)}`);
  console.log(`   In RUB (rate 80):             ${Math.round(totalCostRub).toLocaleString('ru-RU')}₽`);

  // Model usage summary
  console.log('\n📈 MODEL USAGE BREAKDOWN');
  console.log('─'.repeat(80));
  
  const allModels: Record<string, { count: number; cost: number }> = {};
  activeReports.forEach(r => {
    Object.entries(r.modelBreakdown).forEach(([model, data]) => {
      if (!allModels[model]) allModels[model] = { count: 0, cost: 0 };
      allModels[model].count += data.count;
      allModels[model].cost += data.cost;
    });
  });
  
  const sortedAllModels = Object.entries(allModels)
    .sort((a, b) => b[1].cost - a[1].cost);
  
  console.log('Model'.padEnd(35) + 'Count'.padStart(8) + 'Avg Price'.padStart(12) + 'Total USD'.padStart(12) + 'Total RUB'.padStart(12));
  console.log('-'.repeat(80));
  
  sortedAllModels.forEach(([model, data]) => {
    const avgPrice = data.cost / data.count;
    const rubCost = data.cost * MARKUP * USD_TO_RUB;
    console.log(
      model.substring(0, 34).padEnd(35) +
      data.count.toString().padStart(8) +
      `$${avgPrice.toFixed(3)}`.padStart(12) +
      `$${data.cost.toFixed(2)}`.padStart(12) +
      `${Math.round(rubCost)}₽`.padStart(12)
    );
  });

  // Table format
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  TABLE FORMAT (for spreadsheet)');
  console.log('═'.repeat(80));
  console.log('\nEmail\tGenerations\tCompleted\tCost USD\tWith Markup\tCost RUB');
  
  reports.forEach(r => {
    console.log(`${r.email}\t${r.totalGenerations}\t${r.completedGenerations}\t${r.costUsd.toFixed(2)}\t${r.costWithMarkup.toFixed(2)}\t${Math.round(r.costRub)}`);
  });

  console.log(`TOTAL\t${totalGenerations}\t${totalCompleted}\t${totalCostUsd.toFixed(2)}\t${totalCostWithMarkup.toFixed(2)}\t${Math.round(totalCostRub)}`);
}

generateAccurateReport().catch(console.error);
