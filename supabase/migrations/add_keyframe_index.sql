-- Optimize keyframe filtering in generations list
-- The query filters by settings->keyframe_index which causes slow JSONB scans

-- ===========================================
-- 1. Add boolean column for faster filtering
-- ===========================================
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS is_keyframe_segment BOOLEAN DEFAULT false;

-- ===========================================
-- 2. Backfill existing data
-- ===========================================
UPDATE generations 
SET is_keyframe_segment = true 
WHERE settings->>'keyframe_index' IS NOT NULL 
  AND (settings->>'keyframe_merge')::boolean IS NOT TRUE;

-- ===========================================
-- 3. Create index for the new column
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_keyframe_segment 
  ON generations(user_id, created_at DESC) 
  WHERE is_keyframe_segment = false OR is_keyframe_segment IS NULL;

-- ===========================================
-- 4. Partial index for favorites tab
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_favorites 
  ON generations(user_id, created_at DESC) 
  WHERE is_favorite = true;

-- ===========================================
-- 5. Partial index for failed tab
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_generations_failed 
  ON generations(user_id, created_at DESC) 
  WHERE status = 'failed';

-- ===========================================
-- 6. Update statistics
-- ===========================================
ANALYZE generations;
