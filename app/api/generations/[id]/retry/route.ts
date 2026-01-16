import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getReplicateClient } from '@/lib/replicate/client';
import { getModelById } from '@/lib/models-config';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Type for generation from DB
interface GenerationRecord {
  id: string;
  user_id: string;
  status: string;
  model_id: string;
  action: string;
  prompt: string | null;
  settings: Record<string, any>;
  replicate_input: Record<string, any> | null;
  input_image_url: string | null;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get the failed generation
    const { data } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const generation = data as GenerationRecord | null;

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Only allow retry for failed generations
    if (generation.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed generations can be retried' },
        { status: 400 }
      );
    }

    // Get model config
    const model = getModelById(generation.model_id);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get Replicate client
    const replicateClient = getReplicateClient();

    // Webhook URL
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/api/webhook/replicate`
      : undefined;

    // Restore input for Replicate
    const replicateInput = generation.replicate_input || {
      prompt: generation.prompt,
      ...generation.settings,
    };

    // Remove internal fields
    delete replicateInput.auto_retry_count;

    // Start new prediction
    const { prediction, tokenId } = await replicateClient.run({
      model: model.replicateModel,
      version: model.version,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: webhookUrl ? ['completed'] : undefined,
    });

    // Update generation with new prediction ID
    await (supabase
      .from('generations') as any)
      .update({
        replicate_prediction_id: prediction.id,
        replicate_token_index: tokenId,
        status: 'processing',
        error_message: null,
        started_at: new Date().toISOString(),
      })
      .eq('id', id);

    console.log('Retry started:', {
      generationId: id,
      newPredictionId: prediction.id,
    });

    return NextResponse.json({ 
      success: true,
      prediction_id: prediction.id,
    });
  } catch (error: any) {
    console.error('Retry generation error:', error);
    return NextResponse.json(
      { error: 'Не удалось повторить генерацию' },
      { status: 500 }
    );
  }
}



















