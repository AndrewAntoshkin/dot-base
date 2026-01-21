-- =====================================================
-- FIX FLOW RLS POLICIES - Remove Infinite Recursion
-- =====================================================

-- 1. Fix flows policies - simplify to avoid recursion with flow_members
DROP POLICY IF EXISTS "Users can view own or shared flows" ON flows;
CREATE POLICY "Users can view own or shared flows" ON flows
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM flow_members 
      WHERE flow_members.flow_id = flows.id 
      AND flow_members.user_id = auth.uid()
      AND flow_members.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can create own flows" ON flows;
CREATE POLICY "Users can create own flows" ON flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own or editable flows" ON flows;
CREATE POLICY "Users can update own or editable flows" ON flows
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM flow_members 
      WHERE flow_members.flow_id = flows.id 
      AND flow_members.user_id = auth.uid()
      AND flow_members.role IN ('owner', 'editor')
      AND flow_members.accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete own flows" ON flows;
CREATE POLICY "Users can delete own flows" ON flows
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Update flow_nodes policies to be simpler (remove nested EXISTS to avoid recursion)
DROP POLICY IF EXISTS "Users can view nodes of own or shared flows" ON flow_nodes;
CREATE POLICY "Users can view nodes of own or shared flows" ON flow_nodes
  FOR SELECT USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can create nodes in editable flows" ON flow_nodes;
CREATE POLICY "Users can create nodes in editable flows" ON flow_nodes
  FOR INSERT WITH CHECK (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update nodes in editable flows" ON flow_nodes;
CREATE POLICY "Users can update nodes in editable flows" ON flow_nodes
  FOR UPDATE USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete nodes in editable flows" ON flow_nodes;
CREATE POLICY "Users can delete nodes in editable flows" ON flow_nodes
  FOR DELETE USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

-- 3. Update flow_edges policies similarly
DROP POLICY IF EXISTS "Users can view edges of own or shared flows" ON flow_edges;
CREATE POLICY "Users can view edges of own or shared flows" ON flow_edges
  FOR SELECT USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can create edges in editable flows" ON flow_edges;
CREATE POLICY "Users can create edges in editable flows" ON flow_edges
  FOR INSERT WITH CHECK (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update edges in editable flows" ON flow_edges;
CREATE POLICY "Users can update edges in editable flows" ON flow_edges
  FOR UPDATE USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete edges in editable flows" ON flow_edges;
CREATE POLICY "Users can delete edges in editable flows" ON flow_edges
  FOR DELETE USING (
    flow_id IN (
      SELECT id FROM flows WHERE user_id = auth.uid()
      UNION
      SELECT flow_id FROM flow_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor') AND accepted_at IS NOT NULL
    )
  );

-- Готово!
SELECT 'Flow RLS policies fixed - recursion removed!' as status;
