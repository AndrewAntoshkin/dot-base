# API Examples

Примеры использования API endpoints для .base

## 🔑 Авторизация

Все защищенные endpoints требуют авторизацию через Supabase.

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
```

---

## 📋 Получить список моделей

### Request

```bash
GET /api/models/list
```

#### Query параметры:
- `action` (optional) - фильтр по действию: `create`, `edit`, `upscale`, `remove_bg`

### Examples

**Все модели:**
```bash
curl http://localhost:3000/api/models/list
```

**Только модели для создания:**
```bash
curl http://localhost:3000/api/models/list?action=create
```

### Response

```json
{
  "models": [
    {
      "id": "flux-schnell",
      "name": "flux-schnell",
      "displayName": "FLUX Schnell",
      "replicateModel": "black-forest-labs/flux-schnell",
      "action": "create",
      "runs": "541.6m runs",
      "description": "Быстрая модель FLUX для локальной разработки",
      "settings": [
        {
          "name": "prompt",
          "label": "Prompt",
          "type": "textarea",
          "required": true
        }
      ]
    }
  ]
}
```

---

## ✨ Создать генерацию

### Request

```bash
POST /api/generations/create
Content-Type: application/json
```

### Body

```json
{
  "action": "create",
  "model_id": "flux-schnell",
  "prompt": "A beautiful sunset over mountains",
  "settings": {
    "aspect_ratio": "16:9",
    "num_outputs": 1,
    "output_format": "webp",
    "output_quality": 80
  }
}
```

### Examples

**JavaScript/TypeScript:**
```typescript
const response = await fetch('/api/generations/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'create',
    model_id: 'flux-schnell',
    prompt: 'A serene mountain landscape at sunset',
    settings: {
      aspect_ratio: '16:9',
      num_outputs: 1,
      output_format: 'webp',
      output_quality: 80
    }
  })
});

const data = await response.json();
console.log('Generation ID:', data.id);
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/generations/create \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "model_id": "flux-schnell",
    "prompt": "A beautiful sunset over mountains",
    "settings": {
      "aspect_ratio": "16:9",
      "num_outputs": 1
    }
  }'
```

**Python:**
```python
import requests

response = requests.post(
    'http://localhost:3000/api/generations/create',
    json={
        'action': 'create',
        'model_id': 'flux-schnell',
        'prompt': 'A beautiful sunset over mountains',
        'settings': {
            'aspect_ratio': '16:9',
            'num_outputs': 1
        }
    }
)

data = response.json()
print(f"Generation ID: {data['id']}")
```

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prediction_id": "abc123def456",
  "status": "processing"
}
```

---

## 📊 Получить статус генерации

### Request

```bash
GET /api/generations/{id}
```

### Example

```bash
curl http://localhost:3000/api/generations/550e8400-e29b-41d4-a716-446655440000
```

**JavaScript:**
```typescript
const generationId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch(`/api/generations/${generationId}`);
const generation = await response.json();

console.log('Status:', generation.status);
if (generation.status === 'completed') {
  console.log('Output URLs:', generation.output_urls);
}
```

### Response (Processing)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-uuid",
  "action": "create",
  "model_id": "flux-schnell",
  "model_name": "flux-schnell",
  "prompt": "A beautiful sunset over mountains",
  "status": "processing",
  "output_urls": null,
  "created_at": "2025-11-24T10:00:00Z"
}
```

### Response (Completed)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output_urls": [
    "https://replicate.delivery/pbxt/abc123.png"
  ],
  "processing_time_ms": 5230,
  "created_at": "2025-11-24T10:00:00Z",
  "completed_at": "2025-11-24T10:00:05Z"
}
```

---

## 📜 Получить список генераций

### Request

```bash
GET /api/generations/list
```

#### Query параметры:
- `page` (default: 1) - номер страницы
- `limit` (default: 20) - количество на странице
- `action` (optional) - фильтр по действию
- `status` (optional) - фильтр по статусу

### Examples

**Первая страница (20 генераций):**
```bash
curl http://localhost:3000/api/generations/list
```

**Вторая страница:**
```bash
curl http://localhost:3000/api/generations/list?page=2
```

**Только завершенные:**
```bash
curl http://localhost:3000/api/generations/list?status=completed
```

**Только создание изображений:**
```bash
curl http://localhost:3000/api/generations/list?action=create
```

**JavaScript:**
```typescript
async function fetchGenerations(page = 1, action?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(action && { action })
  });

  const response = await fetch(`/api/generations/list?${params}`);
  const data = await response.json();

  return data;
}

// Использование
const result = await fetchGenerations(1, 'create');
console.log(`Всего: ${result.total}`);
console.log(`Страниц: ${result.totalPages}`);
result.generations.forEach(gen => {
  console.log(`${gen.id}: ${gen.status}`);
});
```

### Response

```json
{
  "generations": [
    {
      "id": "uuid-1",
      "action": "create",
      "model_name": "flux-schnell",
      "status": "completed",
      "output_urls": ["https://..."],
      "prompt": "...",
      "created_at": "2025-11-24T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## 🗑️ Удалить/отменить генерацию

### Request

```bash
DELETE /api/generations/{id}
```

### Example

```bash
curl -X DELETE http://localhost:3000/api/generations/550e8400-e29b-41d4-a716-446655440000
```

**JavaScript:**
```typescript
async function deleteGeneration(id: string) {
  const response = await fetch(`/api/generations/${id}`, {
    method: 'DELETE'
  });

  if (response.ok) {
    console.log('Generation deleted');
  }
}
```

### Response

```json
{
  "success": true
}
```

---

## 🔔 Webhook от Replicate

Этот endpoint вызывается Replicate при завершении генерации.

### Request

```bash
POST /api/webhook/replicate
Content-Type: application/json
```

### Body (от Replicate)

```json
{
  "id": "prediction-id",
  "status": "succeeded",
  "output": ["https://replicate.delivery/..."],
  "metrics": {
    "predict_time": 5.23
  }
}
```

### Example настройки webhook в Replicate

```typescript
const prediction = await replicate.predictions.create({
  model: "black-forest-labs/flux-schnell",
  input: { prompt: "..." },
  webhook: "https://your-app.vercel.app/api/webhook/replicate",
  webhook_events_filter: ["completed"]
});
```

---

## 🎨 Примеры использования разных моделей

### 1. Создать изображение (FLUX Schnell)

```typescript
const response = await fetch('/api/generations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    model_id: 'flux-schnell',
    prompt: 'A futuristic city at night with neon lights',
    settings: {
      aspect_ratio: '16:9',
      num_outputs: 2,
      output_format: 'webp',
      output_quality: 90
    }
  })
});
```

### 2. Улучшить качество (Real-ESRGAN)

```typescript
const response = await fetch('/api/generations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'upscale',
    model_id: 'real-esrgan',
    input_image_url: 'https://your-image-url.jpg',
    settings: {
      scale: 4,
      face_enhance: true
    }
  })
});
```

### 3. Редактировать (Nano Banana)

```typescript
const response = await fetch('/api/generations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'edit',
    model_id: 'nano-banana-edit',
    prompt: 'Change the sky to sunset colors',
    input_image_url: 'https://your-image-url.jpg',
    settings: {}
  })
});
```

### 4. Удалить фон (BiRefNet)

```typescript
const response = await fetch('/api/generations/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'remove_bg',
    model_id: 'birefnet',
    input_image_url: 'https://your-image-url.jpg',
    settings: {}
  })
});
```

---

## 🔄 Polling для получения результата

```typescript
async function waitForGeneration(id: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/generations/${id}`);
    const generation = await response.json();

    if (generation.status === 'completed') {
      return generation;
    }

    if (generation.status === 'failed') {
      throw new Error(generation.error_message);
    }

    // Ждем 2 секунды перед следующей проверкой
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Timeout waiting for generation');
}

// Использование
const generation = await waitForGeneration(generationId);
console.log('Output:', generation.output_urls);
```

---

## 📊 Статистика токенов (только admin)

Доступ через SQL или Supabase Dashboard:

```sql
-- Статистика использования токенов
SELECT 
  id,
  is_active,
  request_count,
  error_count,
  last_used_at,
  ROUND(error_count::numeric / NULLIF(request_count, 0) * 100, 2) as error_rate_percent
FROM replicate_tokens
ORDER BY request_count DESC;

-- Общая статистика
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  SUM(request_count) as total_requests,
  SUM(error_count) as total_errors
FROM replicate_tokens;
```

---

## 🔐 Telegram авторизация

### Request

```bash
POST /api/auth/telegram
Content-Type: application/json
```

### Body

```json
{
  "initData": "query_id=...&user=...&hash=..."
}
```

Это данные от Telegram Web App.

### Response

```json
{
  "user": {
    "id": "user-uuid",
    "telegram_username": "username",
    "telegram_first_name": "Name",
    "credits": 100
  },
  "session_token": "token"
}
```

---

## ⚠️ Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request - неверные параметры |
| 401 | Unauthorized - требуется авторизация |
| 402 | Payment Required - недостаточно кредитов |
| 403 | Forbidden - доступ запрещен |
| 404 | Not Found - ресурс не найден |
| 500 | Internal Server Error - ошибка сервера |

---

## 🧪 Тестирование API

Используйте Postman, Insomnia или curl для тестирования endpoints.

### Postman Collection

Импортируйте эти примеры в Postman для быстрого тестирования.

---

**Обновлено:** 24.11.2025  
**Версия:** 0.1.0








