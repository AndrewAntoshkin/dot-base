-- Миграция: Поддержка email/password пользователей
-- Добавляет синхронизацию между auth.users и public.users

-- 1. Изменить таблицу users, чтобы поддерживать и email, и telegram пользователей
ALTER TABLE users 
  ALTER COLUMN telegram_username DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'telegram' CHECK (auth_provider IN ('email', 'telegram', 'oauth'));

-- Создать индекс на email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Функция для автоматического создания пользователя в public.users при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_provider, created_at, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'email',
    NOW(),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Триггер для автоматического создания пользователя
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Синхронизировать существующих пользователей из auth.users в public.users
INSERT INTO public.users (id, email, auth_provider, created_at, is_active)
SELECT 
  id,
  email,
  'email',
  created_at,
  true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 5. Комментарии
COMMENT ON COLUMN users.email IS 'Email для пользователей с email/password аутентификацией';
COMMENT ON COLUMN users.auth_provider IS 'Метод аутентификации: email, telegram, или oauth';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Автоматически создает запись в public.users при регистрации через email';









