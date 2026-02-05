/**
 * Test script for Nano Banana Pro model (Replicate + Fal.ai fallback)
 * Run: npx tsx scripts/test-nano-banana-pro.ts [--fal]
 */

import Replicate from 'replicate';
import { fal } from '@fal-ai/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROMPT = `A matte glass skincare bottle with wooden cap placed on a bed of deep green moss. Shot top-down with soft natural light mimicking daylight from a window. The bottle is centered, shadows are diffused, subtle fog effect in the background. Focus on texture: porous moss, smooth frosted glass. Scandinavian eco-luxury product photography aesthetic`;

async function testReplicate() {
  console.log('🍌 Testing Nano Banana Pro on REPLICATE...\n');
  
  const tokens = process.env.REPLICATE_API_TOKENS?.split(',') || [];
  const token = tokens[0]?.trim();
  
  if (!token) {
    console.error('❌ No REPLICATE_API_TOKENS found in .env.local');
    return;
  }
  
  const replicate = new Replicate({ auth: token });
  
  const input = {
    prompt: PROMPT,
    resolution: '2K',
    aspect_ratio: '1:1',
    output_format: 'jpg',
    safety_filter_level: 'block_only_high',
  };
  
  console.log('📋 Input:', JSON.stringify(input, null, 2));
  console.log('\n🚀 Starting prediction...\n');
  const startTime = Date.now();
  
  try {
    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-pro',
      input,
    });
    
    console.log('✅ Prediction created! ID:', prediction.id);
    
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
      await new Promise(r => setTimeout(r, 2000));
      result = await replicate.predictions.get(prediction.id);
      console.log(`   Status: ${result.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);
    }
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (result.status === 'succeeded') {
      console.log('\n✅ REPLICATE SUCCESS!');
      console.log(`   Time: ${elapsed.toFixed(1)}s`);
      console.log('   Output:', result.output);
    } else {
      console.log('\n❌ REPLICATE FAILED:', result.error);
    }
  } catch (error: any) {
    console.error('\n❌ Replicate error:', error.message);
  }
}

async function testFal() {
  console.log('🍌 Testing Nano Banana Pro on FAL.AI...\n');
  
  const falKey = process.env.FAL_KEY;
  
  if (!falKey) {
    console.error('❌ No FAL_KEY found in .env.local');
    return;
  }
  
  fal.config({ credentials: falKey });
  
  const input = {
    prompt: PROMPT,
    resolution: '2K',
    aspect_ratio: '1:1',
  };
  
  console.log('📋 Input:', JSON.stringify(input, null, 2));
  console.log('\n🚀 Starting generation...\n');
  const startTime = Date.now();
  
  try {
    const result = await fal.subscribe('fal-ai/nano-banana-pro', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   Status: ${update.status} (${elapsed}s)`);
      },
    });
    
    const elapsed = (Date.now() - startTime) / 1000;
    
    console.log('\n✅ FAL.AI SUCCESS!');
    console.log(`   Time: ${elapsed.toFixed(1)}s`);
    console.log('   Request ID:', result.requestId);
    
    const data = result.data as any;
    if (data?.images?.[0]?.url) {
      console.log('   Output:', data.images[0].url);
    } else {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error('\n❌ Fal.ai error:', error.message);
  }
}

async function main() {
  const useFal = process.argv.includes('--fal');
  
  if (useFal) {
    await testFal();
  } else {
    await testReplicate();
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('💡 Run with --fal to test fal.ai fallback provider\n');
  }
}

main();
