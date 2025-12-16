# Архитектурный анализ и рекомендации по масштабированию

**Дата:** 3 декабря 2025  
**Версия:** 0.1.0

## 📊 Результаты нагрузочного тестирования

### Базовые метрики

| Endpoint | RPS | Avg Response | P95 | P99 | Success Rate |
|----------|-----|--------------|-----|-----|--------------|
| Health Check | 600-773 | 15-58ms | 19-82ms | 21-85ms | 100% |
| List Generations | 360-602 | 27-79ms | 114-84ms | 114-85ms | 0%* |
| Models List | 366 | 24ms | 101ms | 103ms | 100% |

*401 ошибки из-за отсутствия авторизации в тестах

### Тест масштабируемости (Health endpoint)

| Concurrency | RPS | Avg Response | P95 | P99 |
|-------------|-----|--------------|-----|-----|
| 1 | 274 | 4ms | 4ms | 4ms |
| 5 | 401 | 12ms | 32ms | 33ms |
| 10 | 369 | 25ms | 41ms | 42ms |
| 20 | 448 | 35ms | 54ms | 57ms |
| 50 | 443 | 84ms | 103ms | 103ms |
| 100 | 446 | 101ms | 103ms | 104ms |

**Вывод:** RPS достигает плато ~450 req/s при concurrency > 20. Линейное масштабирование отсутствует.

---

## 🔴 Критические узкие места

### 1. Создание Supabase клиента на каждый запрос

**Проблема:**
```typescript
// lib/supabase/server.ts - вызывается на КАЖДЫЙ запрос
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { ... }
  );
}
```

Каждый API-вызов создаёт новый Supabase клиент. При 100 одновременных пользователях с polling каждые 10 секунд = ~10 новых подключений/сек × overhead инициализации.

**Решение:**
```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Singleton для service role клиента
let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceRoleClient() {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        // Connection pooling
        db: {
          schema: 'public',
        },
      }
    );
  }
  return serviceRoleClient;
}
```

**Оценка улучшения:** Снижение latency на 20-50ms для каждого запроса, уменьшение нагрузки на Supabase.

---

### 2. Token Pool делает DB-запрос на каждую генерацию

**Проблема:**
```typescript
// lib/replicate/token-pool.ts
async getNextToken(): Promise<{ id: number; token: string } | null> {
  const supabase = createServiceRoleClient(); // Новый клиент!
  const { data, error } = await supabase.rpc('get_next_replicate_token');
  // ...
}
```

**Решение - In-memory Token Pool:**
```typescript
// lib/replicate/token-pool.ts
export class ReplicateTokenPool {
  private static instance: ReplicateTokenPool;
  private tokens: Array<{ id: number; token: string; lastUsed: number }> = [];
  private currentIndex = 0;
  private lastFetch = 0;
  private CACHE_TTL = 60000; // 1 минута

  async getNextToken(): Promise<{ id: number; token: string } | null> {
    // Обновляем кэш если устарел
    if (Date.now() - this.lastFetch > this.CACHE_TTL || this.tokens.length === 0) {
      await this.refreshTokens();
    }

    if (this.tokens.length === 0) return null;

    // Round-robin с локальным состоянием
    const token = this.tokens[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    token.lastUsed = Date.now();

    return token;
  }

  private async refreshTokens() {
    const supabase = getServiceRoleClient();
    const { data } = await supabase
      .from('replicate_tokens')
      .select('id, token')
      .eq('is_active', true);
    
    if (data) {
      this.tokens = data.map(t => ({ ...t, lastUsed: 0 }));
      this.lastFetch = Date.now();
    }
  }
}
```

**Оценка улучшения:** Снижение DB-запросов при генерациях на 95%+.

---

### 3. Polling создаёт постоянную нагрузку

**Проблема:**
```typescript
// contexts/generations-context.tsx
const POLLING_INTERVAL = 10000; // 10 секунд

// При 100 пользователей = 10 запросов/сек постоянно
```

**Решения (по приоритету):**

#### A. Server-Sent Events (SSE) — рекомендуется
```typescript
// app/api/generations/stream/route.ts
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Подписка на изменения через Supabase Realtime
      const supabase = getServiceRoleClient();
      const channel = supabase
        .channel('generations')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'generations', filter: `user_id=eq.${userId}` },
          (payload) => sendUpdate(payload.new)
        )
        .subscribe();

      // Cleanup при отключении
      request.signal.addEventListener('abort', () => {
        supabase.removeChannel(channel);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### B. WebSocket через Supabase Realtime (альтернатива)
```typescript
// На клиенте
const supabase = createClient();
supabase
  .channel('user-generations')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'generations' },
    (payload) => updateGenerations(payload)
  )
  .subscribe();
```

#### C. Адаптивный polling (минимальное изменение)
```typescript
// contexts/generations-context.tsx
const POLLING_ACTIVE = 3000;   // Есть активные генерации
const POLLING_IDLE = 30000;    // Нет активных
const POLLING_BACKGROUND = 60000; // Вкладка в фоне

const interval = hasActiveGenerations 
  ? POLLING_ACTIVE 
  : isWindowVisible 
    ? POLLING_IDLE 
    : POLLING_BACKGROUND;
```

---

### 4. Нет кэширования статических данных

**Проблема:** `/api/models/list` возвращает конфигурацию моделей, которая меняется редко, но запрашивается часто.

**Решение:**
```typescript
// app/api/models/list/route.ts
import { NextResponse } from 'next/server';
import { getModelsList } from '@/lib/models-config';

export const dynamic = 'force-static';
export const revalidate = 3600; // 1 час

export async function GET() {
  const models = getModelsList();
  
  return NextResponse.json(models, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
```

---

### 5. Webhook обрабатывает всё в одном потоке

**Проблема:** При наплыве webhook-ов от Replicate, обработка блокирует и может потерять данные.

**Решение — Background Jobs через BullMQ (уже есть в зависимостях):**

```typescript
// lib/queue/index.ts
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const webhookQueue = new Queue('webhooks', { connection });

// Worker в отдельном процессе
new Worker('webhooks', async (job) => {
  const { predictionId, status, output } = job.data;
  // Обработка webhook
}, { connection, concurrency: 10 });
```

```typescript
// app/api/webhook/replicate/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Быстрый ответ Replicate
  await webhookQueue.add('process-webhook', body, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });

  return NextResponse.json({ success: true });
}
```

---

## 🟡 Средние проблемы

### 6. Отсутствие Rate Limiting

**Текущее состояние:** Любой пользователь может отправить неограниченное количество запросов.

**Решение с Upstash Rate Limit:**
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1m'), // 100 запросов в минуту
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // ... existing auth logic ...

  // Rate limiting для API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }
  }
}
```

---

### 7. Дублирование сохранения медиа в webhook

**Проблема в логах:**
```
Saving media: { url: '...tmprodrqx8u.jpeg' }
Saving media: { url: '...tmprodrqx8u.jpeg' }
Saving media: { url: '...tmprodrqx8u.jpeg' }  // Тройное сохранение!
```

**Решение — Idempotency key:**
```typescript
// app/api/webhook/replicate/route.ts
const processedWebhooks = new Set<string>(); // В production использовать Redis

export async function POST(request: NextRequest) {
  const body = await request.json();
  const idempotencyKey = `${body.id}-${body.status}`;

  if (processedWebhooks.has(idempotencyKey)) {
    console.log('Webhook already processed:', idempotencyKey);
    return NextResponse.json({ success: true, cached: true });
  }

  processedWebhooks.add(idempotencyKey);
  // ... processing ...
}
```

---

### 8. Нет индексов для частых запросов

**Рекомендуемые индексы:**
```sql
-- Composite index для list с фильтрами
CREATE INDEX idx_generations_user_status_created 
  ON generations(user_id, status, created_at DESC);

-- Partial index для активных генераций
CREATE INDEX idx_generations_active 
  ON generations(user_id, created_at DESC) 
  WHERE status IN ('pending', 'processing');

-- Index для viewed (для badge)
CREATE INDEX idx_generations_unviewed 
  ON generations(user_id) 
  WHERE viewed = false;
```

---

## 📋 План улучшений по приоритету

### Фаза 1: Quick Wins (1-2 дня)

1. ✅ Singleton для ServiceRoleClient
2. ✅ In-memory кэш для Token Pool
3. ✅ Кэширование `/api/models/list`
4. ✅ Адаптивный polling

**Ожидаемый результат:** +30-50% к RPS, снижение DB нагрузки на 60%

### Фаза 2: Оптимизация БД (2-3 дня)

1. Добавить недостающие индексы
2. Оптимизировать запросы list (select только нужных полей)
3. Добавить idempotency для webhook

**Ожидаемый результат:** +20% к RPS на DB-heavy endpoints

### Фаза 3: Realtime (3-5 дней)

1. Реализовать SSE или WebSocket для обновлений
2. Убрать polling для активных пользователей
3. Добавить Rate Limiting

**Ожидаемый результат:** Снижение постоянной нагрузки на 80%+

### Фаза 4: Background Processing (5-7 дней)

1. Настроить Redis/Upstash
2. Вынести webhook обработку в очередь
3. Добавить мониторинг очереди

**Ожидаемый результат:** Webhook обработка выдерживает 100+ одновременных callback-ов

---

## 🎯 Целевые метрики после оптимизации

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Max RPS (Health) | ~450 | ~2000 |
| List Response P95 | ~100ms | ~30ms |
| Concurrent Users | ~50 | ~500 |
| Polling запросов/мин | 6/user | 0-2/user |
| Webhook throughput | ~10/s | ~100/s |

---

## 📁 Файлы для изменения

```
lib/
  ├── supabase/
  │   ├── server.ts         # Singleton client
  │   └── cache.ts          # NEW: Кэш слой
  ├── replicate/
  │   └── token-pool.ts     # In-memory кэш
  └── queue/
      └── index.ts          # NEW: BullMQ setup

app/api/
  ├── generations/
  │   ├── stream/
  │   │   └── route.ts      # NEW: SSE endpoint
  │   └── list/
  │       └── route.ts      # Добавить кэширование
  ├── models/
  │   └── list/
  │       └── route.ts      # Static export
  └── webhook/
      └── replicate/
          └── route.ts      # Очередь + idempotency

middleware.ts               # Rate limiting

contexts/
  └── generations-context.tsx  # SSE подписка

supabase/
  └── migrations/
      └── add_indexes.sql   # NEW: Оптимизация индексов
```

---

## 🔧 Конфигурация Vercel

```json
// vercel.json
{
  "functions": {
    "app/api/webhook/replicate/route.ts": {
      "maxDuration": 60
    },
    "app/api/generations/stream/route.ts": {
      "maxDuration": 300
    }
  },
  "headers": [
    {
      "source": "/api/models/list",
      "headers": [
        { "key": "Cache-Control", "value": "public, s-maxage=3600" }
      ]
    }
  ]
}
```

---

*Документ подготовлен на основе автоматизированного нагрузочного тестирования и code review.*










