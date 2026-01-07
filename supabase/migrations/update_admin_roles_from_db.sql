-- Migration: Update admin roles to use DB instead of hardcoded emails
-- Date: 2024-12-04
-- 
-- ВАЖНО: Теперь роли админов берутся из БД, не хардкодятся в коде!
-- После этой миграции нужно управлять ролями через админ-панель или SQL.

-- 1. Убедимся что индекс на email существует
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- 2. Обновим роли для существующих админов
-- Super Admin: andrew.antoshkin@gmail.com
UPDATE users 
SET role = 'super_admin' 
WHERE LOWER(email) = 'andrew.antoshkin@gmail.com';

-- Admin: antonbmx@list.ru
UPDATE users 
SET role = 'admin' 
WHERE LOWER(email) = 'antonbmx@list.ru';

-- 3. Создадим функцию для безопасного назначения роли админа
-- Только super_admin может назначать admin роль
CREATE OR REPLACE FUNCTION assign_admin_role(
  target_email TEXT,
  requesting_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  requesting_role TEXT;
BEGIN
  -- Получаем роль запрашивающего
  SELECT role INTO requesting_role 
  FROM users 
  WHERE LOWER(email) = LOWER(requesting_email);
  
  -- Только super_admin может назначать админов
  IF requesting_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can assign admin role';
  END IF;
  
  -- Нельзя менять super_admin
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE LOWER(email) = LOWER(target_email) AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Cannot change super_admin role';
  END IF;
  
  -- Назначаем роль
  UPDATE users 
  SET role = 'admin' 
  WHERE LOWER(email) = LOWER(target_email);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Создадим функцию для удаления роли админа
CREATE OR REPLACE FUNCTION remove_admin_role(
  target_email TEXT,
  requesting_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  requesting_role TEXT;
  target_role TEXT;
BEGIN
  -- Получаем роль запрашивающего
  SELECT role INTO requesting_role 
  FROM users 
  WHERE LOWER(email) = LOWER(requesting_email);
  
  -- Только super_admin может убирать админов
  IF requesting_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can remove admin role';
  END IF;
  
  -- Получаем роль target
  SELECT role INTO target_role 
  FROM users 
  WHERE LOWER(email) = LOWER(target_email);
  
  -- Нельзя менять super_admin
  IF target_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change super_admin role';
  END IF;
  
  -- Убираем роль
  UPDATE users 
  SET role = 'user' 
  WHERE LOWER(email) = LOWER(target_email);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Добавим индекс для быстрой проверки ролей
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. Проверка: вывод текущих админов (для логов)
-- SELECT email, role FROM users WHERE role IN ('admin', 'super_admin');

COMMENT ON COLUMN users.role IS 'User role: user, admin, or super_admin. Managed via admin panel or SQL. No longer hardcoded!';
















