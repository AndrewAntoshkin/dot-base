-- Complete cleanup of MY LoRA models for andrew.antoshkin@gmail.com
-- This script removes data from:
-- 1. Database tables (user_loras, lora_training_images)
-- 2. Storage buckets (lora-training-images)
-- 3. Note: Replicate models need to be deleted manually via Replicate API/Dashboard
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Preview - See what will be deleted
-- ============================================
SELECT 
  ul.id,
  ul.name,
  ul.status,
  ul.created_at,
  ul.replicate_model_url,
  ul.replicate_training_id,
  COUNT(lti.id) as training_images_count
FROM user_loras ul
LEFT JOIN auth.users au ON au.id = ul.user_id
LEFT JOIN lora_training_images lti ON lti.lora_id = ul.id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com'
GROUP BY ul.id, ul.name, ul.status, ul.created_at, ul.replicate_model_url, ul.replicate_training_id
ORDER BY ul.created_at DESC;

-- ============================================
-- STEP 2: Get image URLs for storage cleanup
-- ============================================
SELECT 
  lti.image_url,
  lti.lora_id,
  ul.name as lora_name
FROM lora_training_images lti
JOIN user_loras ul ON ul.id = lti.lora_id
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com';

-- ============================================
-- STEP 3: Delete training images from database
-- ============================================
DELETE FROM lora_training_images
WHERE lora_id IN (
  SELECT ul.id
  FROM user_loras ul
  JOIN auth.users au ON au.id = ul.user_id
  WHERE ul.deleted_at IS NULL
    AND au.email = 'andrew.antoshkin@gmail.com'
);

-- ============================================
-- STEP 4: Soft delete LoRA models
-- ============================================
UPDATE user_loras
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'andrew.antoshkin@gmail.com'
  );

-- ============================================
-- STEP 5: Verify deletion - should return 0
-- ============================================
SELECT COUNT(*) as remaining_count
FROM user_loras ul
JOIN auth.users au ON au.id = ul.user_id
WHERE ul.deleted_at IS NULL
  AND au.email = 'andrew.antoshkin@gmail.com';

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. Storage files: Images in 'lora-training-images' bucket need to be deleted manually
--    via Supabase Storage UI or using storage.delete() API
-- 
-- 2. Replicate models: Models trained on Replicate (replicate_model_url) are stored
--    on Replicate servers. To delete them:
--    - Go to https://replicate.com/your-username/models
--    - Or use Replicate API to delete models
--    - Models are referenced by replicate_model_url or replicate_training_id
--
-- 3. To clean storage bucket, run this in Supabase Storage UI:
--    - Go to Storage > lora-training-images
--    - Filter by path or delete all files for your user_id
--    - Or use: DELETE FROM storage.objects WHERE bucket_id = 'lora-training-images'
