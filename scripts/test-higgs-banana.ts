/**
 * Test script for Higgs Banana (Nano Banana Pro via Higgsfield API)
 * Run: npx tsx scripts/test-higgs-banana.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const HIGGSFIELD_BASE_URL = 'https://platform.higgsfield.ai';

const PROMPT = `A matte glass skincare bottle with wooden cap placed on a bed of deep green moss. Shot top-down with soft natural light mimicking daylight from a window. The bottle is centered, shadows are diffused, subtle fog effect in the background. Focus on texture: porous moss, smooth frosted glass. Scandinavian eco-luxury product photography aesthetic`;

// Model ID for Nano Banana Pro
const MODEL_ID = 'nano-banana-pro';

interface HiggsfieldResponse {
  status: string;
  request_id: string;
  status_url: string;
  cancel_url: string;
  images?: Array<{ url: string }>;
  error?: string;
}

async function makeRequest(): Promise<HiggsfieldResponse | null> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ Missing HIGGSFIELD_API_KEY or HIGGSFIELD_API_SECRET in .env.local');
    process.exit(1);
  }

  const url = `${HIGGSFIELD_BASE_URL}/${MODEL_ID}`;
  const auth = `Key ${apiKey}:${apiSecret}`;

  const body = {
    prompt: PROMPT,
    aspect_ratio: '1:1',
    resolution: '2k',  // Options: 1k, 2k, 4k
  };

  console.log(`\n🔗 Model: ${MODEL_ID}`);
  console.log(`   URL: ${url}`);
  console.log(`   Resolution: ${body.resolution}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}: ${JSON.stringify(data)}`);
      return null;
    }

    return data as HiggsfieldResponse;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function pollStatus(statusUrl: string, auth: string): Promise<HiggsfieldResponse> {
  let result: HiggsfieldResponse;
  const startTime = Date.now();

  while (true) {
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
    });

    result = await response.json();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log(`   Status: ${result.status} (${elapsed}s)`);

    if (result.status === 'completed' || result.status === 'failed' || result.status === 'nsfw') {
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  return result;
}

async function main() {
  console.log('🍌 Testing HIGGS BANANA (Nano Banana Pro via Higgsfield API)\n');
  console.log('📋 Prompt:', PROMPT.substring(0, 80) + '...');

  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  const auth = `Key ${apiKey}:${apiSecret}`;

  const response = await makeRequest();

  if (!response || !response.request_id) {
    console.log('\n❌ Request failed.');
    return;
  }

  console.log(`\n✅ Request queued!`);
  console.log(`   Request ID: ${response.request_id}`);
  console.log(`   Status URL: ${response.status_url}`);

  console.log('\n⏳ Polling for result...\n');
  const startTime = Date.now();

  const result = await pollStatus(response.status_url, auth);
  const elapsed = (Date.now() - startTime) / 1000;

  if (result.status === 'completed' && result.images?.[0]?.url) {
    console.log('\n✅ HIGGS BANANA SUCCESS!');
    console.log(`   Time: ${elapsed.toFixed(1)}s`);
    console.log(`   Model: ${MODEL_ID}`);
    console.log(`   Output: ${result.images[0].url}`);
  } else if (result.status === 'nsfw') {
    console.log('\n⚠️ Content flagged as NSFW');
  } else {
    console.log('\n❌ Generation failed');
    console.log('   Result:', JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
