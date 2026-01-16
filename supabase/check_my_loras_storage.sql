-- Check where your LoRA data is stored
-- Run this to see all locations where your LoRA models exist

-- 1. Database: LoRA models
SELECT 
  'DATABASE: LoRA Models' as location,
  ul.id,
  ul.name,
  ul.status,
  ul.created_at,
  ul.replicate_model_url,
  ul.replicate_training_id,
  ul.lora_url
FROM user_loras ul
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com'
ORDER BY ul.created_at DESC;

-- 2. Database: Training images
SELECT 
  'DATABASE: Training Images' as location,
  lti.id,
  lti.image_url,
  lti.lora_id,
  ul.name as lora_name
FROM lora_training_images lti
JOIN user_loras ul ON ul.id = lti.lora_id
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com';

-- 3. Storage: Check if images exist in bucket (requires storage.objects access)
-- Note: This might not work if RLS is enabled, use Storage UI instead
SELECT 
  'STORAGE: Training Images' as location,
  name as file_path,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'lora-training-images'
  AND name LIKE '%' || (
    SELECT user_id::text 
    FROM auth.users 
    WHERE email = 'andrew.antoshkin@gmail.com'
  ) || '%'
LIMIT 100;

-- 4. Replicate: Models that need manual deletion
-- These are stored on Replicate servers, not in our database
SELECT 
  'REPLICATE: Models (manual deletion needed)' as location,
  ul.id,
  ul.name,
  ul.replicate_model_url,
  ul.replicate_training_id,
  'Go to: https://replicate.com/andrewaitken/models' as action
FROM user_loras ul
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com'
  AND (ul.replicate_model_url IS NOT NULL OR ul.replicate_training_id IS NOT NULL);
