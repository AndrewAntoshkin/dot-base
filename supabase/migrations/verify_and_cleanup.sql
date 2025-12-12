-- ===========================================
-- Скрипт проверки и очистки БД
-- Запустить после fix_performance_issues.sql
-- ===========================================

-- 1. Проверка созданных индексов
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'generations'
ORDER BY indexname;

-- 2. Проверка функции get_generation_counts
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_generation_counts';

-- 3. Статистика по генерациям
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_keyframe_segment = true) as keyframe_segments,
  COUNT(*) FILTER (WHERE is_keyframe_segment IS NOT TRUE) as visible
FROM generations
GROUP BY status
ORDER BY status;

-- 4. Проверка дублей is_keyframe_segment
SELECT 
  is_keyframe_segment,
  COUNT(*) as count
FROM generations
GROUP BY is_keyframe_segment;

-- 5. Топ пользователей по количеству генераций
SELECT 
  user_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as processing
FROM generations
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;

-- ===========================================
-- 6. Очистка зависших генераций (старше 1 часа в processing)
-- ВНИМАНИЕ: Раскомментируйте для выполнения
-- ===========================================
-- UPDATE generations
-- SET 
--   status = 'failed',
--   error_message = 'Таймаут: генерация не завершилась вовремя'
-- WHERE status IN ('pending', 'processing')
--   AND created_at < NOW() - INTERVAL '1 hour';

-- ===========================================
-- 7. Удаление очень старых неудачных генераций (старше 30 дней)
-- ВНИМАНИЕ: Раскомментируйте для выполнения
-- ===========================================
-- DELETE FROM generations
-- WHERE status = 'failed'
--   AND created_at < NOW() - INTERVAL '30 days';

-- ===========================================
-- 8. Проверка размера таблицы
-- ===========================================
SELECT 
  pg_size_pretty(pg_total_relation_size('generations')) as total_size,
  pg_size_pretty(pg_relation_size('generations')) as table_size,
  pg_size_pretty(pg_indexes_size('generations')) as indexes_size;

-- ===========================================
-- 9. Тест производительности запроса counts
-- ===========================================
EXPLAIN ANALYZE
SELECT 
  COUNT(*) FILTER (WHERE is_keyframe_segment IS NOT TRUE) as all_count,
  COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND is_keyframe_segment IS NOT TRUE) as processing_count,
  COUNT(*) FILTER (WHERE is_favorite = true AND is_keyframe_segment IS NOT TRUE) as favorites_count,
  COUNT(*) FILTER (WHERE status = 'failed' AND is_keyframe_segment IS NOT TRUE) as failed_count
FROM generations
WHERE user_id = (SELECT id FROM users LIMIT 1);
