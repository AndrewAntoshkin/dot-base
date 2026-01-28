-- Migration: Add comments support to flows
-- Date: 2026-01-27

-- Таблица комментариев
CREATE TABLE IF NOT EXISTS flow_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  -- Привязка к ноде (NULL = комментарий на канвасе)
  node_id TEXT,
  -- Для цепочек ответов
  parent_id UUID REFERENCES flow_comments(id) ON DELETE CASCADE,
  -- Автор комментария
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Содержимое
  content TEXT NOT NULL,
  -- Позиция на канвасе (только для комментариев без привязки к ноде)
  position_x DOUBLE PRECISION,
  position_y DOUBLE PRECISION,
  -- Статус
  is_resolved BOOLEAN DEFAULT false,
  -- Кто прочитал (массив user_id)
  read_by UUID[] DEFAULT '{}',
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_flow_comments_flow_id ON flow_comments(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_comments_node_id ON flow_comments(node_id);
CREATE INDEX IF NOT EXISTS idx_flow_comments_parent_id ON flow_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_flow_comments_user_id ON flow_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_comments_created_at ON flow_comments(created_at DESC);

-- RLS
ALTER TABLE flow_comments ENABLE ROW LEVEL SECURITY;

-- Комментарии могут видеть владелец flow или участники (flow_members)
CREATE POLICY "Users can view comments in accessible flows" ON flow_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_comments.flow_id 
      AND (
        flows.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
        )
      )
    )
  );

-- Создавать комментарии могут владелец или участники
CREATE POLICY "Users can create comments in accessible flows" ON flow_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_comments.flow_id 
      AND (
        flows.user_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
        )
      )
    )
  );

-- Обновлять может только автор комментария
CREATE POLICY "Users can update own comments" ON flow_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Удалять может автор или владелец flow
CREATE POLICY "Users can delete own comments or flow owner" ON flow_comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_comments.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- Триггер для updated_at
CREATE TRIGGER update_flow_comments_updated_at
  BEFORE UPDATE ON flow_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
