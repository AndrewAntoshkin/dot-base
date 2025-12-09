-- Migration: Add support for expand action
-- Version: 0.5.0
-- Date: 2025-12-08

-- Step 1: Drop the old action constraint
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_action_check;

-- Step 2: Add new action constraint with expand type
ALTER TABLE generations ADD CONSTRAINT generations_action_check 
  CHECK (action IN (
    'create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale',
    'analyze_describe', 'analyze_ocr', 'analyze_prompt'
  ));

-- Step 3: Add index for expand actions for better query performance
CREATE INDEX IF NOT EXISTS idx_generations_expand_actions 
  ON generations(action) 
  WHERE action = 'expand';

-- Note: Run this migration in Supabase SQL Editor for production
