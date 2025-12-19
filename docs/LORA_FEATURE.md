# LoRA Feature Documentation

## Описание

LoRA (Low-Rank Adaptation) - функционал для обучения пользовательских моделей на основе референсных изображений.

## Архитектура

### Database Schema

**Таблица `user_loras`:**
```sql
CREATE TABLE user_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'style',
  trigger_word TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  lora_url TEXT,
  replicate_training_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'training', 'completed', 'failed'))
);
```

**Таблица `lora_training_images`:**
```sql
CREATE TABLE lora_training_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lora_id UUID REFERENCES user_loras(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Buckets

- **lora-training-images**: Загруженные референсные изображения (max 15)
- **lora-models**: Обученные веса модели (до 500MB)

### API Endpoints

- `GET /api/loras` - Список LoRA моделей пользователя
- `POST /api/loras` - Создание и начало обучения новой LoRA
- `GET /api/loras/[id]` - Детали конкретной LoRA
- `DELETE /api/loras/[id]` - Soft delete LoRA
- `POST /api/loras/[id]/retry` - Повторное обучение после ошибки
- `POST /api/webhook/replicate-training` - Webhook от Replicate для обновления статуса

### UI Components

- `/app/lora/page.tsx` - Страница управления LoRA
- `/components/lora/lora-create-modal.tsx` - Модалка создания LoRA
- `/components/lora/lora-detail-modal.tsx` - Детальный просмотр LoRA
- `/components/lora/lora-info-modal.tsx` - Правила и инструкции
- `/components/lora/lora-training-modal.tsx` - Процесс обучения
- `/components/pages/lora-page-client.tsx` - Клиентский компонент страницы

### Integration

**В `home-page-client.tsx`:**
- Загрузка LoRA из URL параметра `?lora=id`
- Инъекция trigger_word в промпт
- Передача lora_id и lora_url в API генерации

**В `model-selector.tsx`:**
- Отображение пользовательских LoRA в dropdown
- Префикс `lora:` для идентификации

**В `/api/generations/create/route.ts`:**
- Автоматический override модели на `black-forest-labs/flux-dev-lora`
- Передача `lora_weights` параметра

## Replicate Integration

### Training API

```typescript
POST https://api.replicate.com/v1/models/{owner}/{name}/versions/{version}/trainings

Body:
{
  input: {
    input_images: "https://...",  // ZIP архив с изображениями
    steps: 1000,
    lora_rank: 16,
    optimizer: "adamw8bit",
    batch_size: 1,
    resolution: "512,768,1024",
    autocaption: true,
    trigger_word: "TOK"
  },
  webhook: "https://your-domain.com/api/webhook/replicate-training"
}
```

### Generation with LoRA

```typescript
POST https://api.replicate.com/v1/models/black-forest-labs/flux-dev-lora/predictions

Body:
{
  input: {
    prompt: "photo of TOK character",
    lora_weights: "fofr/flux-pixar",  // HuggingFace LoRA или URL
    lora_scale: 1.0,
    num_outputs: 1,
    aspect_ratio: "1:1",
    output_format: "png",
    guidance_scale: 3.5,
    num_inference_steps: 28
  }
}
```

## UI/UX Flow

### 1. Создание LoRA
1. Клик "Создать LoRA" → открывается модалка
2. Выбор типа (Style/Character/Product)
3. Загрузка референсов (4-15 изображений, max 10MB)
4. Настройка: название, описание, trigger word
5. Выбор модели для обучения
6. Клик "Начать обучение"

### 2. Обучение
1. Загрузка изображений в Supabase Storage
2. Создание ZIP архива (server-side)
3. Отправка запроса в Replicate Training API
4. Webhook уведомления о прогрессе
5. Сохранение обученных весов

### 3. Использование
1. Страница LoRA → клик "Использовать"
2. Переход на главную с `?lora=id`
3. LoRA автоматически выбирается
4. Trigger word добавляется в промпт
5. При генерации используется flux-dev-lora модель

## Design (Figma Links)

- Старт: https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=640-4739
- Правила: https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=641-5702
- Создание (шаг 1): https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=640-5022
- Создание (шаг 2): https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=640-5358
- Обработка: https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=642-6302
- Просмотр моделей: https://www.figma.com/design/KlSh5ZEnrBxngWrQBu8Yv8/BASE?node-id=641-5592

## Environment Variables

```env
REPLICATE_USERNAME=your-username  # Для создания моделей в Replicate
```

## Features Implemented

- [x] Database schema (user_loras, lora_training_images)
- [x] Storage buckets setup
- [x] API endpoints (CRUD operations)
- [x] Webhook для обновления статуса обучения
- [x] UI компоненты (модалки, карточки)
- [x] Интеграция в generation flow
- [x] Автокэпшенинг изображений
- [x] Soft delete
- [x] Private visibility (только владелец видит)
- [x] Retry механизм для failed trainings
- [x] Симуляция обучения для локальной разработки

## TODO для будущей реализации

- [ ] Push уведомления о завершении обучения
- [ ] Pricing/credits для LoRA обучения
- [ ] Управление несколькими версиями одной LoRA
- [ ] Marketplace/sharing LoRA моделей
- [ ] Advanced settings для обучения
- [ ] Preview генерации во время обучения
- [ ] Batch операции (удаление, экспорт)

## Files to Restore

При возврате функционала нужно восстановить:

### API Routes
- `/app/api/loras/route.ts`
- `/app/api/loras/[id]/route.ts`
- `/app/api/loras/[id]/retry/route.ts`
- `/app/api/webhook/replicate-training/route.ts`

### Pages
- `/app/lora/page.tsx`

### Components
- `/components/lora/lora-create-modal.tsx`
- `/components/lora/lora-detail-modal.tsx`
- `/components/lora/lora-info-modal.tsx`
- `/components/lora/lora-training-modal.tsx`
- `/components/lora/index.ts`
- `/components/pages/lora-page-client.tsx`

### Database
- `/supabase/migrations/add_lora_support.sql`
- `/supabase/setup-lora-storage.sql`

### Types
- Добавить `lora_url`, `lora_id` в generation settings
- `LoraListItem` интерфейс в types.ts

### Integration Points
- Header navigation (добавить LORA ссылку)
- home-page-client.tsx (LoRA selection и prompt injection)
- model-selector.tsx (отображение LoRA в dropdown)
- /api/generations/create/route.ts (LoRA параметры в generation)

## Notes

- Локальное тестирование использует `fofr/flux-pixar` как тестовую LoRA
- Без `REPLICATE_USERNAME` используется симуляция обучения
- Training занимает ~20-30 минут в Replicate
- Max 15 изображений для обучения (оптимально 10-12)
