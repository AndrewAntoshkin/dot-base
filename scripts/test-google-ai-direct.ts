/**
 * Test script for direct Google AI API call (Imagen 3)
 * Run: npx tsx scripts/test-google-ai-direct.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY || 'AIzaSyCYU8GQzGFtntDIslPNapQA188LksIgw_k';

async function listAvailableModels() {
  console.log('📋 Listing available models...\n');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`
  );
  const data = await response.json();
  
  if (data.models) {
    console.log('Available models:');
    for (const model of data.models) {
      const supportsImage = model.supportedGenerationMethods?.includes('generateContent');
      const name = model.name.replace('models/', '');
      console.log(`  - ${name}`);
      if (model.description?.toLowerCase().includes('image')) {
        console.log(`    ^ Might support images!`);
      }
    }
    console.log('\n');
    return data.models;
  } else {
    console.log('Error:', data);
    return [];
  }
}

async function testGoogleImageGeneration() {
  console.log('🍌 Testing Google AI Direct API for Image Generation\n');
  
  // First list models
  const models = await listAvailableModels();
  
  // Find imagen models
  const imagenModels = models.filter((m: any) => 
    m.name.includes('imagen') || m.description?.toLowerCase().includes('image generation')
  );
  
  if (imagenModels.length > 0) {
    console.log('🖼️  Found image models:', imagenModels.map((m: any) => m.name));
  }
  
  // Try gemini-2.0-flash-preview-image-generation if available
  const imageGenModel = models.find((m: any) => 
    m.name.includes('image-generation') || m.name.includes('imagen')
  );
  
  if (imageGenModel) {
    console.log('\n🎯 Trying model:', imageGenModel.name);
    await tryImageGeneration(imageGenModel.name.replace('models/', ''));
  } else {
    console.log('\n⚠️  No dedicated image generation model found via this API.');
    console.log('💡 Google Imagen requires Vertex AI, not AI Studio API.');
    console.log('\nTrying Gemini with image output capability...\n');
    await testGeminiImageGen();
  }
}

async function tryImageGeneration(modelName: string) {
  const startTime = Date.now();
  
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = 'Generate an image: Surreal minimalist portrait of a professional female cyclist';
    
    console.log('Generating with', modelName, '...\n');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const elapsed = Date.now() - startTime;
    console.log('✅ Response in', elapsed, 'ms');
    console.log('Response:', JSON.stringify(response, null, 2).substring(0, 500));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function testGeminiImageGen() {
  // Try multiple model names that might support image generation
  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];
  
  for (const modelName of modelsToTry) {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔄 Trying ${modelName}...`);
      
      const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
      });
      
      // Just test if model works with a simple prompt
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      const text = response.text();
      
      const elapsed = Date.now() - startTime;
      
      console.log(`✅ ${modelName} works! (${elapsed}ms)`);
      console.log('Response:', text.substring(0, 100));
      
      // This model works, now let's see if it can do image generation
      console.log('\n📊 Model capabilities for', modelName, ':');
      console.log('- Text generation: ✅');
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.log(`❌ ${modelName} failed (${elapsed}ms):`, error.message?.substring(0, 100));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ВЫВОД:');
  console.log('='.repeat(60));
  console.log(`
Google AI Studio API (generativelanguage.googleapis.com) НЕ поддерживает 
генерацию изображений напрямую.

Для Imagen нужен Vertex AI (cloud.google.com), а не AI Studio.

"Nano Banana" на Fal.ai - это обёртка над Google Imagen через Vertex AI.
Поэтому через Fal.ai быстрее/проще - они уже интегрированы с Vertex.

Альтернативы:
1. Продолжать использовать Fal.ai (текущий подход) ✅
2. Настроить Vertex AI напрямую (сложнее, нужен GCP проект с биллингом)
3. Использовать Replicate как fallback (уже настроено) ✅
`);
}

// Run test
testGoogleImageGeneration();
