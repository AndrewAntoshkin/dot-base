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

### Option 2: PM2 Self-Hosted

Config: `ecosystem.config.cjs`, deploy script: `deploy.sh`

| Setting | Value |
|---------|-------|
| Process name | `basecraft` |
| Memory limit | 3500 MB (auto-restart) |
| V8 heap limit | 3584 MB (`--max-old-space-size`) |
| Logs | `logs/pm2-error.log`, `logs/pm2-out.log` |
| Node path | `/opt/fnode/bin/node` |

Deploy command:
```bash
./deploy.sh  # git pull → clear cache → build → pm2 reload
```

Key commands:
```bash
pm2 show basecraft        # Process status
pm2 logs basecraft        # View logs
pm2 monit                 # Live monitoring
pm2 reload ecosystem.config.cjs  # Zero-downtime restart
```

### Nginx (for PM2 option)

Config files: `nginx_config`, `nginx_proxy_config` in project root.

## Supabase Setup

1. Create project on supabase.com (Pro plan for production)
2. Run `supabase/schema.sql` in SQL Editor
3. Apply migrations from `supabase/migrations/` (chronologically)
4. Create storage bucket `generations` (public read, auth upload)
5. Run `supabase/setup-storage.sql` for storage policies
6. Insert Replicate tokens into `replicate_tokens` table (10 tokens)
7. Copy Project URL, anon key, service role key to env vars

## Monitoring

### Vercel
- Speed Insights + Web Analytics (enable in Vercel dashboard)
- Function logs in Vercel → Deployments → Functions

### Supabase
- Database Reports: disk IO, connections, query latency
- Disk IO budget: keep below 80% (see `DATABASE.md` for optimization)
- `api_logs` table: request/response metrics logged by `withApiLogging()`

### PM2
```bash
pm2 show basecraft          # Status, memory, restarts
pm2 logs basecraft --lines 100  # Recent logs
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
2. Check Vercel/PM2 logs for errors
3. Verify Replicate account balances
4. Check webhook URL: `NEXTAUTH_URL` must be accessible from internet

### Slow or stuck generations
1. Check `generations` table for `status = 'processing'` older than 10 min
2. Run `/api/generations/cleanup-stale` to clean stuck records
3. Check token pool distribution: `SELECT id, request_count, error_count FROM replicate_tokens`

### Auth errors
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check RLS policies: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
3. Check middleware logs for timeout errors (10s limit)

### OOM / Memory issues (PM2)
1. Check Sharp cache: must be `sharp.cache(false)` in `lib/supabase/storage.ts`
2. Check concurrent limits: `MAX_CONCURRENT_MEDIA = 2`, `MAX_CONCURRENT_GENERATIONS = 5`
3. Check PM2 memory: `pm2 show basecraft` — if approaching 3.5GB, investigate
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
