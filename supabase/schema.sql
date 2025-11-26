-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_username TEXT UNIQUE NOT NULL,
  telegram_id BIGINT UNIQUE,
  telegram_first_name TEXT,
  telegram_last_name TEXT,
  telegram_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  credits INTEGER DEFAULT 100,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
);

-- Create index on telegram fields
CREATE INDEX IF NOT EXISTS idx_users_telegram_username ON users(telegram_username);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Generations table
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Model info
  action TEXT NOT NULL CHECK (action IN ('create', 'edit', 'upscale', 'remove_bg')),
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  replicate_model TEXT NOT NULL,
  
  -- Input data
  prompt TEXT,
  input_image_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Output data
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  output_urls TEXT[],
  replicate_prediction_id TEXT UNIQUE,
  replicate_token_index INTEGER,
  
  -- Metadata
  processing_time_ms INTEGER,
  error_message TEXT,
  cost_credits INTEGER DEFAULT 1,
  viewed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Full request/response for debugging
  replicate_input JSONB,
  replicate_output JSONB
);

-- Create indexes for generations
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_action ON generations(action);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_prediction_id ON generations(replicate_prediction_id);

-- Replicate tokens pool
CREATE TABLE IF NOT EXISTS replicate_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on active tokens
CREATE INDEX IF NOT EXISTS idx_replicate_tokens_active ON replicate_tokens(is_active, last_used_at);

-- Function to get next available token
CREATE OR REPLACE FUNCTION get_next_replicate_token()
RETURNS TABLE(id INTEGER, token TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE replicate_tokens
  SET 
    last_used_at = NOW(),
    request_count = request_count + 1
  WHERE replicate_tokens.id = (
    SELECT replicate_tokens.id
    FROM replicate_tokens
    WHERE is_active = true
    ORDER BY 
      COALESCE(last_used_at, '1970-01-01'::timestamp) ASC,
      request_count ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING replicate_tokens.id, replicate_tokens.token;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE replicate_tokens ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Generations policies
CREATE POLICY "Users can view own generations" 
  ON generations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" 
  ON generations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations" 
  ON generations FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role can access replicate_tokens (no user policy)
CREATE POLICY "Service role can manage tokens" 
  ON replicate_tokens FOR ALL 
  USING (auth.role() = 'service_role');

-- Insert initial Replicate tokens
-- Замените эти токены на ваши реальные
-- ВАЖНО: Не коммитьте реальные токены в репозиторий!
INSERT INTO replicate_tokens (token) VALUES
  ('r8_YOUR_TOKEN_1_HERE'),
  ('r8_YOUR_TOKEN_2_HERE'),
  ('r8_YOUR_TOKEN_3_HERE'),
  ('r8_YOUR_TOKEN_4_HERE'),
  ('r8_YOUR_TOKEN_5_HERE')
ON CONFLICT (token) DO NOTHING;

-- Function to update generation status
CREATE OR REPLACE FUNCTION update_generation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
    NEW.started_at = NOW();
  END IF;
  
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'processing' THEN
    NEW.completed_at = NOW();
    IF NEW.started_at IS NOT NULL THEN
      NEW.processing_time_ms = EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) * 1000;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generation_status_trigger
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_generation_status();

-- Storage buckets (run this from Supabase dashboard or via API)
-- This is a comment for reference, actual bucket creation should be done via Supabase dashboard
-- Bucket: 'generations' - for storing generated images
-- Policies: authenticated users can upload, public can read

