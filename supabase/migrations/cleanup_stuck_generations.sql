-- Миграция: очистка зависших генераций
-- Дата: 2025-12-17

-- 1. Посмотреть зависшие генерации (для диагностики)
-- SELECT id, user_id, status, created_at, NOW() - created_at as age
-- FROM generations 
-- WHERE status IN ('pending', 'processing')
--   AND created_at < NOW() - INTERVAL '30 minutes'
-- ORDER BY created_at;

-- 2. Пометить зависшие генерации как failed
UPDATE generations 
SET 
  status = 'failed',
  error_message = 'Превышено время ожидания. Генерация была автоматически отменена. Попробуйте снова.',
  completed_at = NOW()
WHERE status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '30 minutes';

-- 3. Создать индекс для быстрого поиска зависших генераций
CREATE INDEX IF NOT EXISTS idx_generations_stale_check 
  ON generations(created_at, status) 
  WHERE status IN ('pending', 'processing');

-- 4. Добавить комментарий
COMMENT ON INDEX idx_generations_stale_check IS 
  'Index for finding stuck generations that need cleanup';

