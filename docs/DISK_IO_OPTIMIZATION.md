# Оптимизация Disk IO для Supabase

## Проблема

Supabase прислал предупреждение о высоком использовании Disk IO Budget. Это может привести к:
- Увеличению времени ответа
- Повышению нагрузки на CPU (IO wait)
- Недоступности инстанса

## Причины высокого Disk IO

### 1. Realtime подписка без фильтрации
Каждый клиент получал ВСЕ обновления таблицы `generations`, а не только свои.

### 2. Агрессивный polling
- Было: 3 секунды при активных генерациях
- Было: 30 секунд в idle режиме

### 3. Множественные COUNT запросы
При каждом обновлении выполнялось 4 параллельных COUNT запроса.

### 4. Отсутствие агрессивного VACUUM
Таблица `generations` быстро растёт, но autovacuum не успевал.

## Внесённые изменения

### Клиентский код

#### `components/pages/history-page-client.tsx`
- ❌ Удалена realtime подписка (высокая нагрузка на WAL)
- ✅ Увеличены интервалы polling: 3s → 5s (active), 30s → 60s (idle)

#### `contexts/generations-context.tsx`
- ✅ POLLING_ACTIVE: 3s → 5s
- ✅ POLLING_IDLE: 30s → 60s
- ✅ POLLING_BACKGROUND: 60s → 120s
- ✅ POLLING_ERROR: 45s → 60s

#### `components/pages/expand-page-client.tsx`
- ✅ Polling: 2s → 3s

#### `components/pages/brainstorm-page-client.tsx`
- ✅ Polling: 2s → 3s

### База данных (миграция)

Файл: `supabase/migrations/optimize_disk_io.sql`

1. **Отключение realtime** для таблицы `generations`
2. **Новые индексы** для оптимизации запросов
3. **Оптимизация функции** `get_generation_counts`
4. **Материализованное представление** для admin stats
5. **Функция очистки** старых failed генераций
6. **Настройка autovacuum** для более агрессивной очистки

## Инструкция по применению

### Шаг 1: Применить миграцию

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `supabase/migrations/optimize_disk_io.sql`
3. Выполните скрипт

### Шаг 2: Настроить cron jobs (опционально)

В Supabase Dashboard → Database → Extensions → pg_cron:

```sql
-- Обновление admin stats каждые 5 минут
SELECT cron.schedule('refresh-admin-stats', '*/5 * * * *', 'SELECT refresh_admin_stats()');

-- Очистка старых failed генераций каждое воскресенье
SELECT cron.schedule('cleanup-old-generations', '0 3 * * 0', 'SELECT cleanup_old_generations(90)');
```

### Шаг 3: Деплой кода

```bash
git add .
git commit -m "Optimize Disk IO: reduce polling, disable realtime"
git push
```

### Шаг 4: Мониторинг

Проверьте Disk IO через несколько часов:
- [Daily Disk IO](https://supabase.com/dashboard/project/apuhcgdpgolrmdlnerxh/reports/database)
- [Hourly Disk IO](https://supabase.com/dashboard/project/apuhcgdpgolrmdlnerxh/reports/api-overview)

## Дополнительные рекомендации

### Если IO всё ещё высокий

1. **Апгрейд compute add-on** - разные тарифы имеют разный baseline IO
2. **Партиционирование таблицы** - разбить `generations` по месяцам
3. **Архивирование** - перенос старых данных в отдельное хранилище
4. **Read replicas** - для read-heavy нагрузки

### Мониторинг запросов

```sql
-- Найти медленные запросы
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

### Проверка индексов

```sql
-- Неиспользуемые индексы
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Ожидаемый результат

После применения изменений ожидается:
- Снижение Disk IO на 40-60%
- Уменьшение нагрузки на WAL (отключение realtime)
- Более равномерное использование ресурсов

## Контакты

При возникновении проблем проверьте:
1. Supabase Logs
2. Vercel Logs
3. Browser Console

---

Дата создания: 2025-12-18
