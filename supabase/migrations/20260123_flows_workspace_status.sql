-- =====================================================
-- FLOWS: WORKSPACE + STATUS MIGRATION
-- Добавляем связь флоу с пространством и статусы для Kanban
-- =====================================================

-- 1. Добавляем workspace_id в таблицу flows
ALTER TABLE flows ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- 2. Добавляем статус для Kanban-доски
-- Статусы: in_progress (в работе), review (на согласовании), done (готово), archived (архив)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flows' AND column_name = 'status'
  ) THEN
    ALTER TABLE flows ADD COLUMN status TEXT DEFAULT 'in_progress';
    ALTER TABLE flows ADD CONSTRAINT flows_status_check 
      CHECK (status IN ('in_progress', 'review', 'done', 'archived'));
  END IF;
END $$;

-- 3. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_flows_workspace_id ON flows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
CREATE INDEX IF NOT EXISTS idx_flows_workspace_status ON flows(workspace_id, status);

-- 4. RLS: Участники пространства могут видеть флоу этого пространства
DROP POLICY IF EXISTS "Workspace members can view workspace flows" ON flows;
CREATE POLICY "Workspace members can view workspace flows" ON flows
  FOR SELECT USING (
    -- Флоу принадлежит пространству
    workspace_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = flows.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 5. RLS: Участники пространства могут создавать флоу в пространстве
DROP POLICY IF EXISTS "Workspace members can create workspace flows" ON flows;
CREATE POLICY "Workspace members can create workspace flows" ON flows
  FOR INSERT WITH CHECK (
    -- Если указан workspace_id, пользователь должен быть участником
    (workspace_id IS NULL)
    OR EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = flows.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
  );

-- 6. RLS: Участники пространства могут обновлять флоу (включая статус)
DROP POLICY IF EXISTS "Workspace members can update workspace flows" ON flows;
CREATE POLICY "Workspace members can update workspace flows" ON flows
  FOR UPDATE USING (
    -- Владелец всегда может
    auth.uid() = user_id
    OR
    -- Участник пространства может обновлять
    (
      workspace_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = flows.workspace_id 
        AND workspace_members.user_id = auth.uid()
      )
    )
    OR
    -- Участник флоу с правами редактирования
    EXISTS (
      SELECT 1 FROM flow_members 
      WHERE flow_members.flow_id = flows.id 
      AND flow_members.user_id = auth.uid()
      AND flow_members.role IN ('owner', 'editor')
    )
  );

-- 7. RLS: Удаление флоу - только владелец или админ пространства
DROP POLICY IF EXISTS "Owners can delete workspace flows" ON flows;
CREATE POLICY "Owners can delete workspace flows" ON flows
  FOR DELETE USING (
    -- Владелец флоу
    auth.uid() = user_id
    OR
    -- Админ пространства
    (
      workspace_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_members.workspace_id = flows.workspace_id 
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
      )
    )
  );

-- 8. Функция для обновления статуса флоу (для API)
CREATE OR REPLACE FUNCTION update_flow_status(flow_uuid UUID, new_status TEXT)
RETURNS void AS $$
BEGIN
  UPDATE flows SET status = new_status, updated_at = NOW() WHERE id = flow_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Функция для получения workspace_id флоу
CREATE OR REPLACE FUNCTION get_flow_workspace(flow_uuid UUID)
RETURNS TABLE(workspace_id UUID) AS $$
BEGIN
  RETURN QUERY SELECT f.workspace_id FROM flows f WHERE f.id = flow_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Готово!
SELECT 'Flows workspace+status migration completed!' as status;
