/**
 * Test endpoint for direct Google AI API call (Nano Banana Pro)
 * This runs on Vercel servers (US), bypassing geo-restrictions
 * 
 * GET /api/test/google-direct?prompt=your+prompt
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;

export async function GET(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get('prompt') || 'A beautiful sunset over mountains, cinematic lighting, 4k';
  
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY not set' }, { status: 500 });
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    prompt,
    apiKey: `${GOOGLE_API_KEY.substring(0, 15)}...`,
    tests: {},
  };

  // Test 1: List available models (to find image generation models)
  try {
    const listStart = Date.now();
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`
    );
    const listData = await listResponse.json();
    
    if (listData.models) {
      // Filter for image-related models
      const imageModels = listData.models.filter((m: any) => 
        m.name.includes('image') || 
        m.name.includes('imagen') ||
        m.description?.toLowerCase().includes('image generation')
      );
      
      results.tests.listModels = {
        success: true,
        time_ms: Date.now() - listStart,
        totalModels: listData.models.length,
        imageModels: imageModels.map((m: any) => ({
          name: m.name.replace('models/', ''),
          description: m.description?.substring(0, 100),
          methods: m.supportedGenerationMethods,
        })),
      };
    } else {
      results.tests.listModels = {
        success: false,
        time_ms: Date.now() - listStart,
        error: listData.error?.message,
      };
    }
  } catch (error: any) {
    results.tests.listModels = { success: false, error: error.message };
  }

  // Test 2: Try the OFFICIAL Nano Banana models (from Google docs)
  // https://ai.google.dev/gemini-api/docs/image-generation
  const modelsToTest = [
    'gemini-3-pro-image-preview',  // Nano Banana Pro - professional quality
    'gemini-2.5-flash-image',      // Nano Banana - fast generation
  ];

  for (const modelName of modelsToTest) {
    try {
      const start = Date.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        }
      );
      const data = await response.json();
      const elapsed = Date.now() - start;
      
      if (data.error) {
        results.tests[modelName] = {
          success: false,
          time_ms: elapsed,
          error: data.error.message,
          status: data.error.status,
        };
      } else {
        // Check for image in response
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);
        
        results.tests[modelName] = {
          success: true,
          time_ms: elapsed,
          hasImage: !!imagePart,
          imageMime: imagePart?.inlineData?.mimeType,
          imageSize: imagePart?.inlineData?.data?.length,
          textResponse: parts.find((p: any) => p.text)?.text?.substring(0, 200),
        };
        
        // If we got an image, this is THE working model!
        if (imagePart) {
          results.workingModel = modelName;
          results.imageData = imagePart.inlineData.data.substring(0, 100) + '...';
        }
      }
    } catch (error: any) {
      results.tests[modelName] = { 
        success: false, 
        error: error.message,
        isNetworkError: true,
      };
    }
  }

  // Test 3: Try using the SDK with experimental image generation
  try {
    const start = Date.now();
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    
    // Try the experimental image generation model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        // @ts-ignore
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });
    
    const result = await model.generateContent(`Generate an image: ${prompt}`);
    const response = await result.response;
    const elapsed = Date.now() - start;
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => 'inlineData' in p);
    
    results.tests['sdk-gemini-2.0-flash-exp'] = {
      success: true,
      time_ms: elapsed,
      hasImage: !!imagePart,
      partsCount: parts.length,
    };
    
    if (imagePart && 'inlineData' in imagePart) {
      results.workingModel = 'gemini-2.0-flash-exp (SDK)';
    }
  } catch (error: any) {
    results.tests['sdk-gemini-2.0-flash-exp'] = {
      success: false,
      error: error.message,
    };
  }

  // Summary
  results.summary = {
    workingModel: results.workingModel || 'None found',
    recommendation: results.workingModel 
      ? `Use ${results.workingModel} for Nano Banana Pro!`
      : 'Continue using Fal.ai - Google API does not provide direct Imagen access via AI Studio.',
  };

  return NextResponse.json(results, { status: 200 });
}
