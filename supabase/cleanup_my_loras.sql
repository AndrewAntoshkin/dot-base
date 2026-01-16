-- Cleanup MY LoRA models for andrew.antoshkin@gmail.com
-- Run this in Supabase SQL Editor

-- Step 1: Preview - See all your LoRA models (check before deleting!)
SELECT 
  ul.id,
  ul.name,
  ul.status,
  ul.created_at,
  ul.user_id,
  au.email as user_email
FROM user_loras ul
LEFT JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com'
ORDER BY ul.created_at DESC;

-- Step 2: Delete training images for your LoRAs
DELETE FROM lora_training_images
WHERE lora_id IN (
  SELECT ul.id
  FROM user_loras ul
  JOIN auth.users au ON au.id = ul.user_id
  WHERE ul.deleted_at IS NULL
    AND au.email = 'andrew.antoshkin@gmail.com'
);

-- Step 3: Soft delete your LoRAs
UPDATE user_loras
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'andrew.antoshkin@gmail.com'
  );

-- Step 4: Verify deletion - should return 0
SELECT COUNT(*) as remaining_count
FROM user_loras ul
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com';
