-- =====================================================
-- FLOW TABLES MIGRATION
-- Выполните этот скрипт в Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- =====================================================

-- 1. Создаём тип для блоков (если не существует)
DO $$ BEGIN
    CREATE TYPE flow_block_type AS ENUM ('text', 'image', 'video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Основная таблица flows
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Без названия',
  description TEXT,
  viewport_x DOUBLE PRECISION DEFAULT 0,
  viewport_y DOUBLE PRECISION DEFAULT 0,
  viewport_zoom DOUBLE PRECISION DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица узлов flow_nodes
CREATE TABLE IF NOT EXISTS flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  block_type flow_block_type NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  data JSONB NOT NULL DEFAULT '{}',
  model_id TEXT,
  output_url TEXT,
  output_type TEXT,
  status TEXT DEFAULT 'idle',
  error_message TEXT,
  generation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица связей flow_edges
CREATE TABLE IF NOT EXISTS flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  target_handle TEXT,
  edge_type TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_node_id, source_handle, target_node_id, target_handle)
);

-- 5. Индексы
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow_id ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_status ON flow_nodes(status);

-- 6. RLS политики
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_edges ENABLE ROW LEVEL SECURITY;

-- Flows policies
DROP POLICY IF EXISTS "Users can view own flows" ON flows;
CREATE POLICY "Users can view own flows" ON flows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own flows" ON flows;
CREATE POLICY "Users can create own flows" ON flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flows" ON flows;
CREATE POLICY "Users can update own flows" ON flows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flows" ON flows;
CREATE POLICY "Users can delete own flows" ON flows
  FOR DELETE USING (auth.uid() = user_id);

-- Flow nodes policies
DROP POLICY IF EXISTS "Users can view nodes of own flows" ON flow_nodes;
CREATE POLICY "Users can view nodes of own flows" ON flow_nodes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can create nodes in own flows" ON flow_nodes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can update nodes in own flows" ON flow_nodes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can delete nodes in own flows" ON flow_nodes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

-- Flow edges policies
DROP POLICY IF EXISTS "Users can view edges of own flows" ON flow_edges;
CREATE POLICY "Users can view edges of own flows" ON flow_edges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create edges in own flows" ON flow_edges;
CREATE POLICY "Users can create edges in own flows" ON flow_edges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update edges in own flows" ON flow_edges;
CREATE POLICY "Users can update edges in own flows" ON flow_edges
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete edges in own flows" ON flow_edges;
CREATE POLICY "Users can delete edges in own flows" ON flow_edges
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

-- 7. Триггер для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_flows_updated_at ON flows;
CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flow_nodes_updated_at ON flow_nodes;
CREATE TRIGGER update_flow_nodes_updated_at
  BEFORE UPDATE ON flow_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Готово!
SELECT 'Migration completed successfully!' as status;
