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

    // Use LLaVa-13b for detailed image description
    // Prompt specifically designed for LoRA training captions
    const captionPrompt = trigger_word 
      ? `Describe this image in detail for AI training. Start with "${trigger_word}". Include: subject details, colors, textures, lighting, background, camera angle, style. Be specific and concise. Output only the caption, nothing else.`
      : `Describe this image in detail for AI training. Include: subject details, colors, textures, lighting, background, camera angle, style. Be specific and concise. Output only the caption, nothing else.`;

    console.log('[Caption API] Generating caption for image:', image_url.substring(0, 100));

    const output = await replicateClient.run(
      'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb',
      {
        input: {
          image: image_url,
          prompt: captionPrompt,
          max_tokens: 256,
          temperature: 0.2,
        },
      }
    );

    // LLaVa returns array of strings, join them
    let caption = '';
    if (Array.isArray(output)) {
      caption = output.join('');
    } else if (typeof output === 'string') {
      caption = output;
    }

    // Clean up caption
    caption = caption.trim();

    // Ensure trigger word is at the start if provided
    if (trigger_word && !caption.toLowerCase().startsWith(trigger_word.toLowerCase())) {
      caption = `${trigger_word}, ${caption}`;
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
            const captionPrompt = trigger_word 
              ? `Describe this image in detail for AI training. Start with "${trigger_word}". Include: subject details, colors, textures, lighting, background, camera angle, style. Be specific and concise. Output only the caption, nothing else.`
              : `Describe this image in detail for AI training. Include: subject details, colors, textures, lighting, background, camera angle, style. Be specific and concise. Output only the caption, nothing else.`;

            const output = await replicateClient.run(
              'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb',
              {
                input: {
                  image: image_url,
                  prompt: captionPrompt,
                  max_tokens: 256,
                  temperature: 0.2,
                },
              }
            );

            let caption = '';
            if (Array.isArray(output)) {
              caption = output.join('');
            } else if (typeof output === 'string') {
              caption = output;
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

