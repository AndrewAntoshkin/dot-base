-- Add thumbnails for generation previews
-- Date: 2025-12-17

ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS output_thumbs TEXT[];

COMMENT ON COLUMN generations.output_thumbs IS 'Thumbnail URLs for output media (small previews)';
