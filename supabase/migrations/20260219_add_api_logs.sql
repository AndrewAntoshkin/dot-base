-- Migration: Add api_logs table for external AI API call logging
-- Created: 2026-02-19

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER,
  user_id UUID,

  -- External AI provider
  provider TEXT,
  external_status TEXT,
  model_name TEXT,
  generation_id UUID,

  -- Request params
  query_params JSONB,
  request_body JSONB,

  -- Response / error
  error_message TEXT,
  error_stack TEXT,
  error_category TEXT,
  response_summary JSONB,

  -- Meta
  is_fallback BOOLEAN DEFAULT FALSE,
  retry_count INTEGER DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering and search
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_provider ON api_logs(provider);
CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_error_category ON api_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON api_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_generation_id ON api_logs(generation_id);