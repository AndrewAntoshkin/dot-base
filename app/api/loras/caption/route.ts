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

    // Use BLIP for image captioning (reliable, works on Replicate)
    console.log('[Caption API] Generating caption for image:', image_url.substring(0, 100));
    console.log('[Caption API] Using model: salesforce/blip');

    // Use BLIP with version (ReplicateClient uses version instead of model when version is provided)
    const { prediction } = await replicateClient.run({
      model: 'salesforce/blip', // Required by interface, but version takes precedence
      version: '2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
      input: {
        image: image_url,
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

    // Clean up caption
    caption = caption.trim();

    // Ensure trigger word is at the start if provided and not already there
    if (trigger_word && caption && !caption.toLowerCase().startsWith(trigger_word.toLowerCase())) {
      caption = `${trigger_word}, ${caption}`;
    } else if (trigger_word && !caption) {
      // If no caption generated, use trigger word as fallback
      caption = trigger_word;
    }

    console.log('[Caption API] Generated caption:', caption.substring(0, 100));

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
            // Use BLIP with version (ReplicateClient uses version instead of model when version is provided)
            const { prediction } = await replicateClient.run({
              model: 'salesforce/blip', // Required by interface, but version takes precedence
              version: '2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
              input: {
                image: image_url,
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

            caption = caption.trim();

            if (trigger_word && !caption.toLowerCase().startsWith(trigger_word.toLowerCase())) {
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

