-- ===========================================
-- Миграция: Оптимизированная функция подсчёта генераций для workspace
-- Дата: 2025-12-19
-- Причина: Медленная загрузка истории генераций
-- ===========================================

-- Функция для быстрого подсчёта генераций в workspace
-- Используется когда workspaceId передан в запрос
CREATE OR REPLACE FUNCTION get_workspace_generation_counts(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL  -- NULL = все пользователи workspace
)
RETURNS TABLE(
  all_count BIGINT,
  processing_count BIGINT,
  favorites_count BIGINT,
  failed_count BIGINT
) AS $$
BEGIN
  IF p_user_id IS NULL THEN
    -- Подсчёт для всего workspace
    RETURN QUERY
    SELECT 
      COUNT(*) FILTER (WHERE is_keyframe_segment IS NOT TRUE) as all_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND is_keyframe_segment IS NOT TRUE) as processing_count,
      COUNT(*) FILTER (WHERE is_favorite = true AND is_keyframe_segment IS NOT TRUE) as favorites_count,
      COUNT(*) FILTER (WHERE status = 'failed' AND is_keyframe_segment IS NOT TRUE) as failed_count
    FROM generations
    WHERE workspace_id = p_workspace_id;
  ELSE
    -- Подсчёт только для конкретного пользователя в workspace
    RETURN QUERY
    SELECT 
      COUNT(*) FILTER (WHERE is_keyframe_segment IS NOT TRUE) as all_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'processing') AND is_keyframe_segment IS NOT TRUE) as processing_count,
      COUNT(*) FILTER (WHERE is_favorite = true AND is_keyframe_segment IS NOT TRUE) as favorites_count,
      COUNT(*) FILTER (WHERE status = 'failed' AND is_keyframe_segment IS NOT TRUE) as failed_count
    FROM generations
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Права на выполнение функции
GRANT EXECUTE ON FUNCTION get_workspace_generation_counts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_generation_counts(UUID, UUID) TO service_role;

-- Дополнительный индекс для ускорения подсчётов в workspace
CREATE INDEX IF NOT EXISTS idx_generations_workspace_counts
  ON generations(workspace_id, user_id, status, is_favorite)
  WHERE is_keyframe_segment IS NOT TRUE;

-- Обновление статистики
ANALYZE generations;






