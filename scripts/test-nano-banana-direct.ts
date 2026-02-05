/**
 * Test Nano Banana Pro directly via Google Gemini API
 * Based on: https://ai.google.dev/gemini-api/docs/nanobanana
 * 
 * Run: npx tsx scripts/test-nano-banana-direct.ts
 */

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY || 'AIzaSyCYU8GQzGFtntDIslPNapQA188LksIgw_k';

const PROMPT = 'A futuristic city at night, hyper-detailed, cinematic lighting';

async function testNanoBananaDirect() {
  console.log('🍌 Testing Nano Banana Pro Direct API\n');
  console.log('API Key:', GOOGLE_API_KEY.substring(0, 15) + '...');
  console.log('Prompt:', PROMPT);
  console.log('\n' + '='.repeat(60) + '\n');

  // Test different endpoints and model names from GPT's response
  const tests = [
    {
      name: 'gemini-3-pro-image-preview (generativemodels)',
      url: `https://generativemodels.googleapis.com/v1alpha/models/gemini-3-pro-image-preview:generateContent?key=${GOOGLE_API_KEY}`,
      body: {
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      },
    },
    {
      name: 'gemini-2.0-flash-exp-image-generation',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_API_KEY}`,
      body: {
        contents: [{ parts: [{ text: PROMPT }] }],
      },
    },
    {
      name: 'gemini-2.0-flash with IMAGE modality',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      body: {
        contents: [{ parts: [{ text: `Generate an image: ${PROMPT}` }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      },
    },
    {
      name: 'imagen-3.0-generate-001 (generativelanguage)',
      url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${GOOGLE_API_KEY}`,
      body: {
        contents: [{ parts: [{ text: PROMPT }] }],
      },
    },
    {
      name: 'gemini-2.0-flash-preview-image-generation',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GOOGLE_API_KEY}`,
      body: {
        contents: [{ parts: [{ text: PROMPT }] }],
      },
    },
  ];

  for (const test of tests) {
    console.log(`\n🔄 Testing: ${test.name}`);
    console.log(`   URL: ${test.url.substring(0, 80)}...`);
    
    const start = Date.now();
    
    try {
      const response = await fetch(test.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body),
      });
      
      const elapsed = Date.now() - start;
      const data = await response.json();
      
      if (data.error) {
        console.log(`   ❌ Error (${elapsed}ms): ${data.error.message}`);
        console.log(`   Status: ${data.error.status || response.status}`);
      } else {
        console.log(`   ✅ Success! (${elapsed}ms)`);
        
        // Check for image in response
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            console.log(`   🖼️  IMAGE FOUND!`);
            console.log(`   MIME: ${part.inlineData.mimeType}`);
            console.log(`   Size: ${part.inlineData.data?.length} chars (base64)`);
            
            // Save the image
            const fs = await import('fs');
            const imageData = Buffer.from(part.inlineData.data, 'base64');
            const filename = `nano-banana-direct-${Date.now()}.png`;
            fs.writeFileSync(filename, imageData);
            console.log(`   💾 Saved to: ${filename}`);
          } else if (part.text) {
            console.log(`   📝 Text: ${part.text.substring(0, 100)}...`);
          }
        }
        
        if (parts.length === 0) {
          console.log(`   Response:`, JSON.stringify(data).substring(0, 300));
        }
      }
    } catch (error: any) {
      const elapsed = Date.now() - start;
      console.log(`   ❌ Network error (${elapsed}ms): ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Also trying to list available models...\n');
  
  // List models to see what's available
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`
    );
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models with "image" or "imagen" in name/description:\n');
      for (const model of data.models) {
        const name = model.name.replace('models/', '');
        const desc = model.description || '';
        if (name.includes('image') || name.includes('imagen') || 
            desc.toLowerCase().includes('image')) {
          console.log(`  • ${name}`);
          console.log(`    ${desc.substring(0, 80)}`);
          console.log(`    Methods: ${model.supportedGenerationMethods?.join(', ')}`);
          console.log('');
        }
      }
    } else {
      console.log('Error listing models:', data.error?.message);
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
}

testNanoBananaDirect();
