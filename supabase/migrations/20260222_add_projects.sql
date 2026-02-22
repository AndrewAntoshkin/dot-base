-- ===========================================
-- Migration: Add Projects System
-- Проекты внутри пространств для организации контента
-- ===========================================

-- 1. Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(workspace_id, slug)
);

-- Индексы для projects
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(workspace_id, created_at DESC);

-- 2. Таблица участников проекта
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(project_id, role);

-- 3. Таблица рефференсов проекта (изображения/видео в описании)
CREATE TABLE IF NOT EXISTS project_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_name TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_references_project ON project_references(project_id, sort_order);

-- 4. Добавить project_id в generations (nullable — обратная совместимость)
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_generations_project
  ON generations(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- Составной индекс для генераций проекта по типу (image/video)
CREATE INDEX IF NOT EXISTS idx_generations_project_action
  ON generations(project_id, action, created_at DESC)
  WHERE project_id IS NOT NULL;

-- 5. Добавить project_id в flows (nullable — обратная совместимость)
ALTER TABLE flows
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_flows_project
  ON flows(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- ===========================================
-- 6. RLS Policies для projects
-- ===========================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Видят проекты: участники проекта ИЛИ участники workspace ИЛИ super_admin
DROP POLICY IF EXISTS "Users view projects" ON projects;
CREATE POLICY "Users view projects"
  ON projects FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Создавать проекты могут участники workspace
DROP POLICY IF EXISTS "Workspace members can create projects" ON projects;
CREATE POLICY "Workspace members can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Обновлять могут owner/admin проекта или workspace owner/admin или super_admin
DROP POLICY IF EXISTS "Project admins can update" ON projects;
CREATE POLICY "Project admins can update"
  ON projects FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Удалять могут owner проекта или workspace owner или super_admin
DROP POLICY IF EXISTS "Project owners can delete" ON projects;
CREATE POLICY "Project owners can delete"
  ON projects FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()
        AND role = 'owner'
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 7. RLS Policies для project_members
-- ===========================================
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Видеть участников могут участники проекта или workspace
DROP POLICY IF EXISTS "View project members" ON project_members;
CREATE POLICY "View project members"
  ON project_members FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id
        AND wm.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Добавлять участников могут admin/owner проекта или workspace admin/owner
DROP POLICY IF EXISTS "Project admins can add members" ON project_members;
CREATE POLICY "Project admins can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Удалять участников: admin/owner проекта, workspace admin/owner, или сам участник выходит
DROP POLICY IF EXISTS "Project admins can remove members" ON project_members;
CREATE POLICY "Project admins can remove members"
  ON project_members FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Обновлять роли могут owner проекта или workspace owner
DROP POLICY IF EXISTS "Project owners can update member roles" ON project_members;
CREATE POLICY "Project owners can update member roles"
  ON project_members FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_members.project_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 8. RLS Policies для project_references
-- ===========================================
ALTER TABLE project_references ENABLE ROW LEVEL SECURITY;

-- Видеть рефференсы могут участники проекта
DROP POLICY IF EXISTS "View project references" ON project_references;
CREATE POLICY "View project references"
  ON project_references FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_references.project_id
        AND wm.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Добавлять рефференсы могут участники проекта
DROP POLICY IF EXISTS "Project members can add references" ON project_references;
CREATE POLICY "Project members can add references"
  ON project_references FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_references.project_id
        AND wm.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Удалять рефференсы могут участники проекта
DROP POLICY IF EXISTS "Project members can delete references" ON project_references;
CREATE POLICY "Project members can delete references"
  ON project_references FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_references.project_id
        AND wm.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Обновлять (sort_order) могут участники проекта
DROP POLICY IF EXISTS "Project members can update references" ON project_references;
CREATE POLICY "Project members can update references"
  ON project_references FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_references.project_id
        AND wm.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 9. Обновить RLS для generations с учётом project
-- ===========================================

-- Удаляем старую политику и создаём расширенную
DROP POLICY IF EXISTS "Users view generations in workspace" ON generations;
CREATE POLICY "Users view generations in workspace or project"
  ON generations FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    user_id = auth.uid() OR
    (
      workspace_id IS NOT NULL AND
      workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    ) OR
    (
      project_id IS NOT NULL AND
      project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ===========================================
-- 10. Вспомогательные функции
-- ===========================================

-- Проверка членства в проекте
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Получение роли в проекте
CREATE OR REPLACE FUNCTION get_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  member_role TEXT;
BEGIN
  SELECT role INTO member_role
  FROM project_members
  WHERE project_id = p_project_id AND user_id = p_user_id;
  RETURN member_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Список проектов пользователя (через project_members + workspace_members)
CREATE OR REPLACE FUNCTION get_user_projects(p_user_id UUID)
RETURNS TABLE(
  project_id UUID,
  project_name TEXT,
  project_slug TEXT,
  project_description TEXT,
  project_cover_url TEXT,
  workspace_id UUID,
  workspace_name TEXT,
  member_role TEXT,
  member_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.name,
    p.slug,
    p.description,
    p.cover_url,
    p.workspace_id,
    w.name AS workspace_name,
    COALESCE(pm.role, wm.role) AS member_role,
    (SELECT COUNT(*) FROM project_members WHERE project_members.project_id = p.id) AS member_count,
    p.created_at
  FROM projects p
  JOIN workspaces w ON w.id = p.workspace_id
  LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = p_user_id
  LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = p_user_id
  WHERE p.is_active = true
    AND w.is_active = true
    AND (pm.user_id IS NOT NULL OR wm.user_id IS NOT NULL)
  ORDER BY p.id, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Подсчёт генераций для проектов (аналог get_workspaces_generation_counts)
CREATE OR REPLACE FUNCTION get_projects_generation_counts(p_project_ids UUID[])
RETURNS TABLE(
  project_id UUID,
  images_count BIGINT,
  videos_count BIGINT,
  flows_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS project_id,
    (
      SELECT COUNT(*) FROM generations g
      WHERE g.project_id = p.id
        AND g.status = 'completed'
        AND NOT g.action LIKE 'video_%'
    ) AS images_count,
    (
      SELECT COUNT(*) FROM generations g
      WHERE g.project_id = p.id
        AND g.status = 'completed'
        AND g.action LIKE 'video_%'
    ) AS videos_count,
    (
      SELECT COUNT(*) FROM flows f
      WHERE f.project_id = p.id
    ) AS flows_count
  FROM unnest(p_project_ids) AS pid(id)
  JOIN projects p ON p.id = pid.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Права на функции
GRANT EXECUTE ON FUNCTION is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_projects(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_projects_generation_counts(UUID[]) TO authenticated;

-- ===========================================
-- DONE
-- ===========================================
