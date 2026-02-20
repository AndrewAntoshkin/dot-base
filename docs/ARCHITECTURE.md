# Architecture

## Tech Stack

| Layer | Technology | Version | Config File |
|-------|-----------|---------|-------------|
| Framework | Next.js (App Router) | 16.x | `next.config.js` |
| Language | TypeScript (strict) | 5.6 | `tsconfig.json` |
| Styling | Tailwind CSS | 3.4 | `tailwind.config.ts` |
| UI Components | Radix UI + shadcn/ui | — | `components/ui/` |
| State (client) | Zustand + React Query | 4.5 / 5.56 | `lib/flow/store.ts`, `contexts/` |
| Database | Supabase (PostgreSQL) | — | `lib/supabase/` |
| Auth | Supabase Auth + Telegram | — | `lib/auth.ts`, `middleware.ts` |
| Storage | Supabase Storage | — | `lib/supabase/storage.ts` |
| Image Processing | Sharp | 0.33 | `lib/supabase/storage.ts` |
| Visual Editor | XYFlow | 12.10 | `components/flow/` |
| Icons | Lucide React | 0.446 | — |
| Validation | Zod | 3.23 | — |
| Email | Resend + Nodemailer | — | — |
| Deploy | Vercel / PM2 | — | `vercel.json`, `ecosystem.config.cjs` |

## Project Structure

```
app/                    # Next.js App Router
  api/                  # 72+ API routes (REST)
  (feature)/page.tsx    # Feature pages (history, video, flow, admin, etc.)
  auth/callback/        # OAuth callback
  docs/                 # In-app documentation pages
components/             # React components
  ui/                   # Base UI (button, input, select, etc.)
  flow/                 # Flow editor components
  pages/                # Page-level client components
  notifications/        # Notification UI
  providers/            # App-level context providers
contexts/               # React contexts
  user-context.tsx      # Auth state, user profile
  generations-context.tsx # Generation polling, counts
lib/                    # Server utilities & configuration
  replicate/            # Replicate API client + token pool
  fal/                  # FAL AI client
  google/               # Google Generative AI client
  higgsfield/           # Higgsfield client
  supabase/             # Supabase clients, storage, types
  flow/                 # Flow store (Zustand) + types
  auth.ts               # Centralized auth module
  models-config.ts      # Full model catalog (187KB)
  models-lite.ts        # Lightweight model list for client
  models-limits.ts      # Rate limits per model
  pricing.ts            # Cost calculations
  with-api-logging.ts   # API route logging wrapper
supabase/               # DB schema & migrations
  schema.sql            # Full schema
  migrations/           # Chronological SQL migrations
scripts/                # Admin scripts (37 files)
tests/                  # API, E2E, load, SQL tests
public/                 # Static assets, fonts, images
middleware.ts           # Route protection, session caching
```

## Request Lifecycle: Generation

1. Client submits form → `POST /api/generations/create`
2. Route validates input, checks auth & concurrent limit (max 5)
3. Route selects provider based on model config (Replicate/FAL/Google/Higgsfield)
4. Provider client sends request to external API with webhook URL
5. DB record created with `status: processing`
6. External API completes → calls `POST /api/webhook/{provider}`
7. Webhook downloads media → creates thumbnail via Sharp → uploads to Supabase Storage
8. DB record updated with `status: completed`, `output_urls`
9. Client polls `/api/generations/list` (every 5s active / 60s idle) → shows result

## AI Provider Architecture

| Provider | Client File | Primary Use |
|----------|------------|-------------|
| Replicate | `lib/replicate/client.ts` | Image generation, editing, upscaling, bg removal |
| FAL AI | `lib/fal/client.ts` | Video generation (Kling, Seedance, etc.) |
| Google GenAI | `lib/google/client.ts` | Imagen, Gemini analysis, assistant chat |
| Higgsfield | `lib/higgsfield/client.ts` | Alternative video generation |

Provider routing: `app/api/generations/create/route.ts` checks `model.provider` field from `models-config.ts`.

### Token Pool (Replicate)

File: `lib/replicate/token-pool.ts`

- 10 API tokens stored in `replicate_tokens` DB table
- Round-robin distribution via `get_next_replicate_token()` RPC
- In-memory SDK instance cache (`Map<string, Replicate>`) to avoid creating new instances per request
- Error tracking per token (`requestCount`, `errorCount`)

## Authentication & Authorization

### Auth Flow

1. User logs in via OAuth (Google) or Telegram → `app/auth/callback/route.ts`
2. Supabase Auth creates session, stores in cookies
3. Middleware (`middleware.ts`) checks session on protected routes
4. API routes call `getAuthUser()` from `lib/auth.ts`

### Role System

| Role | Access | Check Function |
|------|--------|---------------|
| `user` | Standard features | `getAuthUser()` |
| `admin` | + Admin panel, user management | `requireAdmin()` |
| `super_admin` | + Full system control | `requireSuperAdmin()` |

### Route Protection

- **Middleware** protects pages: `/history`, `/result`, `/video`, `/analyze`, `/brainstorm`, `/inpaint`, `/expand`, `/keyframes`, `/profile`, `/workspaces`
- **Admin pages**: `/admin` — requires `admin` or `super_admin` role
- **API routes** handle their own auth via `getAuthUser()` (middleware skips `/api/*`)
- Session cache: 1-min cookie TTL. Role cache: 5-min cookie TTL.

## Media Pipeline

File: `lib/supabase/storage.ts`

1. Webhook receives completion → calls `saveGenerationMedia()`
2. Semaphore limits concurrent downloads (`MAX_CONCURRENT_MEDIA = 2`)
3. Files processed **sequentially** (not `Promise.all`) to minimize memory
4. Each file: download → upload to Supabase Storage → create thumbnail via Sharp → `buffer = null`
5. Sharp config: `cache(false)`, `concurrency(1)` — prevents native memory leaks

WARNING: `Promise.all` for media processing caused OOM (Feb 2026 incident). Always process sequentially.

## Performance Constraints

| Constraint | Value | File |
|-----------|-------|------|
| Max concurrent generations per user | 5 | `app/api/generations/create/route.ts` |
| Max concurrent media downloads | 2 | `lib/supabase/storage.ts` |
| V8 heap limit | 4096 MB | `ecosystem.config.cjs` |
| PM2 memory restart | 4 GB | `ecosystem.config.cjs` |
| Sharp concurrency | 1 thread | `lib/supabase/storage.ts` |
| Auth timeout (middleware) | 10 sec | `middleware.ts` |
| Polling: active / idle | 5s / 60s | `contexts/generations-context.tsx` |
| Upload: max files / max size | 14 / 10 MB | `app/api/upload/route.ts` |

### Known Incidents

- **OOM Feb 12, 2026**: Unbounded parallel media processing. Fixed: semaphore + sequential processing.
- **Memory leak Feb 16, 2026**: `new Replicate()` per request + Sharp cache + buffer leaks. Fixed: SDK instance cache, `sharp.cache(false)`, immediate buffer nullification.

## Code Conventions

Source: `.cursorrules`

| Convention | Pattern |
|-----------|---------|
| Files | kebab-case (`action-selector.tsx`) |
| Components | PascalCase (`ActionSelector`) |
| Functions/vars | camelCase (`getUserData`) |
| Constants | UPPER_SNAKE_CASE (`MAX_RETRIES`) |
| Types | PascalCase (`UserData`) |
| Components | Functional + hooks, no class components |
| State | Zustand for complex state, React Query for API, Context for auth/user |
| Server vs Client | Server Components default; `'use client'` only for interactivity |
| Error responses | `{ error: string }` with proper HTTP status |
| Commits | Conventional commits (`feat:`, `fix:`, `docs:`) |
| Imports | Path alias `@/*` → project root |
