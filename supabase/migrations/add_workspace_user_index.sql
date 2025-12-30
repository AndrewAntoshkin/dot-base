-- ===========================================
-- Индекс для запросов по workspace + user
-- Критично для страницы истории в workspace
-- Date: 2024-12-30
-- ===========================================

-- Основной индекс для workspace + user + сортировка
-- Покрывает: WHERE workspace_id = X AND user_id = Y ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_generations_workspace_user_created 
  ON generations(workspace_id, user_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- Индекс для workspace без фильтра по user (все генерации workspace)
-- Покрывает: WHERE workspace_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_generations_workspace_created 
  ON generations(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- Partial index исключающий keyframe segments для основного списка
CREATE INDEX IF NOT EXISTS idx_generations_workspace_user_main 
  ON generations(workspace_id, user_id, created_at DESC)
  WHERE workspace_id IS NOT NULL 
  AND is_keyframe_segment IS NOT TRUE 
  AND action != 'video_keyframes';

-- Partial index для workspace без user фильтра
CREATE INDEX IF NOT EXISTS idx_generations_workspace_main 
  ON generations(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL 
  AND is_keyframe_segment IS NOT TRUE 
  AND action != 'video_keyframes';

-- Обновляем статистику
ANALYZE generations;

-- Проверка индексов
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'generations' ORDER BY indexname;

