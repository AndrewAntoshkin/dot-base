import { createServiceRoleClient } from '@/lib/supabase/server';

export interface ApiLogEntry {
  method: string;
  path: string;
  status_code: number;
  duration_ms?: number;
  user_id?: string | null;
  provider?: string | null;
  external_status?: string | null;
  model_name?: string | null;
  generation_id?: string | null;
  query_params?: Record<string, unknown> | null;
  request_body?: Record<string, unknown> | null;
  error_message?: string | null;
  error_stack?: string | null;
  error_category?: string | null;
  response_summary?: Record<string, unknown> | null;
  is_fallback?: boolean;
  retry_count?: number;
  ip_address?: string | null;
}

const SENSITIVE_KEYS = [
  'apiKey', 'api_key', 'token', 'secret', 'password', 'authorization',
  'cookie', 'session', 'credentials', 'private_key', 'access_token',
  'refresh_token', 'REPLICATE_API_TOKEN', 'RESEND_API_KEY',
];

function sanitizeBody(body: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeBody(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function truncateString(str: string | null | undefined, maxLen: number): string | null {
  if (!str) return null;
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

/**
 * Классифицирует ошибку по известным паттернам.
 * Переиспользует паттерны из webhook/replicate error handling.
 */
export function classifyError(message: string | null | undefined): string | null {
  if (!message) return null;

  const msg = message.toLowerCase();

  const patterns: [string, string[]][] = [
    ['nsfw', ['nsfw', 'safety', 'content policy', 'harmful']],
    ['timeout', ['timeout', 'timed out', 'deadline exceeded']],
    ['rate_limit', ['rate limit', 'too many requests', 'overloaded', 'overload', '429']],
    ['auth', ['unauthorized', 'forbidden', 'invalid api key', 'billing', 'credits', '401', '403']],
    ['invalid_input', ['invalid input', 'invalid parameter', 'validation']],
    ['storage', ['storage', 'upload failed', 'download failed', 'bucket']],
    ['model_unavailable', ['model not found', 'not available', '404', 'model is warming']],
    ['memory', ['out of memory', 'oom', 'resource exhausted']],
    ['network', ['connection', 'network', 'socket', 'econnrefused', 'fetch failed']],
  ];

  for (const [category, keywords] of patterns) {
    if (keywords.some(kw => msg.includes(kw))) {
      return category;
    }
  }

  return 'unknown';
}

/**
 * Writes a log entry to api_logs table (fire-and-forget).
 * Does not block the main response or throw errors.
 */
export function writeApiLog(entry: ApiLogEntry): void {
  _writeApiLogAsync(entry).catch(() => {});
}

/**
 * Writes a warning-level entry to api_logs.
 * Used for events like fallback switches that aren't errors
 * but should be visible in the admin panel.
 */
export function writeWarningLog(opts: {
  path: string;
  provider?: string;
  model_name?: string;
  generation_id?: string;
  user_id?: string;
  message: string;
  details?: Record<string, unknown>;
}): void {
  writeApiLog({
    method: 'WARN',
    path: opts.path,
    status_code: 299,
    provider: opts.provider,
    model_name: opts.model_name,
    generation_id: opts.generation_id,
    user_id: opts.user_id,
    error_message: opts.message,
    error_category: 'warning',
    response_summary: opts.details ?? null,
    is_fallback: true,
  });
}

async function _writeApiLogAsync(entry: ApiLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const record = {
      method: entry.method,
      path: entry.path,
      status_code: entry.status_code,
      duration_ms: entry.duration_ms ?? null,
      user_id: entry.user_id ?? null,
      provider: entry.provider ?? null,
      external_status: entry.external_status ?? null,
      model_name: entry.model_name ?? null,
      generation_id: entry.generation_id ?? null,
      query_params: sanitizeBody(entry.query_params) ?? null,
      request_body: sanitizeBody(entry.request_body) ?? null,
      error_message: truncateString(entry.error_message, 2000),
      error_stack: truncateString(entry.error_stack, 4000),
      error_category: entry.error_category ?? null,
      response_summary: entry.response_summary ?? null,
      is_fallback: entry.is_fallback ?? false,
      retry_count: entry.retry_count ?? 0,
      ip_address: entry.ip_address ?? null,
    };

    await (supabase.from('api_logs') as any).insert(record);
  } catch {
    // Молча игнорируем — логирование не должно ломать бизнес-логику
  }
}
