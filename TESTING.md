# 🧪 Testing Guide for BASE

## Виды тестирования

### 1. API Testing (Автоматизированное)

Быстрая проверка всех API endpoints:

```bash
npx ts-node scripts/test-api.ts
```

Проверяет:
- Доступность endpoints
- Время отклика
- HTTP статусы

---

### 2. Load Testing (Нагрузочное)

Симуляция множества пользователей:

```bash
# Локально (10 юзеров, 5 запросов каждый)
npx ts-node scripts/load-test.ts

# На production (осторожно!)
TEST_URL=https://your-app.vercel.app CONCURRENT_USERS=20 REQUESTS_PER_USER=10 npx ts-node scripts/load-test.ts
```

Метрики:
- Requests per second (RPS)
- Response time (P50, P95, P99)
- Error rate
- Throughput

---

### 3. Manual Testing Checklist

#### 📸 Создание изображений

| Тест | Модель | Ожидание |
|------|--------|----------|
| Простая генерация | Z-Image Turbo | < 10 сек |
| С референсом | FLUX 2 Pro | < 30 сек |
| SVG логотип | Recraft V3 SVG | < 20 сек |
| Разные форматы | Любая | 1:1, 16:9, 9:16 работают |
| Seed | Любая | Тот же seed = тот же результат |

#### ✏️ Редактирование

| Тест | Модель | Ожидание |
|------|--------|----------|
| Edit с промптом | FLUX Kontext Max | Изменения по описанию |
| Inpaint с маской | FLUX Fill Pro | Заполнение области |
| Remove BG | Bria Remove BG | Прозрачный фон |
| Expand | Bria Expand | Расширенные границы |
| Erase объект | Bria Eraser | Объект удалён |

#### 🎬 Видео

| Тест | Модель | Ожидание |
|------|--------|----------|
| T2V | Veo 3.1 Fast | Видео по описанию |
| I2V | Kling v2.5 | Анимация из картинки |
| Style transfer | Luma Modify | Изменение стиля |
| Субтитры | Autocaption | Караоке-эффект |
| Звук | MMAudio | Добавлен звук |

#### 🔍 Анализ

| Тест | Модель | Ожидание |
|------|--------|----------|
| Описание | Moondream 2 | Текстовое описание |
| OCR | DeepSeek OCR | Извлечённый текст |
| Prompt | CLIP Interrogator | Промпт для генерации |

---

### 4. E2E User Flows

#### Flow 1: Новый пользователь
```
1. Регистрация (email/password)
2. Попадание в workspace
3. Создание первой генерации
4. Просмотр результата
5. Скачивание
```

#### Flow 2: Генерация с ошибкой
```
1. Создать генерацию
2. Симулировать ошибку (сложный промпт)
3. Проверить auto-retry (до 3 попыток)
4. Проверить понятное сообщение об ошибке
```

#### Flow 3: История и фильтры
```
1. Создать несколько генераций
2. Перейти в историю
3. Фильтр "Только мои" вкл/выкл
4. Фильтр по модели
5. Фильтр по статусу
6. Фильтр по дате
```

#### Flow 4: Workspaces (Admin)
```
1. Войти как admin
2. Создать новое пространство
3. Добавить участника
4. Переключиться между пространствами
5. Проверить что генерации привязаны к workspace
```

---

### 5. Security Testing

```
□ SQL Injection в промптах
□ XSS в выводе
□ CSRF protection
□ Rate limiting
□ Auth bypass attempts
□ File upload validation
□ API key exposure
```

---

### 6. Performance Testing

```
□ Lighthouse score > 80
□ First Contentful Paint < 2s
□ Time to Interactive < 3s
□ Bundle size reasonable
□ Images optimized
□ No memory leaks
```

Запуск Lighthouse:
```bash
# В Chrome DevTools -> Lighthouse tab
# Или через CLI:
npx lighthouse https://your-app.vercel.app --view
```

---

### 7. Cross-browser Testing

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Safari | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Edge | ✅ | - |

---

### 8. Error Scenarios

```
□ Network offline -> показать сообщение
□ API timeout -> retry + сообщение
□ Invalid input -> validation message
□ Large file upload -> size limit message
□ Replicate unavailable -> fallback message
□ NSFW content blocked -> понятное объяснение
```

---

## Quick Test Commands

```bash
# API tests
npx ts-node scripts/test-api.ts

# Load tests
npx ts-node scripts/load-test.ts

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build check
npm run build
```

---

## Production Checklist

Перед релизом:

- [ ] Все API тесты проходят
- [ ] Нагрузочное тестирование пройдено
- [ ] Manual testing checklist выполнен
- [ ] Lighthouse score > 80
- [ ] No console errors
- [ ] Error tracking настроен (Sentry)
- [ ] Analytics настроен
- [ ] Backup базы данных
- [ ] SSL сертификат валиден
- [ ] Environment variables в Vercel




