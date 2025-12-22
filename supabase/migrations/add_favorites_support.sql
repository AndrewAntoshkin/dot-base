-- Add favorites support to generations table
-- Migration: add_favorites_support.sql

-- Add is_favorite column to generations table
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false NOT NULL;

-- Add index for faster filtering by favorites
CREATE INDEX IF NOT EXISTS idx_generations_is_favorite ON generations(is_favorite) WHERE is_favorite = true;

-- Add composite index for user favorites
CREATE INDEX IF NOT EXISTS idx_generations_user_favorites ON generations(user_id, is_favorite) WHERE is_favorite = true;

-- Add index for failed generations (for "Errors" tab)
CREATE INDEX IF NOT EXISTS idx_generations_user_failed ON generations(user_id, status) WHERE status = 'failed';

-- Add index for processing generations (for "In Progress" tab)
CREATE INDEX IF NOT EXISTS idx_generations_user_processing ON generations(user_id, status) WHERE status IN ('pending', 'processing');













