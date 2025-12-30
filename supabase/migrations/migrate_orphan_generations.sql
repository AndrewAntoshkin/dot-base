-- ===========================================
-- Миграция "orphan" генераций в workspace
-- Дата: 2025-12-29
-- Причина: OR условие для workspace_id IS NULL убивает производительность
-- ===========================================

-- 1. Для каждого пользователя найти их первый workspace
-- и присвоить этот workspace всем генерациям без workspace_id

-- Сначала проверим сколько таких генераций
-- SELECT COUNT(*) FROM generations WHERE workspace_id IS NULL;

-- Обновляем генерации без workspace - присваиваем первый workspace пользователя
UPDATE generations g
SET workspace_id = (
  SELECT wm.workspace_id 
  FROM workspace_members wm 
  WHERE wm.user_id = g.user_id 
  LIMIT 1
)
WHERE g.workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.user_id = g.user_id
  );

-- Создаём индекс для ускорения запросов (если ещё нет)
CREATE INDEX IF NOT EXISTS idx_generations_workspace_user_created 
  ON generations(workspace_id, user_id, created_at DESC) 
  WHERE is_keyframe_segment IS NOT TRUE;

-- Обновляем статистику
ANALYZE generations;

-- ===========================================
-- ИНСТРУКЦИИ:
-- 1. Выполни этот SQL в Supabase Dashboard → SQL Editor
-- 2. После выполнения генерации будут привязаны к workspace
-- 3. OR условие в API больше не нужно
-- ===========================================

