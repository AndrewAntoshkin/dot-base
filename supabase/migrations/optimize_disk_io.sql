-- ===========================================
-- Миграция для оптимизации Disk IO
-- Дата: 2025-12-18
-- Причина: Предупреждение от Supabase о высоком Disk IO
-- ===========================================

-- 1. ОПТИМИЗАЦИЯ REALTIME
-- Отключаем realtime для таблицы generations (слишком много обновлений)
-- Вместо этого будем использовать только polling
-- Примечание: если таблица не в publication, команда выдаст ошибку - это нормально
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE generations;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Table generations is not part of supabase_realtime publication';
END;
$$;

-- 2. ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ для частых запросов

-- Индекс для webhook поиска по prediction_id (уже есть, но проверим)
CREATE INDEX IF NOT EXISTS idx_generations_prediction_id 
  ON generations(replicate_prediction_id) 
  WHERE replicate_prediction_id IS NOT NULL;

-- Составной индекс для основного запроса истории
-- Покрывает: user_id + status + created_at + is_keyframe_segment
CREATE INDEX IF NOT EXISTS idx_generations_user_full_query 
  ON generations(user_id, created_at DESC, status, is_favorite) 
  WHERE is_keyframe_segment IS NOT TRUE;

-- Индекс для workspace запросов
CREATE INDEX IF NOT EXISTS idx_generations_workspace_full 
  ON generations(workspace_id, created_at DESC) 
  WHERE workspace_id IS NOT NULL AND is_keyframe_segment IS NOT TRUE;

-- 3. ОПТИМИЗАЦИЯ ФУНКЦИИ ПОДСЧЁТА
-- Используем STABLE для кэширования результатов в рамках транзакции
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

-- 4. МАТЕРИАЛИЗОВАННОЕ ПРЕДСТАВЛЕНИЕ ДЛЯ ADMIN STATS
-- Это позволит кэшировать агрегированные данные и снизить нагрузку
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_admin_stats AS
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '24 hours' THEN u.id END) as active_today,
  COUNT(g.id) as total_generations,
  COUNT(CASE WHEN g.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as generations_today,
  COUNT(CASE WHEN g.status = 'completed' THEN 1 END) as completed_generations,
  COUNT(CASE WHEN g.status = 'failed' THEN 1 END) as failed_generations,
  COUNT(CASE WHEN g.status IN ('pending', 'processing') THEN 1 END) as processing_generations,
  COALESCE(SUM(g.cost_credits), 0) as total_credits_spent,
  COALESCE(AVG(g.processing_time_ms) FILTER (WHERE g.status = 'completed'), 0) as avg_processing_time_ms
FROM users u
LEFT JOIN generations g ON g.user_id = u.id
WHERE u.is_active = true;

-- Индекс для быстрого обновления
CREATE UNIQUE INDEX IF NOT EXISTS mv_admin_stats_idx ON mv_admin_stats(total_users);

-- Функция для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_stats;
END;
$$ LANGUAGE plpgsql;

-- 5. ОЧИСТКА СТАРЫХ ДАННЫХ
-- Функция для архивирования/удаления старых генераций (>90 дней)
CREATE OR REPLACE FUNCTION cleanup_old_generations(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Удаляем только неуспешные генерации старше N дней
  -- Успешные оставляем (они важны для пользователей)
  WITH deleted AS (
    DELETE FROM generations
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
      AND status IN ('failed', 'cancelled')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. НАСТРОЙКА АВТООЧИСТКИ (AUTOVACUUM)
-- Более агрессивные настройки для таблицы generations
ALTER TABLE generations SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- 5% вместо 20% по умолчанию
  autovacuum_analyze_scale_factor = 0.02, -- 2% вместо 10%
  autovacuum_vacuum_cost_delay = 10       -- Быстрее vacuum
);

-- 7. ОБНОВЛЕНИЕ СТАТИСТИКИ
ANALYZE generations;
ANALYZE users;
ANALYZE workspace_members;

-- 8. ПРОВЕРКА ИНДЕКСОВ
-- Выведет список индексов для проверки
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'generations';

-- ===========================================
-- ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ:
-- ===========================================
-- 1. Выполните этот скрипт в Supabase SQL Editor
-- 2. После применения перезапустите приложение
-- 3. Настройте cron для обновления mv_admin_stats каждые 5 минут:
--    SELECT refresh_admin_stats();
-- 4. Настройте cron для cleanup каждую неделю:
--    SELECT cleanup_old_generations(90);
-- ===========================================
