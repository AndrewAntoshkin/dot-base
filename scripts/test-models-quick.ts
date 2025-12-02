/**
 * Быстрый тест всех категорий моделей
 * Тестирует по 1 модели из каждой категории
 * Запуск: npx tsx scripts/test-models-quick.ts
 */

import Replicate from 'replicate';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1024';

interface TestConfig {
  name: string;
  model: string;
  version?: string;
  input: Record<string, any>;
  expectedOutputType: 'image' | 'video' | 'text' | 'audio';
}

// Тестовые конфиги - по одной модели из каждой категории
const testConfigs: TestConfig[] = [
  // ===== ИЗОБРАЖЕНИЯ =====
  {
    name: 'Image Create: MiniMax Image-01',
    model: 'minimax/image-01',
    input: {
      prompt: 'A beautiful sunset over mountains, photorealistic',
      aspect_ratio: '1:1'
    },
    expectedOutputType: 'image'
  },
  {
    name: 'Image Upscale: Real-ESRGAN',
    model: 'nightmareai/real-esrgan',
    input: {
      image: TEST_IMAGE_URL,
      scale: 2
    },
    expectedOutputType: 'image'
  },
  {
    name: 'Image Edit: FLUX Kontext Fast',
    model: 'prunaai/flux-kontext-fast',
    input: {
      prompt: 'add sunglasses to the cat',
      img_cond_path: TEST_IMAGE_URL
    },
    expectedOutputType: 'image'
  },
  {
    name: 'Remove BG: Lucataco',
    model: 'lucataco/remove-bg',
    input: {
      image: TEST_IMAGE_URL
    },
    expectedOutputType: 'image'
  },

  // ===== ВИДЕО =====
  {
    name: 'Video Create: Wan 2.5 T2V',
    model: 'wan-video/wan-2.5-t2v',
    input: {
      prompt: 'A cat walking in a garden, natural lighting',
      size: '1280x720',
      duration: '5'
    },
    expectedOutputType: 'video'
  },
  {
    name: 'Video I2V: Seedance 1 Pro Fast',
    model: 'bytedance/seedance-1-pro-fast',
    input: {
      image: TEST_IMAGE_URL,
      prompt: 'The cat slowly blinks and looks around',
      resolution: '720p',
      duration: 5
    },
    expectedOutputType: 'video'
  },

  // ===== АНАЛИЗ =====
  {
    name: 'Analyze Describe: Moondream 2',
    model: 'lucataco/moondream2',
    version: '72ccb656353c348c1385df54b237eeb7bfa874bf11486cf0b9473e691b662d31',
    input: {
      image: TEST_IMAGE_URL,
      prompt: 'Describe this image in detail'
    },
    expectedOutputType: 'text'
  },
  {
    name: 'Analyze OCR: DeepSeek OCR',
    model: 'lucataco/deepseek-ocr',
    version: 'cb3b474fbfc56b1664c8c7841550bccecbe7b74c30e45ce938ffca1180b4dff5',
    input: {
      image: TEST_IMAGE_URL
    },
    expectedOutputType: 'text'
  },
  {
    name: 'Analyze Prompt: SDXL CLIP Interrogator',
    model: 'lucataco/sdxl-clip-interrogator',
    version: 'b8dd624ad312d215250b362af0ecff05d7ad4f8270f9beb034c483d70682e7b3',
    input: {
      image: TEST_IMAGE_URL,
      mode: 'fast'
    },
    expectedOutputType: 'text'
  }
];

interface TestResult {
  name: string;
  status: 'success' | 'failed' | 'pending';
  predictionId?: string;
  output?: any;
  error?: string;
  duration?: number;
}

async function testModel(replicate: Replicate, config: TestConfig): Promise<TestResult> {
  console.log(`\n🔄 ${config.name}`);
  console.log(`   Model: ${config.model}`);
  
  const startTime = Date.now();
  
  try {
    // Create prediction
    const createOptions: any = {
      input: config.input,
    };
    
    if (config.version) {
      createOptions.version = config.version;
    } else {
      createOptions.model = config.model;
    }
    
    console.log(`   Создание prediction...`);
    const prediction = await replicate.predictions.create(createOptions);
    console.log(`   Prediction ID: ${prediction.id}`);
    
    // Wait for completion (max 2 minutes for quick test)
    console.log(`   Ожидание результата...`);
    let result = prediction;
    const maxWaitTime = 120000; // 2 minutes
    const pollInterval = 3000; // 3 seconds
    const waitStart = Date.now();
    
    while (Date.now() - waitStart < maxWaitTime) {
      if (result.status === 'succeeded' || result.status === 'failed' || result.status === 'canceled') {
        break;
      }
      
      await new Promise(r => setTimeout(r, pollInterval));
      result = await replicate.predictions.get(prediction.id);
      
      // Log progress
      const elapsed = Math.round((Date.now() - waitStart) / 1000);
      process.stdout.write(`\r   Статус: ${result.status} (${elapsed}s)`);
    }
    console.log('');
    
    const duration = Date.now() - startTime;
    
    if (result.status === 'succeeded') {
      console.log(`   ✅ Успешно! (${Math.round(duration / 1000)}s)`);
      
      // Log output type
      if (result.output) {
        if (typeof result.output === 'string') {
          if (result.output.startsWith('http')) {
            console.log(`   Output: ${result.output.substring(0, 80)}...`);
          } else {
            console.log(`   Output: "${result.output.substring(0, 100)}..."`);
          }
        } else if (Array.isArray(result.output)) {
          console.log(`   Output: Array with ${result.output.length} items`);
        } else {
          console.log(`   Output type: ${typeof result.output}`);
        }
      }
      
      return {
        name: config.name,
        status: 'success',
        predictionId: prediction.id,
        output: result.output,
        duration
      };
    } else if (result.status === 'failed') {
      console.log(`   ❌ Ошибка: ${result.error}`);
      return {
        name: config.name,
        status: 'failed',
        predictionId: prediction.id,
        error: result.error,
        duration
      };
    } else {
      console.log(`   ⏳ Timeout (status: ${result.status})`);
      return {
        name: config.name,
        status: 'pending',
        predictionId: prediction.id,
        duration
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Exception: ${error.message}`);
    return {
      name: config.name,
      status: 'failed',
      error: error.message,
      duration
    };
  }
}

async function main() {
  console.log('🚀 Быстрый тест моделей .base\n');
  
  // Get API token from environment
  const tokens = process.env.REPLICATE_API_TOKENS?.split(',').map(t => t.trim()).filter(Boolean);
  
  if (!tokens || tokens.length === 0) {
    console.error('❌ REPLICATE_API_TOKENS не найден в .env.local');
    console.log('   Добавьте токен в файл .env.local:');
    console.log('   REPLICATE_API_TOKENS=r8_xxx,r8_yyy');
    process.exit(1);
  }
  
  console.log(`📦 Найдено ${tokens.length} токен(ов) Replicate`);
  console.log(`🖼️  Тестовое изображение: ${TEST_IMAGE_URL}\n`);
  
  const replicate = new Replicate({ auth: tokens[0] });
  
  const args = process.argv.slice(2);
  const selectedTests = args.length > 0 
    ? testConfigs.filter(c => args.some(a => c.name.toLowerCase().includes(a.toLowerCase())))
    : testConfigs;
  
  console.log(`📋 Запланировано тестов: ${selectedTests.length}`);
  console.log('='.repeat(60));
  
  const results: TestResult[] = [];
  
  for (const config of selectedTests) {
    const result = await testModel(replicate, config);
    results.push(result);
    
    // Small delay between tests
    if (selectedTests.indexOf(config) < selectedTests.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ');
  console.log('='.repeat(60));
  
  const success = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const pending = results.filter(r => r.status === 'pending');
  
  console.log(`\n✅ Успешно: ${success.length}`);
  success.forEach(r => console.log(`   - ${r.name}`));
  
  if (failed.length > 0) {
    console.log(`\n❌ Ошибки: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }
  
  if (pending.length > 0) {
    console.log(`\n⏳ В процессе: ${pending.length}`);
    pending.forEach(r => console.log(`   - ${r.name} (ID: ${r.predictionId})`));
  }
  
  console.log(`\n📦 Всего: ${results.length}`);
  
  // Exit with error if any test failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

