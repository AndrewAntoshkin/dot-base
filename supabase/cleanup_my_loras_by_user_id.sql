-- Cleanup MY LoRA models by user_id
-- First, find your user_id with this query:
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%andrew%' OR email LIKE '%antoshkin%'
ORDER BY created_at DESC;

-- Then replace 'YOUR_USER_ID_HERE' below with your actual user_id UUID

-- Step 1: Preview - See all your LoRA models
SELECT 
  id,
  name,
  status,
  created_at,
  user_id
FROM user_loras
WHERE deleted_at IS NULL
  AND user_id = 'YOUR_USER_ID_HERE'  -- REPLACE WITH YOUR USER_ID
ORDER BY created_at DESC;

-- Step 2: Delete training images for your LoRAs
DELETE FROM lora_training_images
WHERE lora_id IN (
  SELECT id
  FROM user_loras
  WHERE deleted_at IS NULL
    AND user_id = 'YOUR_USER_ID_HERE'  -- REPLACE WITH YOUR USER_ID
);

-- Step 3: Soft delete your LoRAs
UPDATE user_loras
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND user_id = 'YOUR_USER_ID_HERE';  -- REPLACE WITH YOUR USER_ID

-- Step 4: Verify deletion - should return 0
SELECT COUNT(*) as remaining_count
FROM user_loras
WHERE deleted_at IS NULL
  AND user_id = 'YOUR_USER_ID_HERE';  -- REPLACE WITH YOUR USER_ID
