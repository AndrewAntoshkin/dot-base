-- ===========================================
-- Migration: Перенос данных в пространство "Яндекс Еда"
-- Запустить ПОСЛЕ add_workspaces.sql
-- ===========================================

-- 1. Создать пространство "Яндекс Еда"
INSERT INTO workspaces (name, slug, description, created_by)
SELECT 
  'Яндекс Еда',
  'yandex-eda',
  'Основное рабочее пространство команды Яндекс Еда',
  (SELECT id FROM users WHERE email = 'andrew.antoshkin@gmail.com' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces WHERE slug = 'yandex-eda'
);

-- 2. Получить ID созданного пространства
DO $$
DECLARE
  workspace_uuid UUID;
  user_record RECORD;
BEGIN
  -- Получаем ID workspace
  SELECT id INTO workspace_uuid FROM workspaces WHERE slug = 'yandex-eda';
  
  IF workspace_uuid IS NULL THEN
    RAISE EXCEPTION 'Workspace yandex-eda not found!';
  END IF;

  -- 3. Добавить всех существующих пользователей в пространство
  FOR user_record IN 
    SELECT id, email, role FROM users WHERE is_active = true
  LOOP
    -- Определяем роль в workspace на основе глобальной роли
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (
      workspace_uuid,
      user_record.id,
      CASE 
        WHEN user_record.role = 'super_admin' THEN 'owner'
        WHEN user_record.role = 'admin' THEN 'admin'
        ELSE 'member'
      END,
      (SELECT id FROM users WHERE email = 'andrew.antoshkin@gmail.com' LIMIT 1)
    )
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added user % (%) to workspace with role %', 
      user_record.email, 
      user_record.id,
      CASE 
        WHEN user_record.role = 'super_admin' THEN 'owner'
        WHEN user_record.role = 'admin' THEN 'admin'
        ELSE 'member'
      END;
  END LOOP;

  -- 4. Привязать все существующие генерации к пространству
  UPDATE generations 
  SET workspace_id = workspace_uuid
  WHERE workspace_id IS NULL;
  
  RAISE NOTICE 'Updated % generations with workspace_id', 
    (SELECT COUNT(*) FROM generations WHERE workspace_id = workspace_uuid);

END $$;

-- ===========================================
-- 5. Проверка результатов миграции
-- ===========================================

-- Проверка пространства
SELECT 
  'Workspace' as entity,
  name,
  slug,
  (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = workspaces.id) as members_count
FROM workspaces
WHERE slug = 'yandex-eda';

-- Проверка участников
SELECT 
  'Members' as entity,
  u.email,
  wm.role as workspace_role,
  u.role as global_role,
  wm.joined_at
FROM workspace_members wm
JOIN users u ON u.id = wm.user_id
JOIN workspaces w ON w.id = wm.workspace_id
WHERE w.slug = 'yandex-eda'
ORDER BY wm.role, u.email;

-- Проверка генераций
SELECT 
  'Generations' as entity,
  COUNT(*) as total,
  COUNT(CASE WHEN workspace_id IS NOT NULL THEN 1 END) as with_workspace,
  COUNT(CASE WHEN workspace_id IS NULL THEN 1 END) as without_workspace
FROM generations;

-- ===========================================
-- ГОТОВО! Миграция завершена
-- ===========================================
