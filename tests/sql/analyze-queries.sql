-- =============================================================================
-- АНАЛИЗ ПРОИЗВОДИТЕЛЬНОСТИ SQL ЗАПРОСОВ
-- =============================================================================
-- Запускать в Supabase SQL Editor или через psql
-- =============================================================================

-- 1. ПРОВЕРКА СУЩЕСТВУЮЩИХ ИНДЕКСОВ
-- =============================================================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 2. РАЗМЕР ТАБЛИЦ И ИНДЕКСОВ
-- =============================================================================
SELECT 
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_size_pretty(pg_indexes_size(relid)) as indexes_size,
    n_live_tup as row_count
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(relid) DESC;

-- 3. АНАЛИЗ ИСПОЛЬЗОВАНИЯ ИНДЕКСОВ
-- =============================================================================
SELECT 
    schemaname,
    relname as table_name,
    indexrelname as index_name,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 4. НЕИСПОЛЬЗУЕМЫЕ ИНДЕКСЫ (потенциально лишние)
-- =============================================================================
SELECT 
    schemaname || '.' || relname as table,
    indexrelname as index,
    pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
    idx_scan as index_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique  -- исключаем уникальные индексы
AND idx_scan < 50  -- менее 50 использований
ORDER BY pg_relation_size(i.indexrelid) DESC;

-- 5. EXPLAIN ANALYZE ДЛЯ ТИПИЧНЫХ ЗАПРОСОВ
-- =============================================================================

-- 5.1 Получение генераций пользователя (основной запрос)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, status, output_urls, prompt, model_id, model_name, action, created_at, viewed, is_favorite
FROM generations
WHERE user_id = (SELECT id FROM users LIMIT 1)
  AND is_keyframe_segment IS NOT TRUE
ORDER BY created_at DESC
LIMIT 20;

-- 5.2 Подсчёт генераций по статусам
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT 
    COUNT(*) FILTER (WHERE TRUE) as all_count,
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as processing_count,
    COUNT(*) FILTER (WHERE is_favorite = true) as favorites_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM generations
WHERE user_id = (SELECT id FROM users LIMIT 1)
  AND is_keyframe_segment IS NOT TRUE;

-- 5.3 Поиск по workspace
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, status, prompt, model_name, created_at
FROM generations
WHERE workspace_id = (SELECT id FROM workspaces LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- 6. ПРОВЕРКА BLOAT (раздутие таблиц)
-- =============================================================================
SELECT 
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    CASE WHEN n_live_tup > 0 
         THEN round(100.0 * n_dead_tup / n_live_tup, 2) 
         ELSE 0 
    END as dead_ratio_percent,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;

-- 7. МЕДЛЕННЫЕ ЗАПРОСЫ (если pg_stat_statements включен)
-- =============================================================================
-- SELECT 
--     query,
--     calls,
--     total_time / 1000 as total_seconds,
--     mean_time as avg_ms,
--     rows
-- FROM pg_stat_statements
-- ORDER BY total_time DESC
-- LIMIT 20;

-- 8. РЕКОМЕНДУЕМЫЕ ИНДЕКСЫ ДЛЯ GENERATIONS
-- =============================================================================
-- Проверяем есть ли нужные индексы:

-- Основной индекс для списка генераций
-- CREATE INDEX IF NOT EXISTS idx_generations_user_created 
-- ON generations(user_id, created_at DESC) 
-- WHERE is_keyframe_segment IS NOT TRUE;

-- Индекс для фильтрации по статусу
-- CREATE INDEX IF NOT EXISTS idx_generations_user_status 
-- ON generations(user_id, status) 
-- WHERE is_keyframe_segment IS NOT TRUE;

-- Индекс для workspace запросов
-- CREATE INDEX IF NOT EXISTS idx_generations_workspace_created 
-- ON generations(workspace_id, created_at DESC) 
-- WHERE workspace_id IS NOT NULL;

-- Индекс для избранного
-- CREATE INDEX IF NOT EXISTS idx_generations_favorites 
-- ON generations(user_id, is_favorite) 
-- WHERE is_favorite = true;

-- 9. ПРОВЕРКА RLS ПОЛИТИК
-- =============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. СТАТИСТИКА СОЕДИНЕНИЙ
-- =============================================================================
SELECT 
    datname,
    numbackends as connections,
    xact_commit as commits,
    xact_rollback as rollbacks,
    blks_read,
    blks_hit,
    CASE WHEN blks_hit + blks_read > 0 
         THEN round(100.0 * blks_hit / (blks_hit + blks_read), 2) 
         ELSE 0 
    END as cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();

