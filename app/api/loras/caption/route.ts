import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getReplicateClient } from '@/lib/replicate/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Generate caption for a single image using AI (LLaVa-13b)
export async function POST(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_url, trigger_word } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    // Get Replicate client
    const replicateClient = getReplicateClient();
    if (!replicateClient) {
      return NextResponse.json({ error: 'AI service not available' }, { status: 503 });
    }

    // Use Moondream2 for detailed image captioning (recommended by Replicate)
    console.log('[Caption API] Generating detailed caption for image:', image_url.substring(0, 100));
    console.log('[Caption API] Using model: lucataco/moondream2');

    // Moondream2 with detailed prompt for LoRA training captions
    const detailedPrompt = "Describe this image in detail for AI training. Include: the main subject and its appearance, colors, textures, materials, lighting conditions, background elements, composition, camera angle, and artistic style. Be specific and comprehensive in one paragraph.";
    
    const { prediction } = await replicateClient.run({
      model: 'lucataco/moondream2',
      version: 'd00c238928a560d2bd30b4e8a64d125fb42f9d23a0e143aeb5137404b6d5dc1b',
      input: {
        image: image_url,
        prompt: detailedPrompt,
      },
    });

    console.log('[Caption API] Prediction created:', prediction.id, 'status:', prediction.status);

    // Wait for prediction to complete
    let output = null;
    if (prediction.status === 'succeeded') {
      output = prediction.output;
      console.log('[Caption API] Prediction succeeded, output type:', typeof output);
    } else if (prediction.status === 'processing' || prediction.status === 'starting') {
      // Poll for completion (wait up to 60 seconds)
      console.log('[Caption API] Polling for completion...');
      const replicateClient2 = getReplicateClient();
      if (replicateClient2) {
        let attempts = 0;
        let currentPrediction = prediction;
        while (attempts < 30 && (currentPrediction.status === 'processing' || currentPrediction.status === 'starting')) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          currentPrediction = await replicateClient2.getPrediction(prediction.id);
          console.log('[Caption API] Poll attempt', attempts + 1, 'status:', currentPrediction.status);
          attempts++;
        }
        if (currentPrediction.status === 'succeeded') {
          output = currentPrediction.output;
        } else if (currentPrediction.status === 'failed') {
          throw new Error(currentPrediction.error || 'Prediction failed');
        }
      }
    } else if (prediction.status === 'failed') {
      console.error('[Caption API] Prediction failed:', prediction.error);
      throw new Error(prediction.error || 'Prediction failed');
    }

    if (!output) {
      throw new Error('No output from prediction');
    }

    // Extract caption from output
    let caption = '';
    if (Array.isArray(output)) {
      caption = output.join('');
    } else if (typeof output === 'string') {
      caption = output;
    } else if (output && typeof output === 'object') {
      // Some models return object with text field
      caption = output.text || output.caption || JSON.stringify(output);
    }

    // Clean up caption - remove BLIP prefixes like "Caption: " or "Answer: "
    caption = caption.trim();
    if (caption.toLowerCase().startsWith('caption:')) {
      caption = caption.substring(8).trim();
    } else if (caption.toLowerCase().startsWith('answer:')) {
      caption = caption.substring(7).trim();
    }
    
    console.log('[Caption API] Raw output:', output);
    console.log('[Caption API] Cleaned caption:', caption);

    // If caption is too short or useless (like "no", "none", "yes", "blurry"), ignore it
    const uselessResponses = ['no', 'none', 'yes', 'blurry', 'unclear', 'unknown'];
    if (uselessResponses.includes(caption.toLowerCase())) {
      caption = ''; // Will use trigger_word as fallback
      console.log('[Caption API] Caption was useless, using trigger_word fallback');
    }

    // Ensure trigger word is at the start if provided and not already there
    if (trigger_word && caption && !caption.toLowerCase().startsWith(trigger_word.toLowerCase())) {
      caption = `${trigger_word}, ${caption}`;
    } else if (trigger_word && !caption) {
      // If no caption generated, use trigger word as fallback
      caption = trigger_word;
    }

    console.log('[Caption API] Final caption:', caption.substring(0, 100));

    return NextResponse.json({ 
      caption,
      image_url,
    });

  } catch (error) {
    console.error('[Caption API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate caption' },
      { status: 500 }
    );
  }
}

// Batch caption generation for multiple images
export async function PUT(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image_urls, trigger_word } = body;

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length === 0) {
      return NextResponse.json({ error: 'image_urls array is required' }, { status: 400 });
    }

    // Get Replicate client
    const replicateClient = getReplicateClient();
    if (!replicateClient) {
      return NextResponse.json({ error: 'AI service not available' }, { status: 503 });
    }

    console.log('[Caption API] Batch generating captions for', image_urls.length, 'images');

    // Process images in parallel (max 5 at a time to avoid rate limits)
    const BATCH_SIZE = 5;
    const results: { image_url: string; caption: string; error?: string }[] = [];

    for (let i = 0; i < image_urls.length; i += BATCH_SIZE) {
      const batch = image_urls.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(async (image_url: string) => {
          try {
            // Use Moondream2 for detailed captions (recommended by Replicate)
            const detailedPrompt = "Describe this image in detail for AI training. Include: the main subject and its appearance, colors, textures, materials, lighting conditions, background elements, composition, camera angle, and artistic style. Be specific and comprehensive in one paragraph.";
            
            const { prediction } = await replicateClient.run({
              model: 'lucataco/moondream2',
              version: 'd00c238928a560d2bd30b4e8a64d125fb42f9d23a0e143aeb5137404b6d5dc1b',
              input: {
                image: image_url,
                prompt: detailedPrompt,
              },
            });

            // Wait for prediction to complete
            let output = null;
            if (prediction.status === 'succeeded') {
              output = prediction.output;
            } else if (prediction.status === 'processing' || prediction.status === 'starting') {
              // Poll for completion (wait up to 60 seconds)
              let attempts = 0;
              let currentPrediction = prediction;
              while (attempts < 30 && (currentPrediction.status === 'processing' || currentPrediction.status === 'starting')) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                currentPrediction = await replicateClient.getPrediction(prediction.id);
                attempts++;
              }
              if (currentPrediction.status === 'succeeded') {
                output = currentPrediction.output;
              } else if (currentPrediction.status === 'failed') {
                throw new Error(currentPrediction.error || 'Prediction failed');
              }
            } else if (prediction.status === 'failed') {
              throw new Error(prediction.error || 'Prediction failed');
            }

            if (!output) {
              throw new Error('No output from prediction');
            }

            // Extract caption from output
            let caption = '';
            if (Array.isArray(output)) {
              caption = output.join('');
            } else if (typeof output === 'string') {
              caption = output;
            } else if (output && typeof output === 'object') {
              // Some models return object with text field
              caption = output.text || output.caption || JSON.stringify(output);
            }

            // Clean up caption - remove BLIP prefixes like "Caption: " or "Answer: "
            caption = caption.trim();
            if (caption.toLowerCase().startsWith('caption:')) {
              caption = caption.substring(8).trim();
            } else if (caption.toLowerCase().startsWith('answer:')) {
              caption = caption.substring(7).trim();
            }
            
            // If caption is too short or useless, ignore it
            const uselessResponses = ['no', 'none', 'yes', 'blurry', 'unclear', 'unknown'];
            if (uselessResponses.includes(caption.toLowerCase())) {
              caption = trigger_word || ''; // Use trigger_word as fallback
            } else if (trigger_word && !caption.toLowerCase().startsWith(trigger_word.toLowerCase())) {
              caption = `${trigger_word}, ${caption}`;
            }

            return { image_url, caption };
          } catch (error) {
            console.error('[Caption API] Error for image:', image_url, error);
            return { image_url, caption: '', error: 'Failed to generate caption' };
          }
        })
      );

      results.push(...batchResults);
    }

    console.log('[Caption API] Batch complete, generated', results.filter(r => r.caption).length, 'captions');

    return NextResponse.json({ 
      captions: results,
      total: results.length,
      success: results.filter(r => !r.error).length,
    });

  } catch (error) {
    console.error('[Caption API] Batch error:', error);
    return NextResponse.json(
      { error: 'Failed to generate captions' },
      { status: 500 }
    );
  }
}

