-- Cleanup test LoRA models - READY TO RUN
-- This will delete test LoRA models matching patterns: test, bot, demo, sample, temp, tmp
-- Run this in Supabase SQL Editor

-- Step 1: Delete training images for test LoRAs
DELETE FROM lora_training_images
WHERE lora_id IN (
  SELECT id FROM user_loras
  WHERE deleted_at IS NULL
    AND (
      LOWER(name) LIKE '%test%' OR
      LOWER(name) LIKE '%bot%' OR
      LOWER(name) LIKE '%demo%' OR
      LOWER(name) LIKE '%sample%' OR
      LOWER(name) LIKE '%temp%' OR
      LOWER(name) LIKE '%tmp%'
    )
);

-- Step 2: Soft delete test LoRAs
UPDATE user_loras
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND (
    LOWER(name) LIKE '%test%' OR
    LOWER(name) LIKE '%bot%' OR
    LOWER(name) LIKE '%demo%' OR
    LOWER(name) LIKE '%sample%' OR
    LOWER(name) LIKE '%temp%' OR
    LOWER(name) LIKE '%tmp%'
  );

-- Returns count of deleted LoRAs
SELECT COUNT(*) as deleted_count
FROM user_loras
WHERE deleted_at IS NOT NULL
  AND (
    LOWER(name) LIKE '%test%' OR
    LOWER(name) LIKE '%bot%' OR
    LOWER(name) LIKE '%demo%' OR
    LOWER(name) LIKE '%sample%' OR
    LOWER(name) LIKE '%temp%' OR
    LOWER(name) LIKE '%tmp%'
  );
