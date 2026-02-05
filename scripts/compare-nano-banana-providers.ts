/**
 * Compare Nano Banana Pro across all providers: Replicate, Fal.ai, Higgsfield
 * Run: npx tsx scripts/compare-nano-banana-providers.ts
 */

import Replicate from 'replicate';
import { fal } from '@fal-ai/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROMPT = `A professional product photo of a luxury perfume bottle on a marble surface, soft studio lighting, bokeh background, 8k quality`;

interface TestResult {
  provider: string;
  success: boolean;
  timeSeconds: number;
  error?: string;
  outputUrl?: string;
}

// ============ REPLICATE ============
async function testReplicate(): Promise<TestResult> {
  console.log('\n🔵 REPLICATE: Starting...');
  const startTime = Date.now();
  
  const tokens = process.env.REPLICATE_API_TOKENS?.split(',') || [];
  const token = tokens[0]?.trim();
  
  if (!token) {
    return { provider: 'Replicate', success: false, timeSeconds: 0, error: 'No REPLICATE_API_TOKENS' };
  }
  
  const replicate = new Replicate({ auth: token });
  
  try {
    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-pro',
      input: {
        prompt: PROMPT,
        aspect_ratio: '1:1',
        output_format: 'jpg',
      },
    });
    
    console.log('   Replicate: Prediction created, polling...');
    
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
      await new Promise(r => setTimeout(r, 2000));
      result = await replicate.predictions.get(prediction.id);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   Replicate: ${result.status} (${elapsed}s)`);
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (result.status === 'succeeded') {
      const output = Array.isArray(result.output) ? result.output[0] : result.output;
      return { provider: 'Replicate', success: true, timeSeconds: elapsed, outputUrl: output };
    } else {
      return { provider: 'Replicate', success: false, timeSeconds: elapsed, error: result.error || result.status };
    }
  } catch (error: any) {
    const elapsed = (Date.now() - startTime) / 1000;
    return { provider: 'Replicate', success: false, timeSeconds: elapsed, error: error.message };
  }
}

// ============ FAL.AI ============
async function testFal(): Promise<TestResult> {
  console.log('\n🟢 FAL.AI: Starting...');
  const startTime = Date.now();
  
  const falKey = process.env.FAL_KEY;
  
  if (!falKey) {
    return { provider: 'Fal.ai', success: false, timeSeconds: 0, error: 'No FAL_KEY' };
  }
  
  fal.config({ credentials: falKey });
  
  try {
    const result = await fal.subscribe('fal-ai/nano-banana-pro', {
      input: {
        prompt: PROMPT,
        aspect_ratio: '1:1',
      },
      logs: false,
      onQueueUpdate: (update) => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   Fal.ai: ${update.status} (${elapsed}s)`);
      },
    });
    
    const elapsed = (Date.now() - startTime) / 1000;
    const data = result.data as any;
    
    if (data?.images?.[0]?.url) {
      return { provider: 'Fal.ai', success: true, timeSeconds: elapsed, outputUrl: data.images[0].url };
    } else {
      return { provider: 'Fal.ai', success: false, timeSeconds: elapsed, error: 'No image in response' };
    }
  } catch (error: any) {
    const elapsed = (Date.now() - startTime) / 1000;
    return { provider: 'Fal.ai', success: false, timeSeconds: elapsed, error: error.message };
  }
}

// ============ HIGGSFIELD ============
async function testHiggsfield(): Promise<TestResult> {
  console.log('\n🟡 HIGGSFIELD: Starting...');
  const startTime = Date.now();
  
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    return { provider: 'Higgsfield', success: false, timeSeconds: 0, error: 'No HIGGSFIELD credentials' };
  }
  
  const auth = `Key ${apiKey}:${apiSecret}`;
  const url = 'https://platform.higgsfield.ai/nano-banana-pro';
  
  try {
    // Submit request
    const submitResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: PROMPT,
        aspect_ratio: '1:1',
        resolution: '2k',
      }),
    });
    
    if (!submitResponse.ok) {
      const err = await submitResponse.json();
      return { provider: 'Higgsfield', success: false, timeSeconds: 0, error: JSON.stringify(err) };
    }
    
    const submitData = await submitResponse.json();
    console.log('   Higgsfield: Request queued, polling...');
    
    // Poll for result
    let status = 'queued';
    let result: any = null;
    
    while (status !== 'completed' && status !== 'failed' && status !== 'nsfw') {
      await new Promise(r => setTimeout(r, 2000));
      
      const statusResponse = await fetch(submitData.status_url, {
        headers: { 'Authorization': auth },
      });
      result = await statusResponse.json();
      status = result.status;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`   Higgsfield: ${status} (${elapsed}s)`);
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (status === 'completed' && result?.images?.[0]?.url) {
      return { provider: 'Higgsfield', success: true, timeSeconds: elapsed, outputUrl: result.images[0].url };
    } else {
      return { provider: 'Higgsfield', success: false, timeSeconds: elapsed, error: status };
    }
  } catch (error: any) {
    const elapsed = (Date.now() - startTime) / 1000;
    return { provider: 'Higgsfield', success: false, timeSeconds: elapsed, error: error.message };
  }
}

// ============ MAIN ============
async function main() {
  console.log('🍌 NANO BANANA PRO - PROVIDER COMPARISON TEST');
  console.log('='.repeat(50));
  console.log(`📋 Prompt: "${PROMPT.substring(0, 60)}..."`);
  console.log('='.repeat(50));
  
  // Run all tests in parallel
  const results = await Promise.all([
    testReplicate(),
    testFal(),
    testHiggsfield(),
  ]);
  
  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const successResults = results.filter(r => r.success).sort((a, b) => a.timeSeconds - b.timeSeconds);
  const failedResults = results.filter(r => !r.success);
  
  console.log('\n✅ SUCCESSFUL:');
  if (successResults.length === 0) {
    console.log('   None');
  } else {
    successResults.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      console.log(`   ${medal} ${r.provider}: ${r.timeSeconds.toFixed(1)}s`);
      console.log(`      ${r.outputUrl}`);
    });
  }
  
  if (failedResults.length > 0) {
    console.log('\n❌ FAILED:');
    failedResults.forEach(r => {
      console.log(`   ${r.provider}: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (successResults.length > 0) {
    const fastest = successResults[0];
    console.log(`🏆 WINNER: ${fastest.provider} (${fastest.timeSeconds.toFixed(1)}s)`);
  }
  
  // Calculate average for successful providers
  if (successResults.length > 1) {
    const avgTime = successResults.reduce((sum, r) => sum + r.timeSeconds, 0) / successResults.length;
    console.log(`📈 Average time: ${avgTime.toFixed(1)}s`);
  }
}

main().catch(console.error);
