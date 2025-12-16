-- Migration: Add cost tracking for generations
-- Stores actual USD cost from Replicate API

-- Add cost_usd column to generations table
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10, 6) DEFAULT NULL;

-- Add index for cost queries
CREATE INDEX IF NOT EXISTS idx_generations_cost_usd ON generations(cost_usd) WHERE cost_usd IS NOT NULL;

-- Add comment
COMMENT ON COLUMN generations.cost_usd IS 'Actual cost in USD from Replicate API (predict_time * hardware_price)';
