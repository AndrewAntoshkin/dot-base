# Provider Request Queue

## Стек

- **Redis** — уже есть на сервере
- **ioredis** — клиент для Node.js
- **PM2** — запуск нескольких воркеров (`pm2 start worker.js -i N`)

## Архитектура

```
Client → POST /api/generations/create
  → auth, validation, limits
  → создаёт generation (status: queued)
  → RPUSH generation:queue {generationId, modelId, input}
  → return {id, status: queued}

Worker (PM2 × N инстансов):
  → BRPOP generation:queue (блокирующее ожидание)
  → generate(model, input) — внутри сам проходит по цепочке провайдеров
    → Replicate fail → Google fail → Fal OK → return result
  → update generation (status: processing/completed)
  → BRPOP следующий job

Webhook:
  → success → status: completed, reportSuccess(provider)
  → fail → reportError(provider), generation status: failed
```

Fallback по цепочке происходит **внутри воркера за одну итерацию** — `generate()` сам перебирает провайдеров. Job не возвращается в очередь при ошибке провайдера, вместо этого воркер пробует следующего в цепочке.

Re-enqueue только если **все провайдеры заняты/горячие** (pickProvider вернул null для всех) — тогда job возвращается в конец очереди и ждёт.

## Воркеры

Каждый воркер — один job за раз (BRPOP → submit → BRPOP). Redis сам распределяет jobs между воркерами — один job попадает ровно одному воркеру.

```bash
pm2 start worker.js -i 5 --name "gen-worker"
```

Для async провайдеров (Replicate, Fal, Higgsfield) submit занимает 1-3 сек — воркер быстро освобождается.

Количество PM2 инстансов = максимум одновременных submit'ов. Подбирается под нагрузку.

## Очередь

**FIFO** — одна очередь `generation:queue`, без приоритетов. Первый пришёл — первый обработан.

## Job формат

```typescript
interface QueueJob {
  generationId: string;
  modelId: string;
  input: Record<string, any>;
  userId: string;
}
```

## Dispatcher: выбор провайдера

`pickProvider(chain)` перебирает цепочку и возвращает первый провайдер, который:
1. Не превысил `maxConcurrent` (активные запросы)
2. Не превысил `rpm` (запросы в минуту)
3. Остыл после последней ошибки (`cooldownMs`)

Если все провайдеры заняты/горячие — job возвращается в конец очереди (RPUSH) и будет обработан позже.

### Cooldown

Провайдер помечается "горячим" после ошибки. Cooldown увеличивается с количеством подряд ошибок:

```
1 ошибка  → 10 сек
2 подряд  → 30 сек
3 подряд  → 60 сек
4+ подряд → 120 сек
```

> **TODO**: подобрать оптимальные значения cooldown на практике.

При успехе — cooldown и счётчик ошибок сбрасываются.

### Redis Keys

```
generation:queue                  — LIST, FIFO очередь jobs
provider:{name}:active            — INT, INCR при submit / DECR при complete|fail
provider:{name}:rpm               — INT с TTL 60s, запросы за текущую минуту
provider:{name}:lastError         — STRING (timestamp ms), когда была последняя ошибка
provider:{name}:errors            — INT с TTL 600s, подряд ошибок
```

## Лимиты провайдеров

> **TODO**: проверить актуальные лимиты каждого провайдера.

```typescript
export const PROVIDER_LIMITS = {
  google: {
    maxConcurrent: ?,    // TODO: проверить
    rpm: ?,              // TODO: проверить
    cooldownMs: 10_000,
  },
  replicate: {
    maxConcurrent: ?,    // TODO: проверить (зависит от количества токенов в пуле)
    rpm: undefined,      // RPM управляется пулом токенов
    cooldownMs: 10_000,
  },
  fal: {
    maxConcurrent: ?,    // TODO: проверить
    rpm: ?,              // TODO: проверить
    cooldownMs: 10_000,
  },
  higgsfield: {
    maxConcurrent: ?,    // TODO: проверить
    rpm: undefined,
    cooldownMs: 10_000,
  },
};
```

## Цикл при ошибке

Fallback происходит внутри `generate()` за одну итерацию воркера:

```
Worker берёт job из очереди
  → generate(model, input):
    → try Replicate → submit fail
    → try Google → submit fail
    → try Fal → submit OK → return AsyncResult
  → update generation (status: processing)
  → BRPOP следующий job
```

Если **все провайдеры в цепочке упали** при submit — generation помечается `failed`.

Если **все провайдеры заняты/горячие** (dispatcher отклонил всех до submit) — job возвращается в конец очереди (RPUSH) и будет обработан позже, когда кто-то остынет.

### Webhook fail

Когда провайдер вернул ошибку через webhook (async fail после submit):
- `reportError(provider)` — помечает горячим
- generation → `failed`
- Клиент видит ошибку и может retry вручную (создаёт новый запрос)

## Клиент (фронт)

Статусы: `pending → queued → processing → completed/failed`

- `queued` — "В очереди..." с спиннером
- `processing` — "Генерация..." с спиннером

## Файлы

```
lib/redis/client.ts           — ioredis singleton
lib/providers/dispatcher.ts   — pickProvider, reportSuccess, reportError
lib/providers/limits.ts       — PROVIDER_LIMITS конфиг
lib/providers/worker.ts       — QueueWorker (BRPOP loop)
worker.js                     — entrypoint для PM2
```

## Миграция

1. Добавить `ioredis` зависимость
2. Создать `lib/redis/client.ts` — singleton подключение
3. Создать `lib/providers/limits.ts` — лимиты (после проверки)
4. Создать `lib/providers/dispatcher.ts` — pickProvider + reportSuccess/reportError
5. Создать `lib/providers/worker.ts` — BRPOP loop
6. Создать `worker.js` — PM2 entrypoint
7. В `create/route.ts`: вместо `generate()` — RPUSH в очередь, return `{status: queued}`
8. В webhook handlers: при ошибке — reportError(provider)
9. На фронте: обработка `status: queued`
10. PM2 ecosystem: добавить воркеры
