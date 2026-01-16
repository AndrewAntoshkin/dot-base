-- Cleanup script to delete test LoRA models
-- Run this in Supabase SQL Editor
-- This will soft delete LoRA models with names containing: test, bot, demo, sample, temp, tmp

-- First, let's see what test LoRAs we have (for preview)
SELECT 
  ul.id,
  ul.name,
  ul.status,
  ul.created_at,
  au.email as user_email
FROM user_loras ul
LEFT JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND (
    LOWER(ul.name) LIKE '%test%' OR
    LOWER(ul.name) LIKE '%bot%' OR
    LOWER(ul.name) LIKE '%demo%' OR
    LOWER(ul.name) LIKE '%sample%' OR
    LOWER(ul.name) LIKE '%temp%' OR
    LOWER(ul.name) LIKE '%tmp%'
  )
ORDER BY ul.created_at DESC;

-- Uncomment the following to actually delete:

-- Step 1: Delete training images for test LoRAs
-- DELETE FROM lora_training_images
-- WHERE lora_id IN (
--   SELECT id FROM user_loras
--   WHERE deleted_at IS NULL
--     AND (
--       LOWER(name) LIKE '%test%' OR
--       LOWER(name) LIKE '%bot%' OR
--       LOWER(name) LIKE '%demo%' OR
--       LOWER(name) LIKE '%sample%' OR
--       LOWER(name) LIKE '%temp%' OR
--       LOWER(name) LIKE '%tmp%'
--     )
-- );

-- Step 2: Soft delete test LoRAs
-- UPDATE user_loras
-- SET deleted_at = NOW()
-- WHERE deleted_at IS NULL
--   AND (
--     LOWER(name) LIKE '%test%' OR
--     LOWER(name) LIKE '%bot%' OR
--     LOWER(name) LIKE '%demo%' OR
--     LOWER(name) LIKE '%sample%' OR
--     LOWER(name) LIKE '%temp%' OR
--     LOWER(name) LIKE '%tmp%'
--   );

-- To delete LoRAs for a specific user by email, use:
-- UPDATE user_loras
-- SET deleted_at = NOW()
-- WHERE deleted_at IS NULL
--   AND user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
--   AND (
--     LOWER(name) LIKE '%test%' OR
--     LOWER(name) LIKE '%bot%' OR
--     LOWER(name) LIKE '%demo%' OR
--     LOWER(name) LIKE '%sample%' OR
--     LOWER(name) LIKE '%temp%' OR
--     LOWER(name) LIKE '%tmp%'
-- );
