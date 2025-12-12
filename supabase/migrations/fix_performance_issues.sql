-- ===========================================
-- Миграция для исправления проблем производительности
-- Запустить в Supabase Dashboard -> SQL Editor
-- ===========================================

-- 1. Удаление дублирующего поля viewed (если есть ошибка)
-- PostgreSQL не позволит создать дубликат, но на всякий случай проверяем
-- DO $$ 
-- BEGIN
--   -- Это просто комментарий - дубликат в schema.sql нужно удалить вручную
-- END $$;

-- ===========================================
-- 2. Оптимизированные индексы для фильтрации keyframe
-- Заменяем OR условие на NOT TRUE для лучшей индексации
-- ===========================================

-- Удаляем старый индекс если есть
DROP INDEX IF EXISTS idx_generations_keyframe_segment;

-- Создаём новый partial index с условием NOT TRUE
-- Это покрывает случаи: is_keyframe_segment = false OR is_keyframe_segment IS NULL
CREATE INDEX IF NOT EXISTS idx_generations_user_not_keyframe 
  ON generations(user_id, created_at DESC) 
  WHERE is_keyframe_segment IS NOT TRUE;

-- ===========================================
-- 3. Составные индексы для каждого таба с учётом keyframe
-- ===========================================

-- Индекс для таба "processing" 
DROP INDEX IF EXISTS idx_generations_active;
CREATE INDEX IF NOT EXISTS idx_generations_user_processing 
  ON generations(user_id, created_at DESC) 
  WHERE status IN ('pending', 'processing') 
  AND is_keyframe_segment IS NOT TRUE;

-- Индекс для таба "favorites"
DROP INDEX IF EXISTS idx_generations_favorites;
CREATE INDEX IF NOT EXISTS idx_generations_user_favorites 
  ON generations(user_id, created_at DESC) 
  WHERE is_favorite = true 
  AND is_keyframe_segment IS NOT TRUE;

-- Индекс для таба "failed"
DROP INDEX IF EXISTS idx_generations_failed;
CREATE INDEX IF NOT EXISTS idx_generations_user_failed 
  ON generations(user_id, created_at DESC) 
  WHERE status = 'failed' 
  AND is_keyframe_segment IS NOT TRUE;

-- ===========================================
-- 4. Функция для быстрого подсчёта по табам (одним запросом)
-- ===========================================
CREATE OR REPLACE FUNCTION get_generation_counts(p_user_id UUID)
RETURNS TABLE(
  all_count BIGINT,
  processing_count BIGINT,
  favorites_count BIGINT,
  failed_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE is_keyframe_segment IS NOT TRUE) as all_count,
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND is_keyframe_segment IS NOT TRUE) as processing_count,
    COUNT(*) FILTER (WHERE is_favorite = true AND is_keyframe_segment IS NOT TRUE) as favorites_count,
    COUNT(*) FILTER (WHERE status = 'failed' AND is_keyframe_segment IS NOT TRUE) as failed_count
  FROM generations
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Даём права на выполнение функции
GRANT EXECUTE ON FUNCTION get_generation_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_generation_counts(UUID) TO service_role;

-- ===========================================
-- 5. Установка timeout для запросов (опционально)
-- Раскомментируйте если хотите увеличить timeout
-- ===========================================
-- ALTER DATABASE postgres SET statement_timeout = '10s';

-- ===========================================
-- 6. Обновление статистики для оптимизатора
-- ===========================================
ANALYZE generations;

-- ===========================================
-- 7. Проверка созданных индексов
-- ===========================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'generations';
