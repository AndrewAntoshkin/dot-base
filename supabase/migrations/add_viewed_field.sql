-- Добавить поле viewed для отслеживания просмотренных генераций
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT false;

ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;

-- Пометить все существующие генерации как просмотренные
-- UPDATE generations SET viewed = true WHERE created_at < NOW();

