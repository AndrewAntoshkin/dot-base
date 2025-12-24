-- Migration: Add author (user_id) to ideas table for deletion permissions
-- Created: 2024-12-24

-- Add user_id column to ideas (nullable for backwards compatibility)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS user_id UUID;

-- Index for user_id
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);

-- Drop existing delete policy if exists
DROP POLICY IF EXISTS "Authors can delete their ideas" ON ideas;
DROP POLICY IF EXISTS "Super admins can delete any idea" ON ideas;

-- Policy: Authors can delete their own ideas
CREATE POLICY "Authors can delete their ideas" ON ideas
  FOR DELETE USING (auth.uid() = user_id);

