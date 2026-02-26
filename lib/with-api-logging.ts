import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { writeApiLog, classifyError, type ApiLogEntry } from '@/lib/api-log';

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse | Response>;

interface ApiLoggingOptions {
  /** Провайдер внешнего API (replicate/fal/google/higgsfield/telegram/resend) */
  provider?: string;
}

/**
 * Извлекает информацию из запроса.
 */
function extractRequestInfo(request: NextRequest): {
  method: string;
  path: string;
  queryParams: Record<string, string> | null;
  ip: string | null;
} {
  const url = request.nextUrl;
  const method = request.method;
  const path = url.pathname;

  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // Next.js headers for IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;

  return {
    method,
    path,
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : null,
    ip,
  };
}

/**
 * Пытается извлечь user ID из cookies (не бросает ошибки).
 */
async function extractUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.signal) return fetch(input, init);
            return fetch(input, { ...init, signal: AbortSignal.timeout(5_000) });
          },
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Безопасно читает JSON из клонированного response.
 */
async function safeReadResponseJson(response: Response): Promise<any | null> {
  try {
    const cloned = response.clone();
    return await cloned.json();
  } catch {
    return null;
  }
}

/**
 * HOF обёртка для route handler'ов — логирует вызовы в api_logs.
 *
 * Использование:
 * ```ts
 * async function postHandler(request: NextRequest) { ... }
 * export const POST = withApiLogging(postHandler, { provider: 'replicate' });
 * ```
 */
export function withApiLogging(
  handler: RouteHandler,
  options: ApiLoggingOptions = {}
): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    const start = Date.now();
    const { method, path, queryParams, ip } = extractRequestInfo(request);

    // Извлекаем userId только для не-вебхуков (вебхуки не имеют auth cookies)
    const isWebhook = path.includes('/webhook/');
    const userId = isWebhook ? null : await extractUserId();

    try {
      const response = await handler(request, context);
      const statusCode = response.status;
      const durationMs = Date.now() - start;

      // Читаем тело ответа для извлечения полезных данных
      const body = await safeReadResponseJson(response);

      const entry: ApiLogEntry = {
        method,
        path,
        status_code: statusCode,
        duration_ms: durationMs,
        user_id: userId,
        provider: options.provider || body?.provider || null,
        model_name: body?.model_name || body?.model || null,
        generation_id: body?.id || body?.generation_id || null,
        query_params: queryParams,
        error_message: statusCode >= 400 ? (body?.error || null) : null,
        error_category: statusCode >= 400 ? classifyError(body?.error) : null,
        is_fallback: body?.fallback === true,
        ip_address: ip,
        response_summary:
          statusCode >= 400 && body
            ? { error: body.error, code: body.code }
            : null,
      };

      writeApiLog(entry);
      return response;
    } catch (error: any) {
      const durationMs = Date.now() - start;

      writeApiLog({
        method,
        path,
        status_code: 500,
        duration_ms: durationMs,
        user_id: userId,
        provider: options.provider || null,
        query_params: queryParams,
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack || null,
        error_category: classifyError(error?.message),
        ip_address: ip,
      });

      throw error;
    }
  };
}
