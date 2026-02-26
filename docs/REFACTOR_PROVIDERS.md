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
  ├── types.ts              — interfaces (ProviderChainEntry, GenerationProvider, etc.)
  ├── chain.ts              — resolveChain() — runtime chain filtering (FAL_ONLY, etc.)
  ├── registry.ts           — provider registry + manager (fallback loop with startFrom)
  ├── google.ts             — synchronous, returns result directly, own mapInput()
  ├── replicate.ts          — async, webhook-based, own mapInput()
  ├── fal.ts                — async, webhook-based, own mapInput()
  ├── higgsfield.ts         — async, webhook-based, own mapInput()
  └── webhook-handler.ts    — unified webhook processing (chain-aware retry)
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

### Problem с текущей моделью

Сейчас fallback-цепочка описана разрозненными полями:
- `provider` — первичный провайдер
- `fallbackModel` — второй (Replicate)
- `falFallbackModel` — третий (Fal)

Добавить 4-й уровень = добавить новое поле + новый `else if` в route. Порядок провайдеров зашит в код.

### Решение: `ProviderChainEntry[]`

Заменить все три поля на единый массив `providers`. **Порядок элементов = порядок fallback**. Перестановка элементов = смена приоритета провайдеров, без изменений в коде.

```typescript
// lib/providers/types.ts

interface ProviderChainEntry {
  provider: ProviderType;    // 'google' | 'replicate' | 'fal' | 'higgsfield'
  model: string;             // модель у этого провайдера
}

// В models-config.ts, каждая модель:
interface Model {
  id: string;
  label: string;
  // ...existing fields...
  providers: ProviderChainEntry[];  // fallback chain — порядок = приоритет
  // УДАЛИТЬ: provider, fallbackModel, falFallbackModel
}
```

Пример для nano-banana-pro:
```typescript
{
  id: 'nano-banana-pro',
  providers: [
    { provider: 'google', model: 'gemini-3-pro-image-preview' },
    { provider: 'replicate', model: 'google/nano-banana-pro' },
    { provider: 'fal', model: 'fal-ai/gemini-3-pro-image-preview' },
  ],
}
```

**Смена порядка** — просто переставить элементы массива:
```typescript
// Было: Google → Replicate → Fal
// Стало: Fal → Google → Replicate (Fal теперь primary)
providers: [
  { provider: 'fal', model: 'fal-ai/gemini-3-pro-image-preview' },
  { provider: 'google', model: 'gemini-3-pro-image-preview' },
  { provider: 'replicate', model: 'google/nano-banana-pro' },
],
```

**Добавить нового провайдера** — добавить элемент в массив:
```typescript
providers: [
  { provider: 'google', model: 'gemini-3-pro-image-preview' },
  { provider: 'newvendor', model: 'newvendor/model-v1' },  // новый!
  { provider: 'replicate', model: 'google/nano-banana-pro' },
  { provider: 'fal', model: 'fal-ai/gemini-3-pro-image-preview' },
],
```

## Step 4: Provider Manager (Fallback Logic)

Менеджер итерирует по `model.providers[]` (массив `ProviderChainEntry`) и пробует каждый по порядку. **Маппинг input делает сам провайдер** через `mapInput()` — route.ts не содержит provider-specific логики.

```typescript
// lib/providers/registry.ts

const providers = new Map<string, GenerationProvider>();

function registerProvider(provider: GenerationProvider) {
  providers.set(provider.name, provider);
}

async function generate(params: GenerationParams, startFrom = 0): Promise<GenerationResult> {
  const chain = resolveChain(params.model); // см. "Runtime Chain Filtering"
  const errors: { provider: string; error: string }[] = [];

  for (let i = startFrom; i < chain.length; i++) {
    const entry = chain[i]; // { provider: 'google', model: 'gemini-3-pro-...' }
    const provider = providers.get(entry.provider);
    if (!provider) continue;

    try {
      // Провайдер сам маппит input — route.ts не знает специфику
      const mappedInput = provider.mapInput(params.input, params.model);

      const result = await provider.submit({
        ...params,
        providerModel: entry.model,  // модель конкретного провайдера
        input: mappedInput,
      });
      return result;
    } catch (err) {
      errors.push({ provider: entry.provider, error: err.message });
      logger.warn(`[${entry.provider}] failed: ${err.message}, trying next...`);
    }
  }

  throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(' | ')}`);
}
```

Ключевые отличия от текущей реализации:
- **`startFrom`** — позволяет webhook retry продолжить цепочку со следующего провайдера, а не с начала
- **`provider.mapInput()`** — каждый провайдер сам знает как преобразовать generic input в свой формат (prompt → fal_prompt, aspect_ratio → image_size, и т.п.)
- **`entry.model`** — модель берётся из конфига, а не из отдельных полей `fallbackModel` / `falFallbackModel`
- **`resolveChain()`** — фильтрация цепочки по env-флагам перед перебором

## Step 4.1: Runtime Chain Filtering

ENV-флаги вроде `FAL_ONLY` реализуются как **фильтр цепочки перед перебором**, а не как отдельная ветка `if/else` в route.ts.

```typescript
// lib/providers/chain.ts

function resolveChain(model: Model): ProviderChainEntry[] {
  let chain = [...model.providers];

  // FAL_ONLY — оставить только fal-провайдеров
  if (process.env.FAL_ONLY === 'true') {
    chain = chain.filter(e => e.provider === 'fal');
  }

  // SKIP_PROVIDER — исключить конкретного провайдера
  // Пример: SKIP_PROVIDER=google — временно убрать Google из цепочки
  if (process.env.SKIP_PROVIDER) {
    const skip = process.env.SKIP_PROVIDER.split(',');
    chain = chain.filter(e => !skip.includes(e.provider));
  }

  // PRIMARY_PROVIDER — принудительно поставить провайдера первым
  // Пример: PRIMARY_PROVIDER=fal — Fal становится primary для всех моделей
  if (process.env.PRIMARY_PROVIDER) {
    const primary = process.env.PRIMARY_PROVIDER;
    const prioritized = chain.filter(e => e.provider === primary);
    const rest = chain.filter(e => e.provider !== primary);
    chain = [...prioritized, ...rest];
  }

  if (chain.length === 0) {
    throw new Error(`No providers available for model ${model.id} after filtering`);
  }

  return chain;
}
```

Преимущества:
- **Нет отдельных веток** — один и тот же код fallback работает вне зависимости от фильтров
- **Композируемость** — фильтры можно комбинировать: `FAL_ONLY` + другие
- **Новые фильтры** — добавляются в одну функцию, без изменений в route/webhook/worker

## Step 4.2: API Logging (api_logs) Integration

### Текущая система логирования

Сейчас логирование API-обращений реализовано через:

1. **`lib/api-log.ts`** — core-функции:
   - `writeApiLog(entry)` — fire-and-forget запись в таблицу `api_logs` (method, path, status_code, duration_ms, provider, model_name, generation_id, error_message, error_category, is_fallback, retry_count, etc.)
   - `writeWarningLog(opts)` — логирование fallback-переключений и нефатальных событий (status_code=299, is_fallback=true)
   - `classifyError(message)` — категоризация ошибок (nsfw, timeout, rate_limit, auth, network, etc.)

2. **`lib/with-api-logging.ts`** — HOF-обёртка `withApiLogging(handler, { provider })`:
   - Оборачивает route handler, автоматически логирует request/response
   - Замеряет duration_ms, извлекает user_id из cookies, классифицирует ошибки
   - Для webhook-путей пропускает извлечение user_id

3. **Ручные `writeWarningLog()` вызовы** — в route.ts и webhook handlers при каждом fallback-переключении (Fal→Replicate, Google→Replicate, etc.)

### Проблема

Логирование fallback-событий **размазано** по route.ts и каждому webhook handler. Каждый `writeWarningLog()` вызов захардкожен с конкретными именами провайдеров:
```typescript
// Сейчас в route.ts — конкретные пары провайдеров:
writeWarningLog({
  message: `Fallback: Fal.ai -> Replicate. Reason: ${error}`,
  details: { original_provider: 'fal', fallback_provider: 'replicate' },
});
```

### Решение: логирование внутри `generate()` и webhook handler

Вся логика записи в `api_logs` при fallback — **внутри `generate()` и unified webhook**, а не в route.ts. Провайдеры определяются из цепочки, не хардкодятся.

#### generate() с логированием:

```typescript
async function generate(params: GenerationParams, startFrom = 0): Promise<GenerationResult> {
  const chain = resolveChain(params.model);
  const errors: { provider: string; error: string }[] = [];

  for (let i = startFrom; i < chain.length; i++) {
    const entry = chain[i];
    const provider = providers.get(entry.provider);
    if (!provider) continue;

    try {
      const mappedInput = provider.mapInput(params.input, params.model);
      const result = await provider.submit({
        ...params,
        providerModel: entry.model,
        input: mappedInput,
      });
      return result;
    } catch (err) {
      errors.push({ provider: entry.provider, error: err.message });

      const nextEntry = chain[i + 1];
      // Логируем fallback-переключение в api_logs
      writeWarningLog({
        path: '/api/generations/create',
        provider: entry.provider,
        model_name: params.model.label,
        generation_id: params.generationId,
        user_id: params.userId,
        message: nextEntry
          ? `Chain fallback ${i + 1}/${chain.length}: ${entry.provider} -> ${nextEntry.provider}. Reason: ${err.message}`
          : `Last provider in chain failed: ${entry.provider}. Reason: ${err.message}`,
        details: {
          original_provider: chain[0].provider,
          failed_provider: entry.provider,
          fallback_provider: nextEntry?.provider ?? null,
          chain_position: i,
          chain_length: chain.length,
          error: err.message,
          error_category: classifyError(err.message),
        },
      });
    }
  }

  throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(' | ')}`);
}
```

#### Unified webhook с логированием:

```typescript
// app/api/webhook/[provider]/route.ts

async function postHandler(request, { params }) {
  const provider = providers.get(params.provider);
  const body = await request.json();
  const result = provider.parseWebhook(body);
  const generation = await findGenerationByPredictionId(result.requestId);
  const model = getModelById(generation.model_id);

  if (result.status === 'completed') {
    await updateGeneration(generation.id, { status: 'completed', output_urls: result.mediaUrls });
    return NextResponse.json({ status: 'ok' });
  }

  // Ошибка — логируем и передаём в следующий провайдер
  const chain = resolveChain(model);
  const currentIndex = chain.findIndex(e => e.provider === params.provider);
  const nextIndex = currentIndex + 1;

  if (nextIndex < chain.length) {
    const nextEntry = chain[nextIndex];

    // Логируем fallback в api_logs
    writeWarningLog({
      path: `/api/webhook/${params.provider}`,
      provider: params.provider,
      model_name: generation.model_name,
      generation_id: generation.id,
      user_id: generation.user_id,
      message: `Chain fallback: ${params.provider} -> ${nextEntry.provider} (${nextIndex + 1}/${chain.length}). Reason: ${result.error}`,
      details: {
        original_provider: chain[0].provider,
        failed_provider: params.provider,
        fallback_provider: nextEntry.provider,
        chain_position: currentIndex,
        chain_length: chain.length,
        error: result.error,
        error_category: classifyError(result.error),
      },
    });

    await generate({ model, input: generation.replicate_input, generationId: generation.id, userId: generation.user_id }, nextIndex);
  } else {
    // Цепочка исчерпана — логируем финальный fail
    writeWarningLog({
      path: `/api/webhook/${params.provider}`,
      provider: params.provider,
      model_name: generation.model_name,
      generation_id: generation.id,
      user_id: generation.user_id,
      message: `Generation failed: ${result.error} (chain exhausted, ${chain.length} providers tried)`,
      details: {
        error: result.error,
        error_category: classifyError(result.error),
        chain_length: chain.length,
        retry_count: generation.settings?.auto_retry_count || 0,
      },
    });

    await updateGeneration(generation.id, { status: 'failed', error_message: result.error });
  }
}

// withApiLogging оборачивает handler — автоматический лог request/response
export const POST = withApiLogging(postHandler, { provider: 'dynamic' });
```

### Ключевые принципы логирования в новой архитектуре

1. **`withApiLogging()` остаётся** — оборачивает route handler и unified webhook, автоматически логирует request/response/duration/errors

2. **`writeWarningLog()` вызывается из `generate()` и webhook handler** — не из route.ts. Провайдеры берутся из цепочки, не хардкодятся

3. **В `details` пишется позиция в цепочке** — `chain_position`, `chain_length`, `failed_provider`, `fallback_provider` — это позволяет анализировать какие провайдеры чаще падают и на какой позиции

4. **`classifyError()` не меняется** — те же категории (nsfw, timeout, rate_limit, etc.), та же таблица `api_logs`

5. **Формат api_logs не меняется** — таблица остаётся прежней. Новые данные (chain_position, chain_length) пишутся в существующее JSONB-поле `response_summary` / `details` внутри `writeWarningLog`

6. **Unified webhook получает provider динамически** — из URL `[provider]`, а не хардкодом. `withApiLogging` может читать provider из route params

## Step 5: Thin Route Handler

```typescript
// app/api/generations/create/route.ts — becomes ~50 lines

async function postHandler(request: NextRequest) {
  // 1. Auth
  // 2. Validate input
  // 3. Auto-cleanup stale image generations
  // 4. Check concurrent limit
  // 5. Create generation record in DB

  // generate() сам логирует fallback-переключения через writeWarningLog()
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

// withApiLogging автоматически логирует request/response/duration в api_logs
export const POST = withApiLogging(postHandler);
```

Route handler **не содержит** вызовов `writeWarningLog()` — это делает `generate()` внутри себя при каждом fallback-переключении. Route только вызывает `generate()` и возвращает результат.

## Step 6: Unified Webhook Handler (Chain-Aware Retry)

```typescript
// app/api/webhook/[provider]/route.ts — single dynamic route

async function postHandler(request, { params }) {
  const provider = providers.get(params.provider);
  const body = await request.json();
  const result = provider.parseWebhook(body);

  const generation = await findGenerationByPredictionId(result.requestId);
  const model = getModelById(generation.model_id);

  if (result.status === 'completed') {
    // Успех — сохраняем результат
    await updateGeneration(generation.id, {
      status: 'completed',
      output_urls: result.mediaUrls,
    });
    return;
  }

  // Ошибка — определяем следующий провайдер из цепочки
  const chain = resolveChain(model);
  const currentIndex = chain.findIndex(e => e.provider === params.provider);
  const nextIndex = currentIndex + 1;

  if (nextIndex < chain.length) {
    // Есть следующий провайдер — retry с него
    const nextEntry = chain[nextIndex];
    logger.warn(`[${params.provider}] failed, trying ${nextEntry.provider} (${nextIndex + 1}/${chain.length})`);

    await generate({
      model,
      input: generation.replicate_input,
      generationId: generation.id,
      userId: generation.user_id,
    }, nextIndex); // startFrom = nextIndex — пропускаем уже попробованных
  } else {
    // Цепочка исчерпана — fail
    await updateGeneration(generation.id, {
      status: 'failed',
      error_message: result.error,
    });
  }
}
```

Ключевой момент: webhook не знает "если fal упал → иди на replicate". Он определяет **индекс текущего провайдера** в `model.providers[]` и передаёт `startFrom` в `generate()`, чтобы продолжить с **следующего по цепочке**. Порядок определяется только конфигом.

## Migration Plan

1. Create `lib/providers/types.ts` with interfaces (`ProviderChainEntry`, `GenerationProvider`, etc.)
2. Create `lib/providers/chain.ts` — `resolveChain()` with env-flag filtering
3. Create `lib/providers/fal.ts` — extract FAL logic from route.ts (включая `mapInput`)
4. Create `lib/providers/google.ts` — extract Google logic (включая `mapInput`)
5. Create `lib/providers/replicate.ts` — extract Replicate logic (включая `mapInput`)
6. Create `lib/providers/higgsfield.ts` — extract Higgsfield logic (включая `mapInput`)
7. Create `lib/providers/registry.ts` — manager with fallback loop + `startFrom`
8. **Migrate model configs**: заменить `provider` + `fallbackModel` + `falFallbackModel` → `providers: ProviderChainEntry[]`
9. Replace route.ts with thin handler calling the manager
10. (Optional) Unify webhook handlers into `[provider]/route.ts`

Each step can be a separate PR. Steps 2-7 can be done without breaking existing code (new files only). Step 8-9 is the switch.

### Model Config Migration Mapping

Маппинг старых полей → новый формат `providers[]`:

```typescript
// Было (старый формат в models-config.ts):
{
  id: 'nano-banana-pro',
  provider: 'google',
  fallbackModel: 'google/nano-banana-pro',         // Replicate fallback
  falFallbackModel: 'fal-ai/gemini-3-pro-image-preview', // Fal fallback
}

// Стало (новый формат):
{
  id: 'nano-banana-pro',
  providers: [
    { provider: 'google', model: 'gemini-3-pro-image-preview' },
    { provider: 'replicate', model: 'google/nano-banana-pro' },
    { provider: 'fal', model: 'fal-ai/gemini-3-pro-image-preview' },
  ],
}
```

**Правила маппинга по типу текущего `provider`:**

| Текущий `provider` | Старые поля | Новый `providers[]` |
|---|---|---|
| `'google'` | `provider` + `fallbackModel` + `falFallbackModel` | `[{google, ...}, {replicate, fallbackModel}, {fal, falFallbackModel}]` |
| `'fal'` | `provider` + `fallbackModel` | `[{fal, ...}, {replicate, fallbackModel}]` |
| `'replicate'` | `provider` (default) | `[{replicate, model}]` |
| `'higgsfield'` | `provider` | `[{higgsfield, model}]` |

**Примеры:**

```typescript
// 1. Google-primary с полной цепочкой (большинство моделей)
// Было:
{ provider: 'google', fallbackModel: 'org/model-rep', falFallbackModel: 'fal-ai/model' }
// Стало:
{ providers: [
    { provider: 'google', model: 'gemini-...' },
    { provider: 'replicate', model: 'org/model-rep' },
    { provider: 'fal', model: 'fal-ai/model' },
] }

// 2. Fal-primary (модели где Fal — основной)
// Было:
{ provider: 'fal', fallbackModel: 'org/model-rep' }
// Стало:
{ providers: [
    { provider: 'fal', model: 'fal-ai/model' },
    { provider: 'replicate', model: 'org/model-rep' },
] }

// 3. Replicate-only (дефолт, без fallback)
// Было:
{ provider: 'replicate' }  // или provider не указан
// Стало:
{ providers: [
    { provider: 'replicate', model: 'org/model' },
] }

// 4. Higgsfield (единственный провайдер)
// Было:
{ provider: 'higgsfield' }
// Стало:
{ providers: [
    { provider: 'higgsfield', model: 'higgsfield/model' },
] }
```

**Что удаляется из модели:**
- `provider` → заменён первым элементом `providers[0].provider`
- `fallbackModel` → заменён `providers[1].model` (обычно Replicate)
- `falFallbackModel` → заменён `providers[2].model` (обычно Fal)

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
   * Принимает ProviderChainEntry[] — тот же массив из model.providers.
   * Возвращает ProviderChainEntry или null если все "горячие" или перегружены.
   */
  async pickProvider(chain: ProviderChainEntry[]): Promise<ProviderChainEntry | null> {
    for (const entry of chain) {
      const state = await this.getState(entry.provider);

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

      return entry;  // этот провайдер готов (включая модель)
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
      const chain = resolveChain(model); // фильтрация по env-флагам
      const chainFromIndex = chain.slice(job.startFrom || 0); // продолжаем с нужной позиции
      const entry = await this.dispatcher.pickProvider(chainFromIndex);

      if (!entry) {
        // Все провайдеры заняты или горячие — ждём
        await sleep(this.pollIntervalMs);
        continue;
      }

      // 3. Атомарно забираем job из очереди (LPOP)
      const taken = await redis.lpop('generation:queue');
      if (!taken) continue;  // другой worker уже забрал

      // 4. Провайдер сам маппит input
      const provider = providers.get(entry.provider);
      const mappedInput = provider.mapInput(job.params.input, model);

      await this.dispatcher.incrementActive(entry.provider);
      await this.updateGeneration(job.generationId, {
        status: 'processing',
        provider: entry.provider,
        provider_model: entry.model,
      });

      try {
        await provider.submit({
          ...job.params,
          providerModel: entry.model,
          input: mappedInput,
        });
      } catch (err) {
        // Submit failed — re-enqueue со следующего провайдера
        await this.dispatcher.reportError(entry.provider);
        const currentIdx = chain.findIndex(e => e.provider === entry.provider);

        // Логируем ошибку submit в api_logs
        writeWarningLog({
          path: '/api/providers/worker',
          provider: entry.provider,
          model_name: model.label,
          generation_id: job.generationId,
          message: `Submit failed: ${entry.provider} (${currentIdx + 1}/${chain.length}). Reason: ${err.message}`,
          details: {
            failed_provider: entry.provider,
            chain_position: currentIdx,
            chain_length: chain.length,
            retry: job.retries,
            error: err.message,
            error_category: classifyError(err.message),
          },
        });

        if (job.retries < MAX_RETRIES) {
          job.retries++;
          job.startFrom = currentIdx + 1; // следующий в цепочке
          if (job.startFrom >= chain.length) job.startFrom = 0; // новый круг
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

### Webhook → Re-enqueue (Chain-Aware)

Когда провайдер вернул ошибку через webhook, задание возвращается в очередь **с указанием позиции в цепочке**. Worker начнёт со следующего провайдера, а не с начала.

```typescript
// app/api/webhook/[provider]/route.ts

async function handleFailedWebhook(generation, providerName, error) {
  const retries = generation.settings?.queue_retries || 0;
  const model = getModelById(generation.model_id);
  const chain = resolveChain(model);

  // Определяем индекс текущего провайдера в цепочке
  const currentIndex = chain.findIndex(e => e.provider === providerName);
  const nextIndex = currentIndex + 1;

  // Помечаем провайдер как горячий
  await dispatcher.reportError(providerName);

  if (retries < MAX_QUEUE_RETRIES) {
    const nextStartFrom = nextIndex >= chain.length ? 0 : nextIndex;

    // Возвращаем в очередь — startFrom указывает на следующий провайдер
    await redis.rpush('generation:queue', {
      generationId: generation.id,
      modelId: generation.model_id,
      params: generation.replicate_input,
      retries: retries + 1,
      startFrom: nextStartFrom,
      lastError: { provider: providerName, error },
    });

    await supabase.from('generations').update({
      status: 'queued',
      error_message: null,
      settings: { ...generation.settings, queue_retries: retries + 1 },
    }).eq('id', generation.id);

    // Логируем fallback-переключение в api_logs
    writeWarningLog({
      path: `/api/webhook/${providerName}`,
      provider: providerName,
      model_name: generation.model_name,
      generation_id: generation.id,
      user_id: generation.user_id,
      message: `Re-queued: ${providerName} -> startFrom=${nextStartFrom} (attempt ${retries + 1}/${MAX_QUEUE_RETRIES}). Reason: ${error}`,
      details: {
        failed_provider: providerName,
        chain_position: currentIndex,
        chain_length: chain.length,
        next_start_from: nextStartFrom,
        retries: retries + 1,
        error,
        error_category: classifyError(error),
      },
    });
  } else {
    // Исчерпаны все попытки — логируем финальный fail
    writeWarningLog({
      path: `/api/webhook/${providerName}`,
      provider: providerName,
      model_name: generation.model_name,
      generation_id: generation.id,
      user_id: generation.user_id,
      message: `Generation failed: all ${MAX_QUEUE_RETRIES} retries exhausted across ${chain.length} providers. Last error: ${error}`,
      details: {
        failed_provider: providerName,
        chain_length: chain.length,
        total_retries: retries,
        error,
        error_category: classifyError(error),
      },
    });

    await supabase.from('generations').update({
      status: 'failed',
      error_message: error,
    }).eq('id', generation.id);
  }
}
```

Ключевое отличие от прежнего подхода: **нет хардкода** "если fal упал → иди на replicate". Webhook определяет индекс текущего провайдера в `model.providers[]` и передаёт `startFrom` при re-enqueue. Worker использует `startFrom` чтобы продолжить цепочку с правильной позиции.

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

1. Job попадает в очередь (с `startFrom = 0`). Worker берёт и вызывает `pickProvider(chain.slice(startFrom))`.
2. `pickProvider` перебирает цепочку `ProviderChainEntry[]` (из `model.providers`, отфильтрованную через `resolveChain()`) и возвращает первый `ProviderChainEntry`, провайдер которого:
   - Не превысил `maxConcurrent`
   - Не превысил `rpm`
   - **Остыл** — с момента последней ошибки прошло больше `cooldownMs`
3. При ошибке (webhook `failed` или исключение при submit):
   - `reportError(provider)` — помечает горячим, увеличивает `consecutiveErrors`
   - Job возвращается в очередь с `startFrom = currentIndex + 1` (следующий в цепочке)
   - Worker использует `startFrom` чтобы начать со следующего провайдера
4. Если **все провайдеры горячие** — job остаётся в очереди. Worker не берёт его, пока хотя бы один не остынет.
5. При успехе — `reportSuccess(provider)` сбрасывает cooldown и `consecutiveErrors`.
6. Когда `startFrom >= chain.length` — сбрасывается в 0 (новый круг по цепочке).

**Цикл ограничен** `MAX_QUEUE_RETRIES` (например 9). Это значит до 3 полных кругов по цепочке из 3 провайдеров. После исчерпания — `status: failed`.

### Пример: nano-banana-pro, полный цикл

```
Config: providers: [{google, gemini-3-pro}, {replicate, google/nano-banana-pro}, {fal, fal-ai/gemini-3-pro}]

Запрос от клиента → generation создана (status: queued) → job в Redis (startFrom=0)

── Круг 1 ──────────────────────────────────────────────

Worker берёт job (retry 0/9, startFrom=0):
  chain = resolveChain(model) → [{google,...}, {replicate,...}, {fal,...}]
  pickProvider(chain.slice(0))
    → google: остыл ✓, слоты есть ✓ → выбран
  google.mapInput(input, model) → provider-specific format
  Submit(providerModel='gemini-3-pro') → Google вернул 429
  reportError('google') → горячий на 1 мин
  Re-enqueue (retry 1, startFrom=1) → generation.status = queued

Worker берёт job (retry 1/9, startFrom=1):
  pickProvider(chain.slice(1))  // начинаем с replicate
    → replicate: остыл ✓, слоты есть ✓ → выбран
  replicate.mapInput(input, model) → provider-specific format
  Submit(providerModel='google/nano-banana-pro') → Replicate принял → generation.status = processing
  Webhook → failed (E003 high demand)
  reportError('replicate') → горячий на 1 мин
  Re-enqueue (retry 2, startFrom=2) → generation.status = queued

Worker берёт job (retry 2/9, startFrom=2):
  pickProvider(chain.slice(2))  // начинаем с fal
    → fal: остыл ✓, слоты есть ✓ → выбран
  fal.mapInput(input, model) → provider-specific format
  Submit(providerModel='fal-ai/gemini-3-pro') → Fal принял → generation.status = processing
  Webhook → completed ✓ → generation.status = completed
  reportSuccess('fal')

── Если бы Fal тоже упал — Круг 2 ─────────────────────

Re-enqueue (retry 3, startFrom=0) → цепочка исчерпана, новый круг

Worker берёт job (retry 3/9, startFrom=0):
  pickProvider(chain.slice(0)) → все три горячие → null
  Job остаётся в очереди, worker ждёт...

  ...проходит 1 минута, google остыл...

Worker берёт job (retry 3/9, startFrom=0):
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

- **Смена порядка провайдеров** — переставить элементы в `providers[]` массиве, без изменений в коде
- **Add new provider**: 1 файл (class implements GenerationProvider) + запись в `providers[]` нужных моделей
- **Fallback**: declarative, per-model, порядок определяется конфигом
- **Input mapping**: каждый провайдер сам маппит input через `mapInput()` — нет дублирования
- **Testing**: each provider testable in isolation
- **Webhook**: unified parsing + chain-aware retry через `startFrom`
- **route.ts**: from 650 lines to ~50
- **ENV-флаги** (FAL_ONLY и т.п.): фильтр цепочки в `resolveChain()`, а не отдельные `if/else`
- **Queue**: no wasted retries on overloaded providers, predictable throughput

## Risks

- Must preserve all input mapping quirks per provider (каждый `mapInput()` должен точно повторять текущую логику)
- Webhook payload formats differ significantly
- Google is synchronous, others are async — interface must handle both
- FAL_ONLY env flag needs to work → реализован как фильтр в `resolveChain()`
- Queue adds latency for waiting requests — need clear UX for "queued" state
- Redis — дополнительная инфраструктура, нужен мониторинг
- Migration: нужно аккуратно перевести все модели с `provider`/`fallbackModel`/`falFallbackModel` на `providers[]`