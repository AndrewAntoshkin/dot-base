/**
 * Скрипт для тестирования всех моделей через API
 * Запуск: npx tsx scripts/test-all-models.ts
 */

import { 
  CREATE_MODELS, 
  UPSCALE_MODELS, 
  EDIT_MODELS, 
  REMOVE_BG_MODELS,
  VIDEO_CREATE_MODELS,
  VIDEO_I2V_MODELS,
  VIDEO_EDIT_MODELS,
  VIDEO_UPSCALE_MODELS,
  ANALYZE_DESCRIBE_MODELS,
  ActionType,
  ANALYZE_OCR_MODELS,
  ANALYZE_PROMPT_MODELS,
  Model
} from '../lib/models-config';

// Публичное тестовое изображение для всех тестов
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1024';
const TEST_VIDEO_URL = 'https://replicate.delivery/pbxt/demo.mp4'; // Placeholder

interface TestResult {
  modelId: string;
  modelName: string;
  action: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  duration?: number;
  predictionId?: string;
}

const results: TestResult[] = [];

// Helper to generate minimal test inputs for each model
function getTestInput(model: Model): Record<string, any> {
  const input: Record<string, any> = {};
  
  // Iterate through settings and set minimal required values
  for (const setting of model.settings) {
    if (setting.required) {
      if (setting.name === 'prompt') {
        input.prompt = 'A beautiful sunset over mountains, photorealistic, high quality';
      } else if (setting.type === 'file' || setting.type === 'file_array') {
        // Skip files for now, we'll add separately based on action
      } else if (setting.default !== undefined) {
        input[setting.name] = setting.default;
      }
    }
    
    // Always set prompt if exists
    if (setting.name === 'prompt' && !input.prompt) {
      input.prompt = setting.default || 'A beautiful sunset over mountains';
    }
    
    // Set image for models that need it
    if (setting.name === 'image' && model.action !== 'create' && model.action !== 'video_create') {
      input.image = TEST_IMAGE_URL;
    }
    if (setting.name === 'image_input') {
      input.image_input = [TEST_IMAGE_URL];
    }
    if (setting.name === 'input_image') {
      input.input_image = TEST_IMAGE_URL;
    }
    if (setting.name === 'start_image') {
      input.start_image = TEST_IMAGE_URL;
    }
    if (setting.name === 'first_frame_image') {
      input.first_frame_image = TEST_IMAGE_URL;
    }
    if (setting.name === 'img_cond_path') {
      input.img_cond_path = TEST_IMAGE_URL;
    }
  }
  
  return input;
}

async function testModel(model: Model, dryRun: boolean = false): Promise<TestResult> {
  const startTime = Date.now();
  
  console.log(`\n🔄 Тестирование: ${model.displayName} (${model.id})`);
  console.log(`   Action: ${model.action}`);
  console.log(`   Replicate: ${model.replicateModel}`);
  
  if (dryRun) {
    const input = getTestInput(model);
    console.log(`   Input params: ${JSON.stringify(Object.keys(input))}`);
    return {
      modelId: model.id,
      modelName: model.displayName,
      action: model.action,
      status: 'skipped',
      message: 'Dry run - не отправлено на Replicate'
    };
  }
  
  try {
    const input = getTestInput(model);
    
    // Construct the request body matching the API schema
    const body: {
      action: ActionType;
      model_id: string;
      prompt: any;
      settings: Record<string, any>;
      input_image_url?: string;
    } = {
      action: model.action,
      model_id: model.id,
      prompt: input.prompt,
      settings: input
    };
    
    // Add input_image_url if needed
    if (input.image || input.image_input || input.input_image || input.start_image || input.first_frame_image || input.img_cond_path) {
      body.input_image_url = TEST_IMAGE_URL;
    }
    
    console.log(`   Отправка запроса...`);
    
    const response = await fetch('http://localhost:3005/api/generations/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '' // Would need actual auth cookie
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      console.log(`   ✅ Генерация создана: ${result.id}`);
      console.log(`   Prediction ID: ${result.prediction_id}`);
      return {
        modelId: model.id,
        modelName: model.displayName,
        action: model.action,
        status: 'success',
        duration,
        predictionId: result.prediction_id
      };
    } else {
      console.log(`   ❌ Ошибка: ${result.error}`);
      return {
        modelId: model.id,
        modelName: model.displayName,
        action: model.action,
        status: 'error',
        message: result.error,
        duration
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Исключение: ${error.message}`);
    return {
      modelId: model.id,
      modelName: model.displayName,
      action: model.action,
      status: 'error',
      message: error.message,
      duration
    };
  }
}

async function testModelsGroup(models: Model[], groupName: string, dryRun: boolean) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${groupName} (${models.length} моделей)`);
  console.log('='.repeat(60));
  
  for (const model of models) {
    const result = await testModel(model, dryRun);
    results.push(result);
    
    // Small delay between tests
    if (!dryRun) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const groupArg = args.find(a => a.startsWith('--group='))?.split('=')[1];
  
  console.log('🚀 Тестирование всех моделей .base');
  console.log(`   Режим: ${dryRun ? 'Dry Run (без отправки на Replicate)' : 'Live (отправка на Replicate)'}`);
  console.log(`   Тестовое изображение: ${TEST_IMAGE_URL}`);
  
  if (!dryRun) {
    console.log('\n⚠️  ВНИМАНИЕ: Этот скрипт отправит запросы на Replicate API!');
    console.log('   Это может стоить денег. Используйте --dry-run для проверки без отправки.');
    console.log('   Продолжение через 3 секунды...');
    await new Promise(r => setTimeout(r, 3000));
  }
  
  const groups: Record<string, Model[]> = {
    'create': CREATE_MODELS,
    'upscale': UPSCALE_MODELS,
    'edit': EDIT_MODELS,
    'remove_bg': REMOVE_BG_MODELS,
    'video_create': VIDEO_CREATE_MODELS,
    'video_i2v': VIDEO_I2V_MODELS,
    'video_edit': VIDEO_EDIT_MODELS,
    'video_upscale': VIDEO_UPSCALE_MODELS,
    'analyze_describe': ANALYZE_DESCRIBE_MODELS,
    'analyze_ocr': ANALYZE_OCR_MODELS,
    'analyze_prompt': ANALYZE_PROMPT_MODELS
  };
  
  if (groupArg && groups[groupArg]) {
    await testModelsGroup(groups[groupArg], groupArg.toUpperCase(), dryRun);
  } else {
    // Test all groups
    await testModelsGroup(CREATE_MODELS, 'СОЗДАТЬ ИЗОБРАЖЕНИЕ', dryRun);
    await testModelsGroup(UPSCALE_MODELS, 'УЛУЧШИТЬ КАЧЕСТВО', dryRun);
    await testModelsGroup(EDIT_MODELS, 'РЕДАКТИРОВАТЬ', dryRun);
    await testModelsGroup(REMOVE_BG_MODELS, 'УДАЛИТЬ ФОН', dryRun);
    await testModelsGroup(VIDEO_CREATE_MODELS, 'СОЗДАТЬ ВИДЕО', dryRun);
    await testModelsGroup(VIDEO_I2V_MODELS, 'КАРТИНКА → ВИДЕО', dryRun);
    await testModelsGroup(VIDEO_EDIT_MODELS, 'РЕДАКТИРОВАТЬ ВИДЕО', dryRun);
    await testModelsGroup(VIDEO_UPSCALE_MODELS, 'УЛУЧШИТЬ ВИДЕО', dryRun);
    await testModelsGroup(ANALYZE_DESCRIBE_MODELS, 'АНАЛИЗ: ОПИСАНИЕ', dryRun);
    await testModelsGroup(ANALYZE_OCR_MODELS, 'АНАЛИЗ: OCR', dryRun);
    await testModelsGroup(ANALYZE_PROMPT_MODELS, 'АНАЛИЗ: ПРОМПТ', dryRun);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  
  const success = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Ошибки: ${errors}`);
  console.log(`⏭️  Пропущено: ${skipped}`);
  console.log(`📦 Всего: ${results.length}`);
  
  if (errors > 0) {
    console.log('\n❌ Модели с ошибками:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`   - ${r.modelName}: ${r.message}`));
  }
  
  if (success > 0 && !dryRun) {
    console.log('\n✅ Созданные генерации:');
    results
      .filter(r => r.status === 'success')
      .forEach(r => console.log(`   - ${r.modelName}: ${r.predictionId}`));
  }
}

main().catch(console.error);

