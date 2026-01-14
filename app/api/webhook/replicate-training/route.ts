import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Webhook from Replicate for training status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('Replicate training webhook received:', {
      id: body.id,
      status: body.status,
      model: body.model,
    });

    const { id, status, output, error: replicateError } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing training id' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Find LoRA by replicate_training_id
    const { data: lora, error: findError } = await serviceClient
      .from('user_loras')
      .select('id, status')
      .eq('replicate_training_id', id)
      .single();

    if (findError || !lora) {
      logger.warn('LoRA not found for training id:', id);
      return NextResponse.json({ error: 'LoRA not found' }, { status: 404 });
    }

    // Map Replicate status to our status
    let newStatus: string;
    let updateData: Record<string, any> = {};

    switch (status) {
      case 'starting':
      case 'processing':
        newStatus = 'training';
        break;
      case 'succeeded':
        newStatus = 'completed';
        updateData.training_completed_at = new Date().toISOString();
        // Extract LoRA URL from output
        if (output?.weights) {
          updateData.lora_url = output.weights;
        } else if (output?.version) {
          // If we got a model version, construct the URL
          updateData.replicate_model_url = output.version;
          updateData.lora_url = output.version;
        }
        break;
      case 'failed':
      case 'canceled':
        newStatus = 'failed';
        updateData.error_message = replicateError || 'Обучение не удалось';
        break;
      default:
        newStatus = 'training';
    }

    // Update LoRA status
    const { error: updateError } = await serviceClient
      .from('user_loras')
      .update({
        status: newStatus,
        ...updateData,
      })
      .eq('id', lora.id);

    if (updateError) {
      logger.error('Error updating LoRA status:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    logger.info(`LoRA ${lora.id} status updated to ${newStatus}`);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    logger.error('Replicate training webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'replicate-training-webhook' });
}

