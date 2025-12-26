-- Migration: Add support for video_keyframes action
-- Version: 0.6.0
-- Date: 2025-12-26

-- Step 1: Drop the old action constraint
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_action_check;

-- Step 2: Add new action constraint with video_keyframes type
ALTER TABLE generations ADD CONSTRAINT generations_action_check 
  CHECK (action IN (
    'create', 'edit', 'upscale', 'remove_bg', 'inpaint', 'expand',
    'video_create', 'video_i2v', 'video_edit', 'video_upscale', 'video_keyframes',
    'analyze_describe', 'analyze_ocr', 'analyze_prompt'
  ));

-- Step 3: Add index for keyframes actions for better query performance
CREATE INDEX IF NOT EXISTS idx_generations_keyframes_actions 
  ON generations(action) 
  WHERE action = 'video_keyframes';

-- Note: Run this migration in Supabase SQL Editor for production

