/**
 * Model Testing Script
 * Тестирует реальную генерацию с каждой категорией моделей
 * 
 * ⚠️ ВНИМАНИЕ: Этот скрипт создаёт реальные генерации и тратит деньги!
 * 
 * Запуск: npx ts-node scripts/test-models.ts
 * 
 * Требуется:
 *   - Запущенный dev сервер
 *   - Авторизация (cookie сессии)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Тестовые конфигурации для каждого типа модели
const TEST_CONFIGS = {
  // Быстрые и дешевые модели для тестирования
  create: {
    model_id: 'z-image-turbo', // Самая дешевая: $0.009
    prompt: 'A simple red apple on white background',
    settings: {
      width: 512,
      height: 512,
      num_inference_steps: 4,
    },
  },
  
  upscale: {
    model_id: 'real-esrgan', // Дешевая: $0.002
    // Нужно изображение для апскейла
  },
  
  remove_bg: {
    model_id: 'lucataco-remove-bg', // Простая модель
    // Нужно изображение
  },
  
  video_create: {
    model_id: 'kling-v2.0-t2v', // Базовая версия
    prompt: 'A simple animation of a ball bouncing',
    settings: {
      duration: '5',
      aspect_ratio: '16:9',
    },
  },
  
  analyze_describe: {
    model_id: 'moondream2', // Быстрая
    // Нужно изображение
  },
};

interface TestResult {
  category: string;
  model: string;
  status: 'pass' | 'fail' | 'skip';
  generationId?: string;
  duration?: number;
  error?: string;
}

async function testGeneration(
  category: string,
  config: any
): Promise<TestResult> {
  console.log(`\n🔄 Testing ${category}: ${config.model_id}...`);
  
  const start = Date.now();
  
  try {
    // Пропускаем тесты, требующие изображения (нужна отдельная настройка)
    if (['upscale', 'remove_bg', 'analyze_describe', 'inpaint', 'edit'].includes(category)) {
      console.log(`⏭️  Skipped (requires image input)`);
      return {
        category,
        model: config.model_id,
        status: 'skip',
        error: 'Requires image input - test manually',
      };
    }
    
    const response = await fetch(`${BASE_URL}/api/generations/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Нужен cookie для авторизации в реальном тесте
      },
      body: JSON.stringify({
        action: category,
        model_id: config.model_id,
        prompt: config.prompt,
        settings: config.settings || {},
      }),
    });
    
    const duration = Date.now() - start;
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status}`);
      return {
        category,
        model: config.model_id,
        status: 'fail',
        duration,
        error: `HTTP ${response.status}: ${error.substring(0, 100)}`,
      };
    }
    
    const data = await response.json();
    console.log(`✅ Created generation: ${data.id}`);
    
    return {
      category,
      model: config.model_id,
      status: 'pass',
      generationId: data.id,
      duration,
    };
    
  } catch (err: any) {
    const duration = Date.now() - start;
    console.log(`❌ Error: ${err.message}`);
    return {
      category,
      model: config.model_id,
      status: 'fail',
      duration,
      error: err.message,
    };
  }
}

async function runModelTests() {
  console.log('\n🧪 Model Testing Suite');
  console.log('─'.repeat(50));
  console.log('\n⚠️  NOTE: This creates real generations (costs money)!');
  console.log('For a real test, you need to be authenticated.\n');
  
  const results: TestResult[] = [];
  
  // Test each category
  for (const [category, config] of Object.entries(TEST_CONFIGS)) {
    const result = await testGeneration(category, config);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 Summary:\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  - ${r.category} (${r.model}): ${r.error}`));
  }
  
  console.log('\n');
}

// Manual test checklist
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   MANUAL TESTING CHECKLIST                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📸 IMAGE GENERATION:                                        ║
║  □ Create image with prompt only                             ║
║  □ Create image with reference                               ║
║  □ Test different aspect ratios                              ║
║  □ Test seed reproducibility                                 ║
║                                                              ║
║  ✏️ IMAGE EDITING:                                           ║
║  □ Edit with prompt                                          ║
║  □ Inpaint with mask                                         ║
║  □ Expand/Outpaint                                           ║
║  □ Remove background                                         ║
║                                                              ║
║  🎬 VIDEO GENERATION:                                        ║
║  □ Text-to-video                                             ║
║  □ Image-to-video                                            ║
║  □ Video editing (style transfer)                            ║
║  □ Add audio to video                                        ║
║  □ Add captions                                              ║
║                                                              ║
║  🔍 ANALYSIS:                                                ║
║  □ Describe image                                            ║
║  □ OCR (extract text)                                        ║
║  □ Generate prompt from image                                ║
║                                                              ║
║  🔄 SYSTEM:                                                  ║
║  □ Auto-retry on failure                                     ║
║  □ Error messages are user-friendly                          ║
║  □ Progress indication works                                 ║
║  □ Download works                                            ║
║  □ History shows all generations                             ║
║  □ Workspace filtering works                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Uncomment to run actual tests (requires auth)
// runModelTests().catch(console.error);





