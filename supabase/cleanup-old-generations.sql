-- Удалить все генерации кроме последних 3
DELETE FROM generations
WHERE id NOT IN (
  SELECT id
  FROM generations
  ORDER BY created_at DESC
  LIMIT 3
);

-- Показать оставшиеся генерации
SELECT id, model_name, status, created_at, viewed
FROM generations
ORDER BY created_at DESC;

