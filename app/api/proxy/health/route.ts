/**
 * Health check для Vercel Supabase прокси
 */

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function GET() {
  const results: Record<string, any> = {
    proxy: 'vercel',
    timestamp: new Date().toISOString(),
  };
  
  // Тест подключения к Supabase
  try {
    const start = Date.now();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });
    results.supabase = {
      ok: true,
      status: response.status,
      elapsed: `${Date.now() - start}ms`,
    };
  } catch (error: any) {
    results.supabase = {
      ok: false,
      error: error.message,
    };
  }
  
  return NextResponse.json(results);
}

