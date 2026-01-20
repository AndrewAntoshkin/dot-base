-- Migration: Create flows tables for visual AI pipeline builder
-- Date: 2026-01-19

-- Типы блоков
CREATE TYPE flow_block_type AS ENUM ('text', 'image', 'video');

-- Основная таблица flows
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Без названия',
  description TEXT,
  -- Позиция viewport для сохранения положения камеры
  viewport_x DOUBLE PRECISION DEFAULT 0,
  viewport_y DOUBLE PRECISION DEFAULT 0,
  viewport_zoom DOUBLE PRECISION DEFAULT 1,
  -- Метаданные
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица узлов (блоков) внутри flow
CREATE TABLE IF NOT EXISTS flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  -- Тип блока
  block_type flow_block_type NOT NULL,
  -- Позиция на канвасе
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  -- Размеры (опционально)
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  -- Данные блока (промпт, настройки модели и т.д.)
  data JSONB NOT NULL DEFAULT '{}',
  -- ID модели из models-config.ts
  model_id TEXT,
  -- Результат генерации (если есть)
  output_url TEXT,
  output_type TEXT, -- 'image', 'video', 'text'
  -- Статус генерации
  status TEXT DEFAULT 'idle', -- 'idle', 'pending', 'processing', 'succeeded', 'failed'
  error_message TEXT,
  -- Связь с generations table для отслеживания
  generation_id UUID,
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица связей между узлами
CREATE TABLE IF NOT EXISTS flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  -- Исходный узел (откуда идёт связь)
  source_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT, -- 'output', 'output-1', etc.
  -- Целевой узел (куда идёт связь)
  target_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  target_handle TEXT, -- 'input', 'input-image', etc.
  -- Тип связи
  edge_type TEXT DEFAULT 'default',
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность связи
  UNIQUE(source_node_id, source_handle, target_node_id, target_handle)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_flows_user_id ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow_id ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_status ON flow_nodes(status);

-- RLS политики
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_edges ENABLE ROW LEVEL SECURITY;

-- Flows: пользователь видит только свои
CREATE POLICY "Users can view own flows" ON flows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flows" ON flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flows" ON flows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flows" ON flows
  FOR DELETE USING (auth.uid() = user_id);

-- Flow nodes: через связь с flows
CREATE POLICY "Users can view nodes of own flows" ON flow_nodes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can create nodes in own flows" ON flow_nodes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can update nodes in own flows" ON flow_nodes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can delete nodes in own flows" ON flow_nodes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

-- Flow edges: через связь с flows
CREATE POLICY "Users can view edges of own flows" ON flow_edges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can create edges in own flows" ON flow_edges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can update edges in own flows" ON flow_edges
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "Users can delete edges in own flows" ON flow_edges
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_edges.flow_id AND flows.user_id = auth.uid())
  );

-- Триггер для автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flow_nodes_updated_at
  BEFORE UPDATE ON flow_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
