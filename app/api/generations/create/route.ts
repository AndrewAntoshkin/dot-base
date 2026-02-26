import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient, supabaseTimeoutFetch } from '@/lib/supabase/server';
import { getModelById } from '@/lib/models-config';
import { cookies } from 'next/headers';
import { z } from 'zod';
import logger from '@/lib/logger';
import { withApiLogging } from '@/lib/with-api-logging';
import { enqueueJob } from '@/lib/providers/worker';

export const dynamic = 'force-dynamic';

const createGenerationSchema = z.object({
  action: z.enum([
    'create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale',
    'analyze_describe', 'analyze_ocr', 'analyze_prompt'
  ]),
  model_id: z.string(),
  prompt: z.string().nullish(),
  input_image_url: z.string().nullish(),
  input_video_url: z.string().nullish(),
  settings: z.record(z.any()).optional(),
  workspace_id: z.string().nullish(),
});

const MAX_CONCURRENT_GENERATIONS = 5;

async function postHandler(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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
        global: { fetch: supabaseTimeoutFetch },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const validatedData = createGenerationSchema.parse(body);

    // Get user workspace
    let workspaceId: string | null = null;
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const userWorkspaceIds = (memberships as { workspace_id: string }[] | null)?.map(m => m.workspace_id) || [];

    if (validatedData.workspace_id && userWorkspaceIds.includes(validatedData.workspace_id)) {
      workspaceId = validatedData.workspace_id;
    } else if (userWorkspaceIds.length > 0) {
      workspaceId = userWorkspaceIds[0];
    }

    // Auto-cleanup stale image generations (>5 min in pending/processing)
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const imageActions = ['create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand'];
    await (supabase.from('generations') as any)
      .update({ status: 'failed', error_message: 'Generation timed out', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['pending', 'queued', 'processing'])
      .in('action', imageActions)
      .lt('created_at', staleThreshold);

    // Check concurrent limit
    const { count: activeCount } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'queued', 'processing']);

    if (activeCount !== null && activeCount >= MAX_CONCURRENT_GENERATIONS) {
      return NextResponse.json(
        {
          error: `Достигнут лимит одновременных генераций (${MAX_CONCURRENT_GENERATIONS}). Дождитесь завершения текущих генераций.`,
          code: 'CONCURRENT_LIMIT_EXCEEDED',
          activeCount,
          limit: MAX_CONCURRENT_GENERATIONS,
        },
        { status: 429 }
      );
    }

    // Get model config
    const model = getModelById(validatedData.model_id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.action !== validatedData.action) {
      return NextResponse.json({ error: 'Model does not support this action' }, { status: 400 });
    }

    // Prepare generic input
    const replicateInput: Record<string, any> = { ...validatedData.settings };

    if (validatedData.prompt) {
      replicateInput.prompt = validatedData.prompt;
    }

    if (validatedData.input_image_url) {
      replicateInput.image = validatedData.input_image_url;
    }

    if (validatedData.input_video_url) {
      replicateInput.video = validatedData.input_video_url;
    }

    // Handle remove_bg
    if (validatedData.action === 'remove_bg') {
      if (!replicateInput.image && validatedData.settings?.image) {
        replicateInput.image = validatedData.settings.image;
      }
      if (!replicateInput.image) {
        return NextResponse.json({ error: 'An image is required' }, { status: 400 });
      }
    }

    // Handle inpaint
    if (validatedData.action === 'inpaint') {
      if (!replicateInput.image) {
        return NextResponse.json({ error: 'An image is required' }, { status: 400 });
      }
      if (!replicateInput.mask) {
        return NextResponse.json({ error: 'A mask is required' }, { status: 400 });
      }

      // FLUX Fill Pro defaults
      if (model.replicateModel === 'black-forest-labs/flux-fill-pro') {
        replicateInput.steps = replicateInput.steps || 50;
        replicateInput.guidance = replicateInput.guidance || 60;
        if (!replicateInput.output_format || !['jpg', 'png'].includes(replicateInput.output_format)) {
          replicateInput.output_format = 'jpg';
        }
      }
    }

    // Create DB record with retry logic for connection issues
    let generation: any = null;
    let insertError: any = null;
    const MAX_INSERT_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_INSERT_RETRIES; attempt++) {
      const result = await (supabase
        .from('generations') as any)
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          action: validatedData.action,
          model_id: validatedData.model_id,
          model_name: model.name,
          replicate_model: model.replicateModel,
          prompt: validatedData.prompt,
          input_image_url: validatedData.input_image_url,
          input_video_url: validatedData.input_video_url,
          settings: validatedData.settings || {},
          status: 'pending',
          replicate_input: replicateInput,
        })
        .select()
        .single();

      generation = result.data;
      insertError = result.error;

      if (!insertError && generation) {
        break; // Success
      }

      // Check if error is retryable (connection/socket issues)
      const errorMsg = insertError?.message?.toLowerCase() || '';
      const isRetryable = errorMsg.includes('socket') ||
                          errorMsg.includes('fetch failed') ||
                          errorMsg.includes('timeout') ||
                          errorMsg.includes('connection');

      if (!isRetryable || attempt === MAX_INSERT_RETRIES) {
        break; // Non-retryable or max attempts reached
      }

      logger.warn(`DB insert attempt ${attempt} failed, retrying...`, insertError?.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    if (insertError || !generation) {
      logger.error('Failed to create generation:', insertError);
      return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
    }

    // --- Enqueue for worker processing ---
    // Worker picks up the job, iterates provider chain, handles fallback and DB updates.
    try {
      await enqueueJob({
        generationId: generation.id,
        modelId: validatedData.model_id,
        input: replicateInput,
        userId,
      });

      // Update status to queued
      await (supabase.from('generations') as any)
        .update({ status: 'queued' })
        .eq('id', generation.id);

      return NextResponse.json({
        id: generation.id,
        status: 'queued',
      });
    } catch (enqueueError: any) {
      logger.error('Failed to enqueue job:', enqueueError.message);

      await (supabase.from('generations') as any)
        .update({ status: 'failed', error_message: 'Failed to enqueue generation' })
        .eq('id', generation.id);

      return NextResponse.json({ error: 'Failed to enqueue generation' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withApiLogging(postHandler, { provider: 'replicate' });
