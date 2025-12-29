/**
 * Cloudflare Worker - Supabase Proxy
 * Проксирует запросы к Supabase, обходя гео-блокировки.
 */

const SUPABASE_URL = 'https://apuhcgdpgolrmdlnerxh.supabase.co';
const SUPABASE_HOST = 'apuhcgdpgolrmdlnerxh.supabase.co';
const PROXY_VERSION = '2025-12-29-5';
const FETCH_TIMEOUT_MS = 25000; // 25 секунд timeout для fetch к Supabase

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin');
    const allowOrigin = origin || '*';
    const url = new URL(request.url);

    // Быстрый health-check, чтобы видеть что задеплоен нужный код
    if (url.pathname === '/__health') {
      return new Response(
        JSON.stringify({
          ok: true,
          proxyVersion: PROXY_VERSION,
          supabaseHost: SUPABASE_HOST,
          origin: origin || null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
            'X-Proxy-Version': PROXY_VERSION,
          },
        }
      );
    }

    // CORS preflight (важно: '*' для Allow-Headers/Allow-Methods не всегда принимается браузером)
    if (request.method === 'OPTIONS') {
      const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '';
      const reqMethod = request.headers.get('Access-Control-Request-Method') || '';

      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': reqHeaders,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method',
          'X-Proxy-Version': PROXY_VERSION,
          'X-Proxy-Preflight-Method': reqMethod,
        },
      });
    }

    // Test endpoint - проверяем что Worker может делать внешние запросы
    if (url.pathname === '/__test') {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Тест 1: httpbin (должен работать)
        const testResponse = await fetch('https://httpbin.org/get', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        const data = await testResponse.json();
        
        return new Response(
          JSON.stringify({
            ok: true,
            httpbinStatus: testResponse.status,
            httpbinOrigin: data.origin,
            elapsed: elapsed + 'ms',
            proxyVersion: PROXY_VERSION,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowOrigin,
              'X-Proxy-Version': PROXY_VERSION,
            },
          }
        );
      } catch (error) {
        const elapsed = Date.now() - startTime;
        return new Response(
          JSON.stringify({
            ok: false,
            error: error.message,
            errorName: error.name,
            elapsed: elapsed + 'ms',
            proxyVersion: PROXY_VERSION,
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowOrigin,
              'X-Proxy-Version': PROXY_VERSION,
            },
          }
        );
      }
    }

    // Debug endpoint для проверки связи с Supabase
    if (url.pathname === '/__debug') {
      const results = {};
      
      // Тест 1: supabase.com (публичный сайт)
      try {
        const controller1 = new AbortController();
        const timeout1 = setTimeout(() => controller1.abort(), 5000);
        const start1 = Date.now();
        const res1 = await fetch('https://supabase.com/', { 
          method: 'HEAD',
          signal: controller1.signal 
        });
        clearTimeout(timeout1);
        results.supabaseCom = { ok: true, status: res1.status, elapsed: (Date.now() - start1) + 'ms' };
      } catch (e) {
        results.supabaseCom = { ok: false, error: e.message };
      }
      
      // Тест 2: конкретный проект Supabase
      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 10000);
        const start2 = Date.now();
        const res2 = await fetch(SUPABASE_URL + '/rest/v1/', {
          method: 'GET',
          headers: {
            'apikey': request.headers.get('apikey') || '',
          },
          signal: controller2.signal,
        });
        clearTimeout(timeout2);
        results.supabaseProject = { ok: true, status: res2.status, elapsed: (Date.now() - start2) + 'ms' };
      } catch (e) {
        results.supabaseProject = { ok: false, error: e.message, elapsed: '10000ms' };
      }
      
      // Тест 3: Google (для сравнения)
      try {
        const controller3 = new AbortController();
        const timeout3 = setTimeout(() => controller3.abort(), 5000);
        const start3 = Date.now();
        const res3 = await fetch('https://www.google.com/', { 
          method: 'HEAD',
          signal: controller3.signal 
        });
        clearTimeout(timeout3);
        results.google = { ok: true, status: res3.status, elapsed: (Date.now() - start3) + 'ms' };
      } catch (e) {
        results.google = { ok: false, error: e.message };
      }

      return new Response(
        JSON.stringify({
          proxyVersion: PROXY_VERSION,
          results,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowOrigin,
            'X-Proxy-Version': PROXY_VERSION,
          },
        }
      );
    }

    try {
      const targetUrl = SUPABASE_URL + url.pathname + url.search;
      
      // Собираем заголовки вручную (без CF-специфичных)
      // НЕ устанавливаем Host header явно - пусть fetch сам разберётся
      const headers = new Headers();
      for (const [key, value] of request.headers) {
        const lowerKey = key.toLowerCase();
        // Убираем заголовки, которые часто ломают прокси или выставляются автоматически
        if (
          lowerKey.startsWith('cf-') ||
          lowerKey === 'host' ||
          lowerKey === 'content-length' ||
          lowerKey === 'connection' ||
          lowerKey === 'accept-encoding'
        ) {
          continue;
        }
        headers.set(key, value);
      }
      // Host будет установлен автоматически на основе URL

      let body = undefined;
      if (!['GET', 'HEAD'].includes(request.method)) {
        // Стабильнее, чем прокидывать request.body стримом
        body = await request.arrayBuffer();
      }

      // Проксируем с timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Ответ с CORS
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', allowOrigin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.set('Access-Control-Expose-Headers', '*');
      responseHeaders.set('Vary', 'Origin');
      responseHeaders.set('X-Proxy-Version', PROXY_VERSION);
      responseHeaders.set('Cache-Control', 'no-store');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
      
    } catch (error) {
      const isTimeout = error.name === 'AbortError';
      return new Response(
        JSON.stringify({ 
          error: isTimeout ? 'Supabase request timeout' : error.message,
          errorType: error.name,
        }), 
        {
          status: isTimeout ? 504 : 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
            'X-Proxy-Version': PROXY_VERSION,
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  },
};

