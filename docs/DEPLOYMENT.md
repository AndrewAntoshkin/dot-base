# Deployment & Operations

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (SECRET) |
| `NEXTAUTH_URL` | Yes | App URL (used for webhook callbacks) |
| `NEXTAUTH_SECRET` | Yes | NextAuth session secret |
| `REPLICATE_API_TOKENS` | No | Tokens stored in DB, not env |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot for auth/support |
| `FAL_KEY` | Optional | FAL AI API key |
| `GOOGLE_AI_API_KEY` | Optional | Google Generative AI key |
| `HIGGSFIELD_API_KEY` | Optional | Higgsfield API key |
| `RESEND_API_KEY` | Optional | Email via Resend |
| `CRON_SECRET` | Optional | Cron job authentication |

WARNING: Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

**Important:** `ecosystem.config.cjs` does NOT parse `.env.local`. Next.js reads `.env.local` automatically on each start. PM2 config only sets `NODE_ENV`, `NODE_OPTIONS`, and `PORT`.

## Local Development

```bash
# Prerequisites: Node.js 18+
npm install
cp .env.example .env.local  # Fill in values
npm run dev                  # http://localhost:3000
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Run all tests |
| `npm run test:api` | API tests only |
| `npm run test:load` | Load tests |
| `npm run test:e2e` | Playwright E2E tests |

## Deployment Options

### Option 1: Vercel (Recommended)

Config: `vercel.json`

- Region: `fra1` (Frankfurt)
- Auto-deploy on push to `main`
- Preview deploys for PRs
- Cron: `/api/cron/cleanup` daily at 3 AM

Function timeouts:

| Route | Timeout |
|-------|---------|
| `/api/health` | 5s |
| `/api/generations/list`, `/api/generations/sync-status` | 30s |
| `/api/upload`, `/api/generations/create` | 60s |
| `/api/webhook/*`, `/api/cron/cleanup` | 120s |
| `/api/keyframes/generate` | 300s |

Setup: Import GitHub repo on vercel.com → Set env vars → Deploy.

### Option 2: PM2 Self-Hosted (Blue-Green)

Config: `ecosystem.config.cjs`, deploy script: `deploy.sh`

#### Blue-Green Strategy

Deploy uses two PM2 slots that alternate on each deploy — zero downtime:

| Slot | PM2 Name | Port | Logs |
|------|----------|------|------|
| Blue | `basecraft-blue` | 3000 | `logs/pm2-blue-*.log` |
| Green | `basecraft-green` | 3001 | `logs/pm2-green-*.log` |

| Setting | Value |
|---------|-------|
| Memory limit | 3500 MB (auto-restart) |
| V8 heap limit | 3584 MB (`--max-old-space-size`) |
| Node path | `/opt/fnode/bin/node` |
| Script | `node_modules/.bin/next start` (direct, not via npm) |

#### Deploy Flow

```
./deploy.sh
```

1. Detect active slot (reads port from nginx config)
2. `git pull` latest code
3. `npm run build` (old server still running)
4. Start new slot on inactive port
5. Health check: wait for `/api/health` to respond (max 30s)
6. `sudo sed` — switch port in nginx configs
7. `sudo nginx -s reload` — apply new port
8. Stop old slot
9. `pm2 save`

If the new slot fails health check — automatic rollback, old slot untouched.

#### Key Commands

```bash
pm2 list                          # See active slots
pm2 show basecraft-blue           # Process status
pm2 show basecraft-green          # Process status
pm2 logs basecraft-blue           # View logs
pm2 logs basecraft-green          # View logs
pm2 monit                         # Live monitoring
```

#### Initial Setup (one time)

```bash
# 1. Sudoers — allow deploy.sh to modify nginx configs
echo 'basecraft ALL=(root) NOPASSWD: /usr/bin/sed, /usr/sbin/nginx' > /etc/sudoers.d/basecraft-deploy
chmod 440 /etc/sudoers.d/basecraft-deploy

# 2. Copy nginx configs from repo
cp nginx_config /etc/nginx/fastpanel2-sites/basecraft/basecraft.ru.conf
cp nginx_proxy_config /etc/nginx/fastpanel2-sites/basecraft/basecraft.wdda.pro.conf
nginx -t && nginx -s reload

# 3. Start first slot
pm2 delete basecraft 2>/dev/null || true
pm2 start ecosystem.config.cjs --only basecraft-blue
pm2 save
```

### Nginx

Two config files in project root (reference copies):

| File | Server | Purpose |
|------|--------|---------|
| `nginx_config` | basecraft.ru | Main site. Has `upstream basecraft` block with active port. `deploy.sh` changes port via `sed`. |
| `nginx_proxy_config` | basecraft.wdda.pro | Webhook-only domain. Direct `proxy_pass` to port. `deploy.sh` changes port via `sed`. |

Server configs live at `/etc/nginx/fastpanel2-sites/basecraft/`. The repo files are templates — `deploy.sh` modifies the server copies directly.

## Supabase Setup

1. Create project on supabase.com (Pro plan for production)
2. Run `supabase/schema.sql` in SQL Editor
3. Apply migrations from `supabase/migrations/` (chronologically)
4. Create storage bucket `generations` (public read, auth upload)
5. Run `supabase/setup-storage.sql` for storage policies
6. Insert Replicate tokens into `replicate_tokens` table (10 tokens)
7. Copy Project URL, anon key, service role key to env vars

## Monitoring

### Logging

Logger levels (`lib/logger.ts`):

| Level | Production | Development |
|-------|-----------|-------------|
| `debug` | suppressed | console.log |
| `info` | console.log | console.log |
| `warn` | console.warn | console.warn |
| `error` | console.error | console.error |

All levels except `debug` are visible in PM2 logs on production.

### Vercel
- Speed Insights + Web Analytics (enable in Vercel dashboard)
- Function logs in Vercel → Deployments → Functions

### Supabase
- Database Reports: disk IO, connections, query latency
- Disk IO budget: keep below 80% (see `DATABASE.md` for optimization)
- `api_logs` table: request/response metrics logged by `withApiLogging()`

### PM2
```bash
pm2 show basecraft-blue         # Status, memory, restarts
pm2 logs basecraft-blue --lines 100  # Recent logs
```

### Admin Dashboard
`/admin` → stats, users, errors, memory, cleanup — accessible to admin/super_admin users.

## Testing

### Automated

| Test Type | Command | Location |
|-----------|---------|----------|
| All tests | `npm test` | `tests/run-all-tests.ts` |
| API tests | `npm run test:api` | `tests/api/` |
| Load tests | `npm run test:load` | `tests/load/` |
| E2E tests | `npm run test:e2e` | `tests/e2e/` (Playwright) |

### Pre-Release Checklist

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` succeeds
- API tests pass
- Test generation create → webhook → result display
- Check admin dashboard loads
- Update `docs/CHANGELOG.md`

## Troubleshooting

### Generations not creating
1. Check `replicate_tokens` — are tokens active? Any with high `error_count`?
2. Check PM2 logs for errors (`pm2 logs basecraft-blue`)
3. Verify Replicate/FAL account balances
4. Check webhook URL: `NEXTAUTH_URL` must be accessible from internet

### Slow or stuck generations
1. Image generations stuck >5 min are auto-cleaned on next create request
2. Check `generations` table for `status = 'processing'` older than 10 min
3. For video generations (no auto-cleanup): run `/api/cron/cleanup`
4. Check token pool distribution: `SELECT id, request_count, error_count FROM replicate_tokens`

### FAL webhook not working
1. Check PM2 logs for `[Fal Webhook]` entries
2. FAL sends `status: "OK"` on success (not "COMPLETED")
3. Verify nginx proxy config routes `/api/webhook/` to the active port
4. Test webhook manually: `curl -X POST http://127.0.0.1:PORT/api/webhook/fal -H "Content-Type: application/json" -d '{"request_id":"test","status":"OK","payload":{"images":[{"url":"https://fal.media/test.jpg"}]}}'`

### Auth errors
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check RLS policies: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
3. Check middleware logs for timeout errors (10s limit)

### OOM / Memory issues (PM2)
1. Check Sharp cache: must be `sharp.cache(false)` in `lib/supabase/storage.ts`
2. Check concurrent limits: `MAX_CONCURRENT_MEDIA = 2`, `MAX_CONCURRENT_GENERATIONS = 5`
3. Check PM2 memory: `pm2 show basecraft-blue` — if approaching 3.5GB, investigate
4. Check Replicate SDK cache: should use `Map<string, Replicate>` in `lib/replicate/client.ts`
5. See `ARCHITECTURE.md` > Performance Constraints for full list

### Russia / blocked regions
1. Try VPN with advanced protocols (VLESS/TLS, Shadowsocks, WireGuard)
2. Change DNS to Cloudflare (1.1.1.1) or Google (8.8.8.8)
3. Use custom domain instead of `*.vercel.app`
4. Try mobile internet (different blocking rules)
5. The app has `/api/proxy/[...path]` for proxying Supabase requests

### Disk IO warnings (Supabase)
1. Verify realtime is disabled for `generations` table
2. Check polling intervals: 5s active, 60s idle, 120s background
3. Verify cron jobs are running (admin stats refresh, cleanup)
4. See `DATABASE.md` > Performance Optimizations

## Utility Scripts

Located in `scripts/`. Run with `npx ts-node scripts/<name>.ts`.

| Script | Purpose |
|--------|---------|
| `test-api.ts` | Quick API endpoint check |
| `load-test.ts` | Load testing with concurrent users |
| `backfill-costs.ts` | Backfill cost data for old generations |
| `sync-replicate-costs.ts` | Sync costs from Replicate API |
| `cleanup-*.ts` | Various data cleanup scripts |
| `content-team-report*.ts` | Analytics reports |
| `generate-invoice.ts` | Invoice generation |
| `setup-telegram-webhook.ts` | Configure Telegram webhook |
| `test-models*.ts` | Test specific model integrations |

## Security Checklist

- RLS enabled on all tables
- Service role key never in client code
- Input validation (Zod) on all API endpoints
- File upload: max 14 files, max 10MB per file
- Concurrent generation limit: 5 per user
- Media download semaphore: 2 concurrent
- API routes handle their own auth (not relying on middleware)
- Webhooks validated by prediction ID lookup