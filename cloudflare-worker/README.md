# Supabase Proxy через Cloudflare Workers

Этот прокси позволяет обходить гео-блокировки Supabase для пользователей из России и других стран.

## Как это работает

```
Пользователь в РФ → Cloudflare Edge → Supabase → Cloudflare Edge → Пользователь
```

Cloudflare имеет edge серверы в Москве, поэтому задержка минимальна (~10-50мс).

## Деплой

### 1. Установка Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Авторизация в Cloudflare

```bash
wrangler login
```

### 3. Деплой Worker

```bash
cd cloudflare-worker
wrangler deploy
```

После деплоя получишь URL вида:
```
https://supabase-proxy.YOUR_ACCOUNT.workers.dev
```

### 4. Настройка приложения

Добавь в `.env.local` и в Vercel Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_PROXY_URL=https://supabase-proxy.YOUR_ACCOUNT.workers.dev
```

## Конфигурация

### Разрешённые origins (CORS)

Отредактируй `ALLOWED_ORIGINS` в `supabase-proxy.js`:

```javascript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-domain.com',
  'https://your-app.vercel.app',
];
```

### Supabase URL

Замени `SUPABASE_URL` на свой:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
```

## Безопасность

- Worker не хранит никаких данных
- Все заголовки авторизации проксируются как есть
- CORS настроен только для разрешённых доменов
- Cloudflare headers удаляются перед отправкой в Supabase

## Мониторинг

В Cloudflare Dashboard → Workers → supabase-proxy → Analytics:
- Количество запросов
- Latency
- Ошибки
- Географическое распределение

## Лимиты

Cloudflare Workers Free Plan:
- 100,000 запросов/день
- 10ms CPU time на запрос
- Без ограничений по bandwidth

Для большинства приложений этого достаточно. При необходимости можно перейти на платный план.

## Troubleshooting

### Worker не отвечает

1. Проверь логи в Cloudflare Dashboard
2. Убедись что SUPABASE_URL правильный
3. Проверь CORS настройки

### 502 Bad Gateway

Supabase может быть недоступен. Проверь статус: https://status.supabase.com/

### CORS ошибки

Добавь свой домен в `ALLOWED_ORIGINS`.

