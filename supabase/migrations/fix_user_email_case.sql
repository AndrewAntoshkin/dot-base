-- Migration: Fix email case sensitivity issues
-- Date: 2024-12-05
-- Problem: Email comparison was inconsistent - some places used lowercase, some didn't
-- Solution: Normalize all emails to lowercase

-- 1. Обновить функцию handle_new_user() чтобы email сохранялся в lowercase
-- Используем EXCEPTION handling для обработки конфликтов
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Пытаемся вставить нового пользователя
  INSERT INTO public.users (id, email, auth_provider, created_at, is_active, role)
  VALUES (
    NEW.id,
    LOWER(NEW.email), -- Нормализуем email в lowercase
    'email',
    NOW(),
    true,
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(LOWER(EXCLUDED.email), public.users.email),
    is_active = true;
  
  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- Если конфликт по email, обновляем существующую запись
    UPDATE public.users 
    SET is_active = true,
        id = NEW.id
    WHERE LOWER(email) = LOWER(NEW.email);
    RETURN NEW;
  WHEN OTHERS THEN
    -- Логируем другие ошибки, но не блокируем регистрацию
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Нормализовать существующие email в таблице users (в lowercase)
UPDATE public.users 
SET email = LOWER(email) 
WHERE email IS NOT NULL AND email != LOWER(email);

-- 3. Убедимся что обычные пользователи могут видеть свой профиль
-- (важно: не удаляем существующие политики, а добавляем/обновляем)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id OR auth.role() = 'service_role');

-- 4. Добавить policy для INSERT - триггер работает с SECURITY DEFINER, 
-- но на всякий случай разрешаем service_role
DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 5. Обновить policy для UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id OR auth.role() = 'service_role');

-- 6. Синхронизировать пользователей из auth.users которых нет в public.users
-- Используем DO блок для обработки каждого пользователя отдельно
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, created_at 
    FROM auth.users 
    WHERE email IS NOT NULL
  LOOP
    BEGIN
      INSERT INTO public.users (id, email, auth_provider, created_at, is_active, role)
      VALUES (
        auth_user.id,
        LOWER(auth_user.email),
        'email',
        auth_user.created_at,
        true,
        'user'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(LOWER(EXCLUDED.email), public.users.email),
        is_active = true;
    EXCEPTION 
      WHEN unique_violation THEN
        -- Email уже существует с другим id, обновляем
        UPDATE public.users 
        SET id = auth_user.id, is_active = true
        WHERE LOWER(email) = LOWER(auth_user.email);
      WHEN OTHERS THEN
        RAISE NOTICE 'Skipping user sync for %: %', auth_user.email, SQLERRM;
    END;
  END LOOP;
END $$;

-- 7. Исправить функции проверки ролей - использовать lowercase для сравнения
CREATE OR REPLACE FUNCTION is_admin_or_super(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE LOWER(email) = LOWER(user_email);
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE LOWER(email) = LOWER(user_email);
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE LOWER(email) = LOWER(user_email);
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Логирование для отладки
COMMENT ON FUNCTION handle_new_user() IS 'Автоматически создает запись в public.users при регистрации. Нормализует email в lowercase. Updated 2024-12-05';












