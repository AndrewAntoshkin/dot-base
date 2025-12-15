-- Исправление названия пространства
UPDATE workspaces 
SET name = 'Яндекс Еда' 
WHERE slug = 'yandex-eda';

-- Проверка
SELECT name, slug FROM workspaces WHERE slug = 'yandex-eda';
