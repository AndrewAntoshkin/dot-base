# Database

## Overview

PostgreSQL via Supabase. Schema: `supabase/schema.sql`. Migrations: `supabase/migrations/`.

## Tables

| Table | Purpose | Key Columns | RLS |
|-------|---------|-------------|-----|
| `users` | User profiles | `id`, `email`, `telegram_username`, `role`, `credits`, `is_active` | Yes |
| `generations` | AI generation records | `id`, `user_id`, `workspace_id`, `action`, `model_id`, `status`, `output_urls`, `cost_usd` | Yes |
| `replicate_tokens` | API token pool (10 tokens) | `id`, `token`, `is_active`, `request_count`, `error_count` | Yes (service_role only) |
| `workspaces` | Multi-tenant workspaces | `id`, `name`, `slug`, `created_by` | Yes |
| `workspace_members` | Workspace membership | `workspace_id`, `user_id`, `role` (owner/admin/member) | Yes |
| `flows` | Visual pipeline definitions | `id`, `user_id`, `name`, `nodes`, `edges`, `viewport_*` | Yes |
| `flow_nodes` | Individual flow nodes | `id`, `flow_id`, `type`, `data`, `position_*` | Yes |
| `flow_edges` | Node connections | `id`, `flow_id`, `source`, `target` | Yes |
| `flow_invites` | Flow sharing tokens | `flow_id`, `token`, `created_by` | Yes |
| `flow_members` | Flow access control | `flow_id`, `user_id`, `role` | Yes |
| `flow_comments` | Comments on flows | `flow_id`, `user_id`, `content`, `position_*` | Yes |
| `user_loras` | LoRA trained models | `id`, `user_id`, `name`, `status`, `replicate_training_id` | Yes |
| `lora_training_images` | LoRA training data | `lora_id`, `storage_path` | Yes |
| `notifications` | User notifications | `id`, `user_id`, `type`, `title`, `read` | Yes |
| `ideas` | Feature voting | `id`, `title`, `votes`, `author_id` | Yes |
| `assistant_conversations` | AI chat sessions | `id`, `user_id`, `title`, `preview_text` | Yes |
| `assistant_messages` | Chat messages | `conversation_id`, `role`, `content`, `images` | Yes |
| `api_logs` | API request logs | `id`, `method`, `path`, `status_code`, `duration_ms`, `user_id`, `provider` | Yes |
| `support_tickets` | Support requests | `id`, `user_id`, `message`, `status` | Yes |

## Key Relationships

- `generations.user_id` → `users.id`
- `generations.workspace_id` → `workspaces.id`
- `workspace_members.workspace_id` → `workspaces.id`
- `workspace_members.user_id` → `users.id`
- `flows.user_id` → `users.id`
- `flow_nodes/edges.flow_id` → `flows.id`
- `user_loras.user_id` → `users.id`
- `assistant_messages.conversation_id` → `assistant_conversations.id`

## Row Level Security (RLS)

All tables have RLS enabled. Patterns:

- **User data**: `auth.uid() = user_id` — users see only their own data
- **Workspace data**: membership check via `workspace_members` join
- **Flow data**: owner or member check via `flow_members`
- **Tokens**: `auth.role() = 'service_role'` only
- **Admin operations**: use service role client (`lib/supabase/server.ts` → `createServiceRoleClient()`)

WARNING: Never use anon key for admin queries. Always use service role client.

## RPC Functions

| Function | Purpose | File/Migration |
|----------|---------|---------------|
| `get_next_replicate_token()` | Round-robin token selection with `FOR UPDATE SKIP LOCKED` | `schema.sql` |
| `get_generation_counts(user_id)` | Fast count aggregation (all/processing/favorites/failed) | `optimize_disk_io.sql` |
| `get_workspace_generation_counts(ws_id)` | Workspace-scoped counts | `add_workspace_counts_function.sql` |
| `refresh_admin_stats()` | Refresh materialized view for admin dashboard | `optimize_disk_io.sql` |
| `cleanup_old_generations(days)` | Delete failed generations older than N days | `optimize_disk_io.sql` |
| `update_generation_status()` | Trigger: auto-set `started_at`, `completed_at`, `processing_time_ms` | `schema.sql` |

## Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `generations` | Public read, auth upload | Generated images/videos + thumbnails |
| `lora-training-images` | Auth only | LoRA training uploads |
| `lora-models` | Auth only | Trained LoRA model weights |

Setup: `supabase/setup-storage.sql`

## Migrations

Location: `supabase/migrations/`. Applied manually via Supabase SQL Editor.

Key migrations (chronological):

| Migration | Purpose |
|-----------|---------|
| `add_video_support.sql` | `input_video_url`, video actions, output_thumbs |
| `add_cost_tracking.sql` | `cost_usd` column on generations |
| `add_workspaces.sql` | Workspaces + members tables |
| `add_lora_support.sql` | LoRA tables + storage buckets |
| `add_admin_roles.sql` | `super_admin` role, admin RLS bypass |
| `add_performance_indexes.sql` | Composite indexes for list queries |
| `optimize_disk_io.sql` | Disable realtime, materialized view, autovacuum tuning |
| `20260119_create_flows.sql` | Flow/node/edge tables |
| `20260121_flow_collaboration.sql` | Flow invites + members |
| `20260127_flow_comments.sql` | Flow comments with positions |
| `20260128_add_notifications.sql` | Notifications table |
| `add_assistant_chat_history.sql` | Assistant conversations + messages |
| `20260219_add_api_logs.sql` | API logging table |

## Performance Optimizations

### Indexes

Key indexes on `generations`:
- `(user_id, created_at DESC)` — main list query
- `(user_id, workspace_id, created_at DESC)` — workspace list
- `(user_id, status)` — count queries
- `(replicate_prediction_id)` — webhook lookups
- Partial index: `WHERE is_keyframe_segment IS NOT TRUE` — excludes keyframe segments from list

### Realtime

Disabled for `generations` table (caused excessive WAL writes). Replaced with polling.

### Polling Intervals

| Context | Interval | File |
|---------|----------|------|
| Active generation | 5 sec | `contexts/generations-context.tsx` |
| Idle | 60 sec | `contexts/generations-context.tsx` |
| Background tab | 120 sec | `contexts/generations-context.tsx` |

### Cron Jobs (pg_cron)

```sql
-- Refresh admin stats every 5 min
SELECT cron.schedule('refresh-admin-stats', '*/5 * * * *', 'SELECT refresh_admin_stats()');
-- Cleanup failed generations weekly
SELECT cron.schedule('cleanup-old-generations', '0 3 * * 0', 'SELECT cleanup_old_generations(90)');
```

### Autovacuum

Custom settings for `generations` table:
- `autovacuum_vacuum_scale_factor = 0.05` (vs default 0.2)
- `autovacuum_analyze_scale_factor = 0.02`

## Supabase Client Patterns

| Client | File | Use |
|--------|------|-----|
| Server (anon key) | `lib/supabase/server.ts` → `createServerSupabaseClient()` | User-context queries |
| Service role | `lib/supabase/server.ts` → `createServiceRoleClient()` | Admin ops, webhooks |
| Browser | `lib/supabase/client.ts` | Client-side queries |
| Middleware (singleton) | `middleware.ts` → `getServiceClient()` | Role checks |
| Auth helpers (cached) | `lib/supabase/auth-helpers.ts` | Deduplicated auth via React `cache()` |
| Types | `lib/supabase/types.ts` | TypeScript types for all tables |
