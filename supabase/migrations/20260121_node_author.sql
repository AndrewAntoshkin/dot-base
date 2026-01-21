-- =====================================================
-- ADD NODE AUTHOR TRACKING
-- Добавляем поле автора ноды
-- =====================================================

-- 1. Добавляем поле created_by в flow_nodes
ALTER TABLE flow_nodes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Добавляем поле email для кэширования (чтобы не делать join)
ALTER TABLE flow_nodes 
ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- 3. Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_flow_nodes_created_by ON flow_nodes(created_by);

-- Готово!
SELECT 'Node author tracking added!' as status;
