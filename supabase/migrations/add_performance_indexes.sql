-- Performance indexes migration
-- Оптимизация запросов для высокой нагрузки

-- ===========================================
-- 1. Composite index для list с фильтрами
-- Покрывает запрос: SELECT ... WHERE user_id = X ORDER BY created_at DESC
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_user_created 
  ON generations(user_id, created_at DESC);

-- ===========================================
-- 2. Partial index для активных генераций
-- Оптимизирует polling запросы (проверка статуса)
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_active 
  ON generations(user_id, created_at DESC) 
  WHERE status IN ('pending', 'processing');

-- ===========================================
-- 3. Index для непросмотренных генераций
-- Оптимизирует подсчёт badge
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_unviewed 
  ON generations(user_id) 
  WHERE viewed = false;

-- ===========================================
-- 4. Composite index для list с фильтром по статусу
-- Покрывает: SELECT ... WHERE user_id = X AND status = Y
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_user_status 
  ON generations(user_id, status);

-- ===========================================
-- 5. Index для webhook lookup по prediction_id
-- Уже есть idx_generations_prediction_id, проверяем
-- ===========================================
-- CREATE INDEX IF NOT EXISTS idx_generations_prediction_id 
--   ON generations(replicate_prediction_id);

-- ===========================================
-- 6. Optimize get_next_replicate_token function
-- Использует FOR UPDATE SKIP LOCKED для concurrency
-- ===========================================
CREATE OR REPLACE FUNCTION get_next_replicate_token()
RETURNS TABLE(id INTEGER, token TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE replicate_tokens rt
  SET 
    last_used_at = NOW(),
    request_count = rt.request_count + 1
  WHERE rt.id = (
    SELECT rt2.id
    FROM replicate_tokens rt2
    WHERE rt2.is_active = true
    ORDER BY 
      COALESCE(rt2.last_used_at, '1970-01-01'::timestamp) ASC,
      rt2.request_count ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING rt.id, rt.token;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 7. Add index for token selection
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_replicate_tokens_selection 
  ON replicate_tokens(is_active, last_used_at ASC, request_count ASC)
  WHERE is_active = true;

-- ===========================================
-- ANALYZE tables for query planner
-- ===========================================
ANALYZE generations;
ANALYZE replicate_tokens;

-- ===========================================
-- Statistics: verify indexes created
-- ===========================================
-- SELECT 
--   indexname, 
--   indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('generations', 'replicate_tokens');










