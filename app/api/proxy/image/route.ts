import { NextRequest, NextResponse } from 'next/server';

/**
 * Прокси для изображений - обходит блокировку replicate.delivery и supabase storage
 * Использование: /api/proxy/image?url=https://replicate.delivery/...
 */

// Разрешённые домены для проксирования
const ALLOWED_DOMAINS = [
  'replicate.delivery',
  'pbxt.replicate.delivery',
  'supabase.co',
];

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Проверяем что URL разрешён
  if (!isAllowedDomain(url)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    // Загружаем изображение
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*,video/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    // Получаем тело и content-type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    // Возвращаем с правильными заголовками кэширования
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable', // 24 часа
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}

// Поддержка preflight для CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

