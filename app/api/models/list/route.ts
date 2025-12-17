import { NextRequest, NextResponse } from 'next/server';
import { getModelsByAction, ActionType, ALL_MODELS } from '@/lib/models-config';

// Кэширование на 1 час - модели меняются редко
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') as ActionType | null;

    const models = action ? getModelsByAction(action) : ALL_MODELS;

    return NextResponse.json(
      { models },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


