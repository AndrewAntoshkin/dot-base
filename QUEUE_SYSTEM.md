# Система очередей генераций

## Обзор

Система управляет очередью генераций, используя Token Pool Manager для распределения запросов между множеством API токенов Replicate.

## Архитектура

```
┌──────────────────────────────────────────┐
│      GenerationsContext                  │
│  (глобальное состояние)                  │
│  - generations[]                         │
│  - activeCount                           │
│  - addGeneration()                       │
└────┬─────────────────────────┬───────────┘
     │                         │
     ↓                         ↓
┌─────────────┐          ┌──────────┐
│   Header    │          │   Page   │
│  (⟳ 3)      │          │ (Create) │
└──────┬──────┘          └────┬─────┘
       │ click                │
       ↓                      │ new generation
┌─────────────┐               ↓
│  Dropdown   │ ← addGeneration() (мгновенно!)
│   Queue     │ ← Также polling каждые 3с
└──────┬──────┘
       │ click
       ↓
┌─────────────┐
│   Result    │
│    Page     │
└─────────────┘
```

## Компоненты

### 1. GenerationsContext (`contexts/generations-context.tsx`)
**Глобальное состояние для управления генерациями**

```typescript
interface GenerationsContextType {
  generations: Generation[];      // Список всех генераций
  activeCount: number;            // Количество активных (pending/processing)
  addGeneration: (g) => void;     // Добавить новую (вызывается сразу при создании)
  refreshGenerations: () => void; // Обновить из API
}
```

**Особенности:**
- ✅ Мгновенное обновление при создании новой генерации
- ✅ Автоматический polling каждые 3 секунды
- ✅ Синхронизация между Header и Page
- ✅ Оптимистичные обновления (optimistic updates)

### 2. Header (`components/header.tsx`)
- Отображает индикатор `⟳ N` с количеством активных генераций
- Использует `useGenerations()` hook
- При клике открывает dropdown
- **Мгновенно обновляется** при создании новой генерации

### 3. GenerationsQueue (`components/generations-queue.tsx`)
- Dropdown с последними 5 генерациями
- Использует `useGenerations()` hook
- Показывает статусы:
  - `pending` / `processing` → spinner (⟳)
  - `completed` → галочка (✓)
  - `failed` → крестик (✗)
- Клик по элементу → переход к `/result/[id]`

### 4. Token Pool Manager (`lib/replicate/token-pool.ts`)
- Управляет 10 токенами Replicate API
- Round-robin распределение запросов
- Отслеживание ошибок для каждого токена
- Автоматический retry при ошибках

## Статусы генераций

| Статус | Описание | Иконка |
|--------|----------|--------|
| `pending` | В очереди, ожидает запуска | ⟳ (spinner) |
| `processing` | Генерируется на Replicate | ⟳ (spinner) |
| `completed` | Успешно завершена | ✓ (галочка) |
| `failed` | Ошибка генерации | ✗ (крестик) |
| `cancelled` | Отменена пользователем | — |

## Система просмотров

### Логика работы

1. **Каунтер показывает непросмотренные** генерации (`viewed = false`)
2. **При клике** на генерацию в dropdown:
   - Генерация помечается как `viewed = true`
   - Убирается из списка dropdown
   - Пользователь переходит к результату
3. **Каунтер исчезает** когда `unviewedCount = 0`

### База данных

```sql
ALTER TABLE generations ADD COLUMN viewed BOOLEAN DEFAULT false;
ALTER TABLE generations ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE;
```

### Пример использования

```typescript
// Пометить как просмотренную
await markAsViewed(generationId);

// Получить только непросмотренные
const { unviewedGenerations } = useGenerations();

// Количество непросмотренных
const { unviewedCount } = useGenerations();
```

## API Endpoints

### GET `/api/generations/list`
Получить список генераций пользователя

**Query params:**
- `limit` (optional) - количество генераций (default: 50)

**Response:**
```json
[
  {
    "id": "uuid",
    "model_name": "FLUX Schnell",
    "status": "processing",
    "created_at": "2025-11-24T19:00:00Z",
    "output_urls": null
  }
]
```

### GET `/api/generations/[id]`
Получить информацию о конкретной генерации

**Response:**
```json
{
  "id": "uuid",
  "model_name": "FLUX Schnell",
  "status": "completed",
  "output_urls": ["https://..."],
  "prompt": "утро в лесу",
  "settings": { "aspect_ratio": "1:1" }
}
```

## Polling стратегия

### Header polling
```typescript
useEffect(() => {
  const fetchActiveCount = async () => {
    const response = await fetch('/api/generations/list?limit=50');
    const data = await response.json();
    const active = data.filter(g => 
      g.status === 'pending' || g.status === 'processing'
    ).length;
    setActiveCount(active);
  };

  fetchActiveCount();
  const interval = setInterval(fetchActiveCount, 3000);
  return () => clearInterval(interval);
}, []);
```

### OutputPanel polling
```typescript
useEffect(() => {
  if (status === 'processing' || status === 'pending') {
    setTimeout(fetchGeneration, 2000);
  }
}, [generation]);
```

## Token Pool Management

Token Pool Manager автоматически распределяет запросы:

```sql
-- Функция выбирает наименее используемый токен
CREATE FUNCTION get_next_replicate_token()
RETURNS TABLE(id INTEGER, token TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE replicate_tokens
  SET 
    last_used_at = NOW(),
    request_count = request_count + 1
  WHERE replicate_tokens.id = (
    SELECT replicate_tokens.id
    FROM replicate_tokens
    WHERE is_active = true
    ORDER BY 
      COALESCE(last_used_at, '1970-01-01'::timestamp) ASC,
      request_count ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING replicate_tokens.id, replicate_tokens.token;
END;
$$ LANGUAGE plpgsql;
```

## Оптимизация

### Кэширование
- Результаты генераций кэшируются в Supabase
- Polling только для активных генераций
- Автоматическая остановка polling при завершении

### Масштабирование
- 10 токенов Replicate = 10 параллельных запросов
- Round-robin балансировка нагрузки
- Retry при ошибках с другим токеном

## Как это работает

### Сценарий 1: Создание новой генерации

```typescript
// 1. Пользователь нажимает "Создать"
// 2. SettingsForm отправляет POST /api/generations/create
const response = await fetch('/api/generations/create', { ... });
const result = await response.json();

// 3. Вызывается callback с результатом
onGenerationCreated(result.id, result);

// 4. Page.tsx добавляет в глобальный контекст (мгновенно!)
addGeneration({
  id: result.id,
  model_name: result.model_name,
  status: 'pending',
  created_at: result.created_at,
});

// 5. Header автоматически видит новую генерацию
// activeCount: 2 → 3 (мгновенно!)
// ⟳ 3 появляется в Header

// 6. Polling продолжает обновлять статусы каждые 3 секунды
```

### Сценарий 2: Открытие dropdown

```typescript
// 1. Пользователь кликает на ⟳ 3
setIsQueueOpen(true);

// 2. GenerationsQueue отображается
// Берет данные из useGenerations() (уже загружены!)

// 3. Показывает последние 5 генераций с иконками статусов

// 4. Клик по генерации → router.push(`/result/${id}`)
```

## Будущие улучшения

- [ ] WebSocket для real-time обновлений (вместо polling)
- [ ] BullMQ + Redis для управления очередями
- [ ] Приоритизация генераций
- [ ] Batch обработка
- [ ] Уведомления в Telegram при завершении

