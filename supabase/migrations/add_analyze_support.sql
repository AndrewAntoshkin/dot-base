-- Migration: Add support for analyze actions and text output
-- Run this migration to add analyze functionality

-- 1. Add output_text column for text responses from analyze models
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS output_text TEXT;

-- 2. Update action CHECK constraint to include analyze actions
-- First drop the existing constraint
ALTER TABLE generations 
DROP CONSTRAINT IF EXISTS generations_action_check;

-- Add new constraint with all action types
ALTER TABLE generations 
ADD CONSTRAINT generations_action_check 
CHECK (action IN (
  'create', 'edit', 'upscale', 'remove_bg',
  'video_create', 'video_i2v', 'video_edit', 'video_upscale',
  'analyze_describe', 'analyze_ocr', 'analyze_prompt'
));

-- 3. Create index for analyze actions
CREATE INDEX IF NOT EXISTS idx_generations_analyze 
ON generations(action) 
WHERE action LIKE 'analyze_%';

-- Comment for reference
COMMENT ON COLUMN generations.output_text IS 'Text output from analyze models (descriptions, OCR results, prompts)';
















