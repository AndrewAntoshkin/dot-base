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

## Benefits

- Add new provider: 1 file + model config entry
- Fallback: declarative, per-model, no code changes
- Testing: each provider testable in isolation
- Webhook: unified parsing, less duplication
- route.ts: from 650 lines to ~50

## Risks

- Must preserve all input mapping quirks per provider
- Webhook payload formats differ significantly
- Google is synchronous, others are async — interface must handle both
- FAL_ONLY env flag needs to work (filter provider chain at runtime)