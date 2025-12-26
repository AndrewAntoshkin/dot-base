-- Migration: Add video support to generations table
-- Version: 0.3.0
-- Date: 2025-11-27

-- Step 1: Drop the old action constraint
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_action_check;

-- Step 2: Add new action constraint with video types
ALTER TABLE generations ADD CONSTRAINT generations_action_check 
  CHECK (action IN (
    'create', 'edit', 'upscale', 'remove_bg',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale'
  ));

-- Step 3: Add input_video_url column (optional, for video editing)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS input_video_url TEXT;

-- Step 4: Add index for video actions for better query performance
CREATE INDEX IF NOT EXISTS idx_generations_video_actions 
  ON generations(action) 
  WHERE action IN ('video_create', 'video_i2v', 'video_edit', 'video_upscale');

-- Note: Run this migration in Supabase SQL Editor for production

















