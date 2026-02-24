# Refactor: Provider Strategy Pattern

## Problem

`app/api/generations/create/route.ts` — 650+ строк с вложенными `if/else` по провайдерам. Fallback-цепочки дублируются. Добавить нового вендора = копипаста + ручное вплетение в условия.

Webhook handlers (`/api/webhook/replicate`, `/api/webhook/fal`, `/api/webhook/higgsfield`) тоже дублируют логику парсинга результатов.

## Target Architecture

```
route.ts (thin)
  ├── validation, auth, limits
  └── providerManager.generate(model, input)

lib/providers/
  ├── types.ts              — interfaces
  ├── registry.ts           — provider registry + manager
  ├── google.ts             — synchronous, returns result directly
  ├── replicate.ts          — async, webhook-based
  ├── fal.ts                — async, webhook-based
  ├── higgsfield.ts         — async, webhook-based
  └── webhook-handler.ts    — unified webhook processing
```

## Step 1: Define Provider Interface

```typescript
// lib/providers/types.ts

interface GenerationParams {
  model: ModelConfig;
  input: Record<string, any>;
  generationId: string;
  userId: string;
}

// Synchronous result (Google)
interface SyncResult {
  type: 'sync';
  status: 'completed';
  outputUrls: string[];
  timeMs: number;
}

// Async result (Replicate, FAL, Higgsfield)
interface AsyncResult {
  type: 'async';
  status: 'processing';
  predictionId: string;
  provider: string;
}

type GenerationResult = SyncResult | AsyncResult;

interface GenerationProvider {
  name: string;

  // Transform generic input to provider-specific format
  mapInput(input: Record<string, any>, model: ModelConfig): Record<string, any>;

  // Submit generation
  submit(params: GenerationParams): Promise<GenerationResult>;

  // Build webhook URL for this provider (undefined = no webhook)
  getWebhookUrl(): string | undefined;

  // Parse webhook payload into unified format
  parseWebhook(body: any): WebhookResult;
}

interface WebhookResult {
  requestId: string;
  status: 'completed' | 'failed';
  mediaUrls?: string[];
  error?: string;
}
```

## Step 2: Provider Implementations

Each provider in its own file. Examples:

```typescript
// lib/providers/fal.ts
export class FalProvider implements GenerationProvider {
  name = 'fal';

  mapInput(input, model) {
    // prompt, image_urls, aspect_ratio, output_format mapping
  }

  async submit(params) {
    const falClient = getFalClient();
    const { requestId } = await falClient.submitToQueue({
      model: params.model.falFallbackModel,
      input: this.mapInput(params.input, params.model),
      webhook: this.getWebhookUrl(),
    });
    return { type: 'async', status: 'processing', predictionId: requestId, provider: 'fal' };
  }

  getWebhookUrl() {
    return process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/webhook/fal`
      : undefined;
  }

  parseWebhook(body) {
    // Handle status "OK" and "COMPLETED"
    // Extract images/video from payload
  }
}
```

## Step 3: Model Config — Provider Chain

Replace scattered `if (provider === ...)` with declarative config:

```typescript
// In models-config.ts, add to each model:
{
  id: 'nano-banana-pro',
  providers: ['google', 'replicate', 'fal'],  // fallback order
  providerModels: {
    google: 'gemini-3-pro-image-preview',
    replicate: 'black-forest-labs/flux-1.1-pro',
    fal: 'fal-ai/gemini-3-pro-image-preview',
  },
}
```

## Step 4: Provider Manager (Fallback Logic)

```typescript
// lib/providers/registry.ts

const providers = new Map<string, GenerationProvider>();

function registerProvider(provider: GenerationProvider) {
  providers.set(provider.name, provider);
}

async function generate(params: GenerationParams): Promise<GenerationResult> {
  const chain = params.model.providers; // ['google', 'replicate', 'fal']
  const errors: { provider: string; error: string }[] = [];

  for (const name of chain) {
    const provider = providers.get(name);
    if (!provider) continue;

    try {
      const result = await provider.submit(params);
      return result;
    } catch (err) {
      errors.push({ provider: name, error: err.message });
      logger.warn(`[${name}] failed: ${err.message}, trying next...`);
    }
  }

  throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(' | ')}`);
}
```

## Step 5: Thin Route Handler

```typescript
// app/api/generations/create/route.ts — becomes ~50 lines

async function postHandler(request: NextRequest) {
  // 1. Auth
  // 2. Validate input
  // 3. Auto-cleanup stale image generations
  // 4. Check concurrent limit
  // 5. Create generation record in DB

  const result = await generate({
    model, input, generationId: generation.id, userId,
  });

  if (result.type === 'sync') {
    // Update DB with completed status + output URLs
  } else {
    // Update DB with processing status + prediction ID
  }

  return NextResponse.json(result);
}
```

## Step 6: Unified Webhook Handler (Optional)

```typescript
// app/api/webhook/[provider]/route.ts — single dynamic route

async function postHandler(request, { params }) {
  const provider = providers.get(params.provider);
  const body = await request.json();
  const result = provider.parseWebhook(body);

  // Find generation, update DB, save media — same for all providers
}
```

## Migration Plan

1. Create `lib/providers/types.ts` with interfaces
2. Create `lib/providers/fal.ts` — extract FAL logic from route.ts
3. Create `lib/providers/google.ts` — extract Google logic
4. Create `lib/providers/replicate.ts` — extract Replicate logic
5. Create `lib/providers/higgsfield.ts` — extract Higgsfield logic
6. Create `lib/providers/registry.ts` — manager with fallback loop
7. Add `providers` and `providerModels` to model configs
8. Replace route.ts with thin handler calling the manager
9. (Optional) Unify webhook handlers into `[provider]/route.ts`

Each step can be a separate PR. Steps 2-6 can be done without breaking existing code (new files only). Step 8 is the switch.

## Step 7: Request Queue (Rate Limit Aware)

### Problem

Каждый провайдер имеет лимиты на количество одновременных запросов (RPM, concurrent predictions). Сейчас при превышении лимита провайдер возвращает 429/503, запрос фейлится, запускается цепочка ретраев и фоллбеков. Это неэффективно — мы тратим попытки впустую и нагружаем провайдеров лишними запросами.

### Solution

Единая очередь запросов + умный диспетчер, который выбирает провайдера на основе его текущего состояния: лимиты, количество активных запросов, и время "остывания" после ошибки.

### Flow: жизненный цикл запроса

```
1. Client POST /api/generations/create
   → auth, validation, create generation (status: "queued")
   → enqueue job to Redis
   → return { id, status: "queued" } ← клиент видит спиннер

2. Queue Worker берёт job из Redis (FIFO)
   → dispatcher.pickProvider(model) — выбирает лучший провайдер
   → provider.submit(job)
   → update generation (status: "processing")

3. Webhook приходит от провайдера
   → success → status: "completed"
   → fail → dispatcher.reportError(provider) — помечает провайдер как "горячий"
           → re-enqueue job (если retries < MAX)
           → worker снова берёт job, pickProvider выберет другой провайдер
```

### Dispatcher: выбор провайдера

Ключевая логика — **не мы решаем, на какой провайдер отправить**. Мы кладём задание в очередь, а диспетчер сам выбирает первый "остывший" провайдер из цепочки модели.

```typescript
// lib/providers/dispatcher.ts

interface ProviderState {
  activeCount: number;         // сколько запросов сейчас в работе
  maxConcurrent: number;       // лимит
  rpm: number;                 // requests per minute limit
  requestsThisMinute: number;  // сколько отправлено за текущую минуту
  lastErrorAt: number | null;  // timestamp последней ошибки (ms)
  cooldownMs: number;          // время остывания после ошибки (default 5 min)
  consecutiveErrors: number;   // подряд ошибок (для увеличения cooldown)
}

class ProviderDispatcher {
  // Redis keys:
  //   provider:{name}:active     — INCR/DECR при submit/complete
  //   provider:{name}:rpm        — INCR с TTL 60s (auto-expire каждую минуту)
  //   provider:{name}:lastError  — SET timestamp
  //   provider:{name}:errors     — INCR, EXPIRE 10min (сбрасывается если нет ошибок)

  /**
   * Выбирает лучший провайдер из цепочки модели.
   * Возвращает null если все провайдеры "горячие" или перегружены.
   */
  async pickProvider(chain: string[]): Promise<string | null> {
    for (const name of chain) {
      const state = await this.getState(name);

      // 1. Проверяем concurrent лимит
      if (state.activeCount >= state.maxConcurrent) continue;

      // 2. Проверяем RPM лимит
      if (state.rpm && state.requestsThisMinute >= state.rpm) continue;

      // 3. Проверяем остывание — провайдер "горячий" если была ошибка
      //    и с момента ошибки прошло меньше cooldownMs
      if (state.lastErrorAt) {
        const elapsed = Date.now() - state.lastErrorAt;
        const cooldown = this.calculateCooldown(state);
        if (elapsed < cooldown) continue;  // ещё не остыл — пропускаем
      }

      return name;  // этот провайдер готов
    }

    return null;  // все заняты или горячие — job остаётся в очереди
  }

  /**
   * Cooldown увеличивается с количеством подряд ошибок:
   *   1 ошибка  → 1 мин
   *   2 подряд  → 2 мин
   *   3 подряд  → 5 мин
   *   4+ подряд → 10 мин
   */
  private calculateCooldown(state: ProviderState): number {
    const base = 60_000; // 1 минута
    const multipliers = [1, 2, 5, 10];
    const idx = Math.min(state.consecutiveErrors - 1, multipliers.length - 1);
    return base * (multipliers[idx] || 10);
  }

  /**
   * Вызывается при успешном завершении — сбрасывает счётчик ошибок.
   */
  async reportSuccess(provider: string): Promise<void> {
    await redis.del(`provider:${provider}:lastError`);
    await redis.del(`provider:${provider}:errors`);
    await redis.decr(`provider:${provider}:active`);
  }

  /**
   * Вызывается при ошибке — помечает провайдер как "горячий".
   */
  async reportError(provider: string): Promise<void> {
    await redis.set(`provider:${provider}:lastError`, Date.now());
    await redis.incr(`provider:${provider}:errors`);
    await redis.expire(`provider:${provider}:errors`, 600); // 10 min TTL
    await redis.decr(`provider:${provider}:active`);
  }
}
```

### Queue Worker

```typescript
// lib/providers/worker.ts

class QueueWorker {
  private dispatcher: ProviderDispatcher;
  private pollIntervalMs = 1000;  // проверять очередь каждую секунду

  async run(): Promise<void> {
    while (true) {
      // 1. Peek at next job in queue (don't remove yet)
      const job = await redis.lindex('generation:queue', 0);
      if (!job) {
        await sleep(this.pollIntervalMs);
        continue;
      }

      // 2. Pick provider for this job's model chain
      const model = getModelById(job.modelId);
      const provider = await this.dispatcher.pickProvider(model.providers);

      if (!provider) {
        // Все провайдеры заняты или горячие — ждём
        await sleep(this.pollIntervalMs);
        continue;
      }

      // 3. Атомарно забираем job из очереди (LPOP)
      const taken = await redis.lpop('generation:queue');
      if (!taken) continue;  // другой worker уже забрал

      // 4. Отправляем на провайдер
      await this.dispatcher.incrementActive(provider);
      await this.updateGeneration(job.generationId, {
        status: 'processing',
        provider,
      });

      try {
        await providers.get(provider).submit(job.params);
      } catch (err) {
        // Submit failed (не приняли даже запрос) — re-enqueue
        await this.dispatcher.reportError(provider);
        if (job.retries < MAX_RETRIES) {
          job.retries++;
          await redis.rpush('generation:queue', job);
        } else {
          await this.updateGeneration(job.generationId, {
            status: 'failed',
            error: err.message,
          });
        }
      }
    }
  }
}
```

### Webhook → Re-enqueue

Когда провайдер вернул ошибку через webhook, задание возвращается в очередь.
Диспетчер при следующем `pickProvider` автоматически выберет другой провайдер (тот что вернул ошибку — "горячий").

```typescript
// app/api/webhook/[provider]/route.ts

async function handleFailedWebhook(generation, provider, error) {
  const retries = generation.settings?.queue_retries || 0;

  // Помечаем провайдер как горячий
  await dispatcher.reportError(provider);

  if (retries < MAX_QUEUE_RETRIES) {
    // Возвращаем в очередь — worker сам выберет следующий провайдер
    await redis.rpush('generation:queue', {
      generationId: generation.id,
      modelId: generation.model_id,
      params: generation.replicate_input,
      retries: retries + 1,
      lastError: { provider, error },
    });

    await supabase.from('generations').update({
      status: 'queued',  // обратно в очередь — клиент видит спиннер
      error_message: null,
      settings: { ...generation.settings, queue_retries: retries + 1 },
    }).eq('id', generation.id);

    writeWarningLog({
      message: `Re-queued after ${provider} error (attempt ${retries + 1}). Reason: ${error}`,
      details: { provider, error, retries: retries + 1 },
    });
  } else {
    // Исчерпаны все попытки
    await supabase.from('generations').update({
      status: 'failed',
      error_message: error,
    }).eq('id', generation.id);
  }
}
```

### Круговое переключение провайдеров

Ключевой принцип: **job не привязан к конкретному провайдеру**. Каждый раз когда worker берёт job из очереди, он заново выбирает лучший провайдер через `pickProvider`. Если провайдер упал — job возвращается в ту же очередь, и при следующей попытке worker выберет другой провайдер (упавший "горячий", будет пропущен).

Это создаёт цикл переключения по кругу:

```
                    ┌─────────────────────────────┐
                    │        Redis Queue           │
                    │  (единая очередь заданий)    │
                    └──────┬──────────────▲────────┘
                           │              │
                      worker берёт    re-enqueue
                           │          при ошибке
                           ▼              │
                    ┌──────────────────────┴────────┐
                    │       pickProvider(chain)      │
                    │  выбирает первый "остывший"    │
                    └──┬──────────┬──────────┬──────┘
                       │          │          │
                       ▼          ▼          ▼
                   ┌────────┐ ┌──────────┐ ┌─────┐
                   │ Google │ │ Replicate│ │ Fal │
                   └───┬────┘ └────┬─────┘ └──┬──┘
                       │           │          │
                  success/fail  success/fail  success/fail
                       │           │          │
                       ▼           ▼          ▼
                  reportSuccess / reportError
                  (сброс cooldown / пометка "горячий")
```

**Правила цикла:**

1. Job попадает в очередь. Worker берёт и вызывает `pickProvider(chain)`.
2. `pickProvider` перебирает цепочку `['google', 'replicate', 'fal']` и возвращает первый провайдер, который:
   - Не превысил `maxConcurrent`
   - Не превысил `rpm`
   - **Остыл** — с момента последней ошибки прошло больше `cooldownMs`
3. При ошибке (webhook `failed` или исключение при submit):
   - `reportError(provider)` — помечает горячим, увеличивает `consecutiveErrors`
   - Job возвращается в очередь (re-enqueue)
   - На следующей итерации `pickProvider` пропустит этот провайдер и выберет следующий
4. Если **все провайдеры горячие** — job остаётся в очереди. Worker не берёт его, пока хотя бы один не остынет.
5. При успехе — `reportSuccess(provider)` сбрасывает cooldown и `consecutiveErrors`.

**Цикл ограничен** `MAX_QUEUE_RETRIES` (например 9). Это значит до 3 полных кругов по цепочке из 3 провайдеров. После исчерпания — `status: failed`.

### Пример: nano-banana-pro, полный цикл

```
Запрос от клиента → generation создана (status: queued) → job в Redis

── Круг 1 ──────────────────────────────────────────────

Worker берёт job (retry 0/9):
  pickProvider(['google', 'replicate', 'fal'])
    → google: остыл ✓, слоты есть ✓ → выбран
  Submit → Google вернул 429
  reportError('google') → горячий на 1 мин
  Re-enqueue (retry 1) → generation.status = queued

Worker берёт job (retry 1/9):
  pickProvider(['google', 'replicate', 'fal'])
    → google: горячий ✗, skip
    → replicate: остыл ✓, слоты есть ✓ → выбран
  Submit → Replicate принял → generation.status = processing
  Webhook → failed (E003 high demand)
  reportError('replicate') → горячий на 1 мин
  Re-enqueue (retry 2) → generation.status = queued

Worker берёт job (retry 2/9):
  pickProvider(['google', 'replicate', 'fal'])
    → google: горячий ✗, skip
    → replicate: горячий ✗, skip
    → fal: остыл ✓, слоты есть ✓ → выбран
  Submit → Fal принял → generation.status = processing
  Webhook → completed ✓ → generation.status = completed
  reportSuccess('fal')

── Если бы Fal тоже упал — Круг 2 ─────────────────────

Worker берёт job (retry 3/9):
  pickProvider → все три горячие → null
  Job остаётся в очереди, worker ждёт...

  ...проходит 1 минута, google остыл...

Worker берёт job (retry 3/9):
  pickProvider → google остыл ✓ → выбран
  Submit → Google → новый круг начался

── И так далее до retry 9/9 или успеха ─────────────────
```

### Redis Keys

```
generation:queue                  — LIST, FIFO очередь jobs
provider:{name}:active            — INT, текущие активные запросы
provider:{name}:rpm               — INT с TTL 60s, запросы за минуту
provider:{name}:lastError         — INT (timestamp), когда была последняя ошибка
provider:{name}:errors            — INT с TTL 600s, подряд ошибок (для cooldown)
```

### Provider Limits Config

```typescript
// lib/providers/limits.ts

export const PROVIDER_LIMITS: Record<string, ProviderLimits> = {
  google: {
    maxConcurrent: 5,
    rpm: 30,
    cooldownMs: 60_000,     // 1 мин базовый cooldown
  },
  replicate: {
    maxConcurrent: 10,
    // RPM managed by Replicate token pool
    cooldownMs: 60_000,
  },
  fal: {
    maxConcurrent: 5,
    rpm: 60,
    cooldownMs: 60_000,
  },
  higgsfield: {
    maxConcurrent: 3,
    cooldownMs: 120_000,    // 2 мин — более хрупкий сервис
  },
};
```

### Client UX

Статусы генерации: `pending → queued → processing → completed/failed`

- `queued` — спиннер + "Waiting..." (клиент не видит деталей про провайдеров)
- `processing` — спиннер + "Generating..."
- При re-enqueue (`processing → queued`) клиент продолжает видеть спиннер

### Migration Steps

1. Поднять Redis (или использовать Upstash для serverless)
2. Реализовать `ProviderDispatcher` с Redis-backed состоянием провайдеров
3. Реализовать `QueueWorker` (отдельный process или cron job)
4. Добавить статус `queued` в БД и на фронт
5. В `create/route.ts`: вместо прямого вызова провайдера — enqueue в Redis
6. В webhook handlers: при ошибке — `dispatcher.reportError()` + re-enqueue
7. При успехе — `dispatcher.reportSuccess()` для сброса cooldown

## Benefits

- Add new provider: 1 file + model config entry
- Fallback: declarative, per-model, no code changes
- Testing: each provider testable in isolation
- Webhook: unified parsing, less duplication
- route.ts: from 650 lines to ~50
- Queue: no wasted retries on overloaded providers, predictable throughput

## Risks

- Must preserve all input mapping quirks per provider
- Webhook payload formats differ significantly
- Google is synchronous, others are async — interface must handle both
- FAL_ONLY env flag needs to work (filter provider chain at runtime)
- Queue adds latency for waiting requests — need clear UX for "queued" state
- Redis — дополнительная инфраструктура, нужен мониторинг