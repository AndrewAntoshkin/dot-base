-- Add profile fields to users table
-- Migration: add_user_profile_fields.sql

-- Add display_name field (user-editable name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add avatar_url field (user-uploaded avatar)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add cover_url field (user-uploaded cover image)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Update comment
COMMENT ON COLUMN users.display_name IS 'User-editable display name';
COMMENT ON COLUMN users.avatar_url IS 'User-uploaded avatar URL';
COMMENT ON COLUMN users.cover_url IS 'User-uploaded cover image URL';

