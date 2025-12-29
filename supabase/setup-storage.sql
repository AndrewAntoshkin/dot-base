-- ===========================================
-- НАСТРОЙКА STORAGE BUCKET ДЛЯ ГЕНЕРАЦИЙ
-- ===========================================
-- Выполните этот SQL в Supabase SQL Editor
-- ИЛИ создайте bucket через Dashboard

-- 1. Создать bucket (если не существует)
-- Это нужно делать через Dashboard или API, SQL не поддерживает
-- Dashboard: Storage > New Bucket > "generations" > Public: YES

-- 2. Политики доступа для bucket 'generations'

-- Разрешить публичный доступ на чтение (для отображения изображений)
CREATE POLICY "Public read access for generations"
ON storage.objects FOR SELECT
USING (bucket_id = 'generations');

-- Разрешить сервису загружать файлы
CREATE POLICY "Service role can upload to generations"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generations');

-- Разрешить сервису обновлять файлы (upsert)
CREATE POLICY "Service role can update generations"
ON storage.objects FOR UPDATE
USING (bucket_id = 'generations');

-- Разрешить сервису удалять файлы
CREATE POLICY "Service role can delete from generations"
ON storage.objects FOR DELETE
USING (bucket_id = 'generations');

-- ===========================================
-- ИНСТРУКЦИЯ ПО НАСТРОЙКЕ В DASHBOARD
-- ===========================================
/*
1. Перейдите в Supabase Dashboard
2. Storage > New Bucket
3. Заполните:
   - Name: generations
   - Public bucket: ✅ ВКЛ
4. Нажмите "Create bucket"

5. После создания bucket:
   - Нажмите на bucket "generations"
   - Policies > New Policy
   - Выберите "For full customization"
   - Добавьте политики выше

ИЛИ используйте готовый шаблон:
   - "Give users access to a folder only accessible to them"
   - Измените на "Give public read access"
*/


















