-- =====================================================
-- FLOW COLLABORATION MIGRATION
-- Совместная работа над Flow
-- =====================================================

-- 1. Таблица участников Flow
CREATE TABLE IF NOT EXISTS flow_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: один пользователь - один Flow
  UNIQUE(flow_id, user_id)
);

-- 2. Таблица приглашений (для email-приглашений)
CREATE TABLE IF NOT EXISTS flow_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_flow_members_flow_id ON flow_members(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_members_user_id ON flow_members(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_invites_flow_id ON flow_invites(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_invites_email ON flow_invites(email);
CREATE INDEX IF NOT EXISTS idx_flow_invites_token ON flow_invites(token);

-- 4. RLS для flow_members
ALTER TABLE flow_members ENABLE ROW LEVEL SECURITY;

-- Владелец Flow может видеть всех участников
DROP POLICY IF EXISTS "Flow owners can view members" ON flow_members;
CREATE POLICY "Flow owners can view members" ON flow_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_members.flow_id 
      AND flows.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Владелец Flow может добавлять участников
DROP POLICY IF EXISTS "Flow owners can add members" ON flow_members;
CREATE POLICY "Flow owners can add members" ON flow_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_members.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- Владелец Flow может обновлять участников (менять роли)
DROP POLICY IF EXISTS "Flow owners can update members" ON flow_members;
CREATE POLICY "Flow owners can update members" ON flow_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_members.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- Владелец Flow может удалять участников
DROP POLICY IF EXISTS "Flow owners can delete members" ON flow_members;
CREATE POLICY "Flow owners can delete members" ON flow_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_members.flow_id 
      AND flows.user_id = auth.uid()
    )
    -- Участник может удалить сам себя (выйти из Flow)
    OR user_id = auth.uid()
  );

-- 5. RLS для flow_invites
ALTER TABLE flow_invites ENABLE ROW LEVEL SECURITY;

-- Владелец Flow может видеть приглашения
DROP POLICY IF EXISTS "Flow owners can view invites" ON flow_invites;
CREATE POLICY "Flow owners can view invites" ON flow_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_invites.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- Владелец Flow может создавать приглашения
DROP POLICY IF EXISTS "Flow owners can create invites" ON flow_invites;
CREATE POLICY "Flow owners can create invites" ON flow_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_invites.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- Владелец Flow может удалять приглашения
DROP POLICY IF EXISTS "Flow owners can delete invites" ON flow_invites;
CREATE POLICY "Flow owners can delete invites" ON flow_invites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_invites.flow_id 
      AND flows.user_id = auth.uid()
    )
  );

-- 6. Обновляем RLS политики для flows - добавляем доступ для участников
DROP POLICY IF EXISTS "Users can view own flows" ON flows;
CREATE POLICY "Users can view own or shared flows" ON flows
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM flow_members 
      WHERE flow_members.flow_id = flows.id 
      AND flow_members.user_id = auth.uid()
    )
  );

-- Редакторы могут обновлять shared flows
DROP POLICY IF EXISTS "Users can update own flows" ON flows;
CREATE POLICY "Users can update own or editable flows" ON flows
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM flow_members 
      WHERE flow_members.flow_id = flows.id 
      AND flow_members.user_id = auth.uid()
      AND flow_members.role IN ('owner', 'editor')
    )
  );

-- 7. Обновляем RLS для flow_nodes - добавляем доступ для участников
DROP POLICY IF EXISTS "Users can view nodes of own flows" ON flow_nodes;
CREATE POLICY "Users can view nodes of own or shared flows" ON flow_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_nodes.flow_id 
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

DROP POLICY IF EXISTS "Users can create nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can create nodes in editable flows" ON flow_nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_nodes.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can update nodes in editable flows" ON flow_nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_nodes.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete nodes in own flows" ON flow_nodes;
CREATE POLICY "Users can delete nodes in editable flows" ON flow_nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_nodes.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- 8. Обновляем RLS для flow_edges - добавляем доступ для участников
DROP POLICY IF EXISTS "Users can view edges of own flows" ON flow_edges;
CREATE POLICY "Users can view edges of own or shared flows" ON flow_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_edges.flow_id 
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

DROP POLICY IF EXISTS "Users can create edges in own flows" ON flow_edges;
CREATE POLICY "Users can create edges in editable flows" ON flow_edges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_edges.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update edges in own flows" ON flow_edges;
CREATE POLICY "Users can update edges in editable flows" ON flow_edges
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_edges.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete edges in own flows" ON flow_edges;
CREATE POLICY "Users can delete edges in editable flows" ON flow_edges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flows 
      WHERE flows.id = flow_edges.flow_id 
      AND (
        flows.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM flow_members 
          WHERE flow_members.flow_id = flows.id 
          AND flow_members.user_id = auth.uid()
          AND flow_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- 9. Функция для принятия приглашения
CREATE OR REPLACE FUNCTION accept_flow_invite(invite_token TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite flow_invites;
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  -- Find invite
  SELECT * INTO v_invite FROM flow_invites 
  WHERE token = invite_token 
  AND used_at IS NULL 
  AND expires_at > NOW();
  
  IF v_invite IS NULL THEN
    RETURN json_build_object('error', 'Invalid or expired invite');
  END IF;

  -- Add user as member
  INSERT INTO flow_members (flow_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invite.flow_id, v_user_id, v_invite.role, v_invite.invited_by, NOW())
  ON CONFLICT (flow_id, user_id) DO UPDATE SET role = v_invite.role
  RETURNING id INTO v_member_id;

  -- Mark invite as used
  UPDATE flow_invites SET used_at = NOW() WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'flow_id', v_invite.flow_id,
    'member_id', v_member_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Готово!
SELECT 'Flow collaboration migration completed!' as status;
