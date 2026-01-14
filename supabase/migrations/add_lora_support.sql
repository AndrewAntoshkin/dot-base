-- Migration: Add LoRA Support
-- Created: 2026-01-14
-- Description: Tables for user LoRA models training and management

-- User LoRA models table
CREATE TABLE IF NOT EXISTS user_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'style' CHECK (type IN ('style', 'character', 'product', 'custom')),
  trigger_word TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'training', 'completed', 'failed')),
  lora_url TEXT,
  replicate_training_id TEXT,
  replicate_model_url TEXT,
  training_started_at TIMESTAMPTZ,
  training_completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'description') THEN
    ALTER TABLE user_loras ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'type') THEN
    ALTER TABLE user_loras ADD COLUMN type TEXT DEFAULT 'style';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'replicate_model_url') THEN
    ALTER TABLE user_loras ADD COLUMN replicate_model_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'training_started_at') THEN
    ALTER TABLE user_loras ADD COLUMN training_started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'training_completed_at') THEN
    ALTER TABLE user_loras ADD COLUMN training_completed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'error_message') THEN
    ALTER TABLE user_loras ADD COLUMN error_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_loras' AND column_name = 'deleted_at') THEN
    ALTER TABLE user_loras ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Training images table
CREATE TABLE IF NOT EXISTS lora_training_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lora_id UUID NOT NULL REFERENCES user_loras(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_loras_user_id ON user_loras(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loras_status ON user_loras(status);
CREATE INDEX IF NOT EXISTS idx_user_loras_deleted_at ON user_loras(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lora_training_images_lora_id ON lora_training_images(lora_id);

-- RLS Policies
ALTER TABLE user_loras ENABLE ROW LEVEL SECURITY;
ALTER TABLE lora_training_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own loras" ON user_loras;
DROP POLICY IF EXISTS "Users can insert own loras" ON user_loras;
DROP POLICY IF EXISTS "Users can update own loras" ON user_loras;
DROP POLICY IF EXISTS "Users can delete own loras" ON user_loras;
DROP POLICY IF EXISTS "Users can view own training images" ON lora_training_images;
DROP POLICY IF EXISTS "Users can insert own training images" ON lora_training_images;

-- Users can only see their own LoRAs
CREATE POLICY "Users can view own loras" ON user_loras
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loras" ON user_loras
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loras" ON user_loras
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loras" ON user_loras
  FOR DELETE USING (auth.uid() = user_id);

-- Training images follow lora ownership
CREATE POLICY "Users can view own training images" ON lora_training_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_loras 
      WHERE user_loras.id = lora_training_images.lora_id 
      AND user_loras.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own training images" ON lora_training_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_loras 
      WHERE user_loras.id = lora_training_images.lora_id 
      AND user_loras.user_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_lora_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lora_updated_at ON user_loras;

CREATE TRIGGER trigger_update_lora_updated_at
  BEFORE UPDATE ON user_loras
  FOR EACH ROW
  EXECUTE FUNCTION update_lora_updated_at();

-- Storage bucket for training images (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lora-training-images', 'lora-training-images', true);

