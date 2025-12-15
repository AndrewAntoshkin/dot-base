-- Исправление slugs для кириллических названий
-- Выполнить в Supabase Dashboard > SQL Editor

-- 1. Функция транслитерации
CREATE OR REPLACE FUNCTION translit_slug(input text) RETURNS text AS $$
DECLARE
    result text := lower(input);
BEGIN
    result := replace(result, 'а', 'a');
    result := replace(result, 'б', 'b');
    result := replace(result, 'в', 'v');
    result := replace(result, 'г', 'g');
    result := replace(result, 'д', 'd');
    result := replace(result, 'е', 'e');
    result := replace(result, 'ё', 'yo');
    result := replace(result, 'ж', 'zh');
    result := replace(result, 'з', 'z');
    result := replace(result, 'и', 'i');
    result := replace(result, 'й', 'y');
    result := replace(result, 'к', 'k');
    result := replace(result, 'л', 'l');
    result := replace(result, 'м', 'm');
    result := replace(result, 'н', 'n');
    result := replace(result, 'о', 'o');
    result := replace(result, 'п', 'p');
    result := replace(result, 'р', 'r');
    result := replace(result, 'с', 's');
    result := replace(result, 'т', 't');
    result := replace(result, 'у', 'u');
    result := replace(result, 'ф', 'f');
    result := replace(result, 'х', 'h');
    result := replace(result, 'ц', 'ts');
    result := replace(result, 'ч', 'ch');
    result := replace(result, 'ш', 'sh');
    result := replace(result, 'щ', 'sch');
    result := replace(result, 'ъ', '');
    result := replace(result, 'ы', 'y');
    result := replace(result, 'ь', '');
    result := replace(result, 'э', 'e');
    result := replace(result, 'ю', 'yu');
    result := replace(result, 'я', 'ya');
    -- Убираем все не-латинские символы
    result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
    -- Заменяем пробелы на дефисы
    result := regexp_replace(result, '\s+', '-', 'g');
    -- Убираем множественные дефисы
    result := regexp_replace(result, '-+', '-', 'g');
    -- Обрезаем до 50 символов
    result := substring(result from 1 for 50);
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Обновляем все slug с кириллицей
UPDATE workspaces 
SET slug = translit_slug(name)
WHERE slug ~ '[а-яё]' OR slug = '';

-- 3. Проверяем уникальность и добавляем суффикс при необходимости
DO $$
DECLARE
    ws RECORD;
    counter INTEGER;
    new_slug TEXT;
BEGIN
    FOR ws IN 
        SELECT id, name, slug 
        FROM workspaces 
        WHERE slug IN (
            SELECT slug FROM workspaces GROUP BY slug HAVING COUNT(*) > 1
        )
        ORDER BY created_at
    LOOP
        counter := 0;
        new_slug := ws.slug;
        WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = new_slug AND id != ws.id) LOOP
            counter := counter + 1;
            new_slug := ws.slug || '-' || counter;
        END LOOP;
        IF new_slug != ws.slug THEN
            UPDATE workspaces SET slug = new_slug WHERE id = ws.id;
        END IF;
    END LOOP;
END $$;

-- 4. Показываем результат
SELECT id, name, slug FROM workspaces ORDER BY created_at;

-- 5. Если нужно вручную исправить конкретные пространства:
-- UPDATE workspaces SET slug = 'novoe' WHERE name = 'Новое';
-- UPDATE workspaces SET slug = 'test' WHERE name = 'тест';
