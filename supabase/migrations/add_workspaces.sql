-- ===========================================
-- Migration: Add Workspaces System
-- Добавляет пространства для командной работы
-- Запустить в Supabase Dashboard -> SQL Editor
-- ===========================================

-- 1. Таблица пространств (workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true
);

-- Индексы для workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(is_active) WHERE is_active = true;

-- 2. Таблица участников пространств (workspace_members)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, user_id)
);

-- Индексы для workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(workspace_id, role);

-- 3. Добавить workspace_id в generations (nullable для обратной совместимости)
ALTER TABLE generations 
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);

-- Индекс для фильтрации по workspace
CREATE INDEX IF NOT EXISTS idx_generations_workspace 
  ON generations(workspace_id, created_at DESC) 
  WHERE workspace_id IS NOT NULL;

-- Составной индекс для запроса "мои генерации в пространстве"
CREATE INDEX IF NOT EXISTS idx_generations_workspace_user 
  ON generations(workspace_id, user_id, created_at DESC) 
  WHERE workspace_id IS NOT NULL;

-- ===========================================
-- 4. RLS Policies для workspaces
-- ===========================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Пользователь видит пространства где он участник или он super_admin
DROP POLICY IF EXISTS "Users view own workspaces" ON workspaces;
CREATE POLICY "Users view own workspaces" 
  ON workspaces FOR SELECT 
  USING (
    auth.role() = 'service_role' OR
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Создавать могут admin и super_admin
DROP POLICY IF EXISTS "Admins can create workspaces" ON workspaces;
CREATE POLICY "Admins can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Обновлять могут owner/admin пространства или super_admin
DROP POLICY IF EXISTS "Workspace admins can update" ON workspaces;
CREATE POLICY "Workspace admins can update"
  ON workspaces FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspaces.id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Удалять могут owner пространства или super_admin
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;
CREATE POLICY "Workspace owners can delete"
  ON workspaces FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspaces.id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 5. RLS Policies для workspace_members
-- ===========================================
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Видеть участников могут члены пространства
DROP POLICY IF EXISTS "Members view workspace members" ON workspace_members;
CREATE POLICY "Members view workspace members"
  ON workspace_members FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Добавлять участников могут admin/owner пространства или super_admin
DROP POLICY IF EXISTS "Workspace admins can add members" ON workspace_members;
CREATE POLICY "Workspace admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Обновлять роли могут owner пространства или super_admin
DROP POLICY IF EXISTS "Workspace owners can update member roles" ON workspace_members;
CREATE POLICY "Workspace owners can update member roles"
  ON workspace_members FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Удалять участников могут admin/owner или сам участник может выйти
DROP POLICY IF EXISTS "Workspace admins can remove members" ON workspace_members;
CREATE POLICY "Workspace admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    user_id = auth.uid() OR -- можно выйти самому
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 6. Обновить RLS для generations с учетом workspace
-- ===========================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own generations" ON generations;
DROP POLICY IF EXISTS "Admins can view all generations" ON generations;

-- Новая политика: видит свои ИЛИ все в своих workspace ИЛИ super_admin видит всё
CREATE POLICY "Users view generations in workspace"
  ON generations FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    user_id = auth.uid() OR
    (
      workspace_id IS NOT NULL AND
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 7. Вспомогательные функции
-- ===========================================

-- Функция проверки членства в workspace
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения роли в workspace
CREATE OR REPLACE FUNCTION get_workspace_role(p_workspace_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  member_role TEXT;
BEGIN
  SELECT role INTO member_role 
  FROM workspace_members 
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  RETURN member_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения списка workspace пользователя
CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id UUID)
RETURNS TABLE(
  workspace_id UUID,
  workspace_name TEXT,
  workspace_slug TEXT,
  member_role TEXT,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    wm.role,
    (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)
  FROM workspaces w
  JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = p_user_id AND w.is_active = true
  ORDER BY wm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Права на функции
GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;

-- ===========================================
-- ГОТОВО! Следующий шаг: запустить migrate_to_workspaces.sql
-- ===========================================
