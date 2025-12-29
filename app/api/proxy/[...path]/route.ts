/**
 * Supabase Proxy через Vercel Serverless Functions
 * Проксирует запросы к Supabase, обходя гео-блокировки.
 * 
 * Используется когда Cloudflare Workers не работает.
 */

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Заголовки которые не нужно проксировать
const SKIP_HEADERS = [
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'x-vercel-id',
  'x-vercel-deployment-url',
  'x-vercel-forwarded-for',
];

async function handleRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const targetUrl = `${SUPABASE_URL}/${path}${request.nextUrl.search}`;
  
  // Копируем заголовки
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  
  try {
    // Получаем тело запроса для POST/PUT/PATCH
    let body: ArrayBuffer | undefined;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      body = await request.arrayBuffer();
    }
    
    // Проксируем запрос к Supabase
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });
    
    // Копируем ответ
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    responseHeaders.set('X-Proxy-Version', 'vercel-1.0');
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    
  } catch (error: any) {
    console.error('[Vercel Proxy] Error:', error.message);
    return NextResponse.json(
      { error: error.message, proxy: 'vercel' },
      { status: 502 }
    );
  }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return handleRequest(request, params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return handleRequest(request, params);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return handleRequest(request, params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return handleRequest(request, params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return handleRequest(request, params);
}

