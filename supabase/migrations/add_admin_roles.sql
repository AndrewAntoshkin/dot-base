-- Migration: Add super_admin role and email field for admin system
-- Date: 2024-12-04

-- 1. Add email field to users table (для связи с Supabase Auth)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 2. Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Drop old role constraint and add new one with super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- 4. Create function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin_or_super(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE email = user_email;
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE email = user_email;
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get user role by email
CREATE OR REPLACE FUNCTION get_user_role(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE email = user_email;
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS policy for admins to view all users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" 
  ON users FOR SELECT 
  USING (
    auth.role() = 'service_role' OR
    is_admin_or_super(auth.jwt() ->> 'email')
  );

-- 8. RLS policy for admins to update users (except changing to super_admin)
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" 
  ON users FOR UPDATE 
  USING (
    auth.role() = 'service_role' OR
    (
      is_admin_or_super(auth.jwt() ->> 'email') AND
      (role != 'super_admin' OR auth.uid() = id)
    )
  );

-- 9. RLS policy for admins to view all generations
DROP POLICY IF EXISTS "Admins can view all generations" ON generations;
CREATE POLICY "Admins can view all generations" 
  ON generations FOR SELECT 
  USING (
    auth.role() = 'service_role' OR
    auth.uid() = user_id OR
    is_admin_or_super(auth.jwt() ->> 'email')
  );

-- 10. Initialize super admin and admin accounts
-- Super Admin: andrew.antoshkin@gmail.com
-- Admin: antonbmx@list.ru

-- First, insert or update super admin
INSERT INTO users (email, telegram_username, role, is_active)
VALUES ('andrew.antoshkin@gmail.com', 'super_admin_andrew', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- Then, insert or update admin  
INSERT INTO users (email, telegram_username, role, is_active)
VALUES ('antonbmx@list.ru', 'admin_anton', 'admin', true)
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 11. Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
  (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login > NOW() - INTERVAL '24 hours') as active_today,
  (SELECT COUNT(*) FROM generations) as total_generations,
  (SELECT COUNT(*) FROM generations WHERE created_at > NOW() - INTERVAL '24 hours') as generations_today,
  (SELECT COUNT(*) FROM generations WHERE status = 'completed') as completed_generations,
  (SELECT COUNT(*) FROM generations WHERE status = 'failed') as failed_generations,
  (SELECT COUNT(*) FROM generations WHERE status = 'processing') as processing_generations,
  (SELECT COALESCE(SUM(cost_credits), 0) FROM generations) as total_credits_spent,
  (SELECT COALESCE(AVG(processing_time_ms), 0) FROM generations WHERE processing_time_ms IS NOT NULL) as avg_processing_time_ms;

-- Grant access to the view
GRANT SELECT ON admin_stats TO authenticated;
GRANT SELECT ON admin_stats TO service_role;















