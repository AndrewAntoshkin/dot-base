import { NextRequest, NextResponse } from 'next/server';
import { getModelsByAction, ActionType, ALL_MODELS } from '@/lib/models-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') as ActionType | null;

    if (action) {
      const models = getModelsByAction(action);
      return NextResponse.json({ models });
    }

    return NextResponse.json({ models: ALL_MODELS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


