-- Performance indexes for .base
-- Date: 2025-12-17

-- Index for finding stale/stuck generations (used by cleanup cron)
CREATE INDEX IF NOT EXISTS idx_generations_stale_check 
  ON generations(created_at, status) 
  WHERE status IN ('pending', 'processing');

-- Composite index for listing generations with filters
CREATE INDEX IF NOT EXISTS idx_generations_user_status_created 
  ON generations(user_id, status, created_at DESC);

-- Index for active generations count (concurrent limit check)
CREATE INDEX IF NOT EXISTS idx_generations_user_active 
  ON generations(user_id) 
  WHERE status IN ('pending', 'processing');

-- Index for unviewed generations (notification badge)
CREATE INDEX IF NOT EXISTS idx_generations_user_unviewed 
  ON generations(user_id, created_at DESC) 
  WHERE viewed = false;

-- Index for workspace generations
CREATE INDEX IF NOT EXISTS idx_generations_workspace 
  ON generations(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- Index for workspace members lookup
CREATE INDEX IF NOT EXISTS idx_workspace_members_user 
  ON workspace_members(user_id, workspace_id);

-- Comments
COMMENT ON INDEX idx_generations_stale_check IS 'For cleanup cron job';
COMMENT ON INDEX idx_generations_user_status_created IS 'For history page with filters';
COMMENT ON INDEX idx_generations_user_active IS 'For concurrent limit check';
COMMENT ON INDEX idx_generations_user_unviewed IS 'For notification badge count';

