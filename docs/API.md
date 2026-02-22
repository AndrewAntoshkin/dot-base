# API Reference

## Authentication

All protected routes use `getAuthUser()` from `lib/auth.ts`. Admin routes use `requireAdmin()` or `requireSuperAdmin()`.

Auth check returns `{ user: AuthUser, error: null }` or `{ user: null, error: NextResponse(401/403/404) }`.

API routes are excluded from middleware — they handle their own auth.

## Response Format

```typescript
// Success
{ data: any }  // or direct data object

// Error
{ error: string }  // with appropriate HTTP status code
```

## API Logging

Routes wrapped with `withApiLogging()` (from `lib/with-api-logging.ts`) log: method, path, status, duration, user_id, provider, model, generation_id, IP. Logs stored in `api_logs` table.

## Endpoint Index

### Generations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/generations/create` | User | Create generation (routes to provider) |
| GET | `/api/generations/list` | User | List generations with filters & pagination |
| GET | `/api/generations/counts` | User | Count by status (all/processing/favorites/failed) |
| GET | `/api/generations/[id]` | User | Get generation details |
| DELETE | `/api/generations/[id]` | User | Cancel/delete generation |
| POST | `/api/generations/[id]/favorite` | User | Toggle favorite |
| POST | `/api/generations/[id]/view` | User | Mark as viewed |
| POST | `/api/generations/[id]/retry` | User | Retry failed generation |
| POST | `/api/generations/view-all` | User | Mark all as viewed |
| GET | `/api/generations/filter-options` | User | Available filter values |
| POST | `/api/generations/sync-status` | User | Sync status with external provider |
| POST | `/api/generations/cleanup-stale` | Admin | Clean up stuck generations |
| GET | `/api/generations/cleanup-stale` | Admin | Stats on stale generations |

### Models

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/models/list` | User | List available models (filters by admin flag) |

### Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload` | User | Upload media to Supabase Storage (max 14 files, 10MB each) |

### Webhooks (External Provider Callbacks)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhook/replicate` | None | Replicate prediction completion |
| POST | `/api/webhook/fal` | None | FAL AI completion |
| POST | `/api/webhook/higgsfield` | None | Higgsfield completion |
| POST/GET | `/api/webhook/replicate-training` | None | LoRA training completion |

NOTE: Webhooks have no auth — they're called by external providers. Validated by prediction ID lookup.

### Flow

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/flow` | User | List user's flows |
| POST | `/api/flow` | User | Create flow |
| GET | `/api/flow/[id]` | Member | Get flow details |
| PUT | `/api/flow/[id]` | Member | Update flow (nodes, edges) |
| DELETE | `/api/flow/[id]` | Owner | Delete flow |
| PATCH | `/api/flow/[id]/status` | Member | Update flow kanban status |
| POST | `/api/flow/generate` | User | Generate from flow node |
| GET | `/api/flow/[id]/comments` | Member | List comments |
| POST | `/api/flow/[id]/comments` | Member | Add comment |
| PATCH | `/api/flow/[id]/comments/[commentId]` | Author | Edit comment |
| DELETE | `/api/flow/[id]/comments/[commentId]` | Author | Delete comment |
| GET | `/api/flow/[id]/members` | Member | List members |
| POST | `/api/flow/[id]/members` | Owner | Add member |
| DELETE | `/api/flow/[id]/members` | Owner | Remove member |
| GET | `/api/flow/invite/[token]` | Any | Get invite info |
| POST | `/api/flow/invite/[token]` | User | Accept invite |

### Workspaces

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces` | User | List user's workspaces |
| POST | `/api/workspaces` | User | Create workspace |
| GET | `/api/workspaces/[id]` | Member | Get workspace details |
| PUT | `/api/workspaces/[id]` | Admin/Owner | Update workspace |
| DELETE | `/api/workspaces/[id]` | Owner | Delete workspace |
| POST | `/api/workspaces/[id]/members` | Admin/Owner | Add member |
| PATCH | `/api/workspaces/[id]/members` | Admin/Owner | Update member role |
| DELETE | `/api/workspaces/[id]/members` | Admin/Owner | Remove member |
| GET | `/api/workspaces/[id]/users` | Member | List workspace users |
| GET | `/api/workspaces/[id]/flows` | Member | List workspace flows |
| POST | `/api/workspaces/[id]/flows` | Member | Create flow in workspace |
| POST | `/api/workspaces/[id]/migrate-generations` | Admin/Owner | Migrate generations to workspace |
| POST | `/api/workspaces/[id]/import-user-generations` | Admin/Owner | Import user's generations |

### Assistant (AI Chat)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/assistant/chat` | User | Send chat message (streaming response) |
| GET | `/api/assistant/conversations` | User | List conversations |
| POST | `/api/assistant/conversations` | User | Create conversation |
| GET | `/api/assistant/conversations/[id]` | User | Get conversation |
| PATCH | `/api/assistant/conversations/[id]` | User | Update (rename, favorite) |
| DELETE | `/api/assistant/conversations/[id]` | User | Delete conversation |
| POST | `/api/assistant/conversations/[id]/messages` | User | Add message to conversation |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Admin | List all users with stats |
| PATCH | `/api/admin/users` | SuperAdmin | Update user role/status |
| GET | `/api/admin/users/[userId]/generations` | Admin | User's generations |
| GET | `/api/admin/stats` | Admin | System statistics |
| GET | `/api/admin/errors` | Admin | Error logs |
| GET | `/api/admin/memory` | Admin | Memory usage info |
| GET | `/api/admin/filter-options` | Admin | Filter UI options |
| POST | `/api/admin/mark-all-viewed` | Admin | Mark all as viewed |
| POST/GET | `/api/admin/cleanup` | Admin | Data cleanup (batch, stats) |
| GET | `/api/admin/workspaces` | Admin | List all workspaces |
| POST | `/api/admin/workspaces` | Admin | Create workspace |
| DELETE | `/api/admin/workspaces/[workspaceId]` | Admin | Delete workspace |

### LoRA Training

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/loras` | User | List user's LoRAs |
| POST | `/api/loras` | User | Create LoRA training job |
| GET | `/api/loras/[id]` | User | Get LoRA details |
| PATCH | `/api/loras/[id]` | User | Update LoRA |
| PUT | `/api/loras/[id]` | User | Update LoRA metadata |
| DELETE | `/api/loras/[id]` | User | Delete LoRA |
| POST/PUT | `/api/loras/caption` | User | Generate/batch captions for training images |

### Keyframes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/keyframes/generate` | User | Generate keyframe segment |
| GET | `/api/keyframes/status/[id]` | User | Check generation status |
| POST | `/api/keyframes/continue/[id]` | User | Continue keyframe chain |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/profile` | User | Get own profile |
| PATCH | `/api/users/profile` | User | Update own profile |
| GET | `/api/users/[id]/workspaces` | User | Get user's workspaces |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | User | List notifications |
| POST | `/api/notifications/read` | User | Mark notification as read |
| POST | `/api/notifications/send` | Admin | Send notification to users |

### Ideas (Feature Voting)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ideas` | User | List ideas |
| POST | `/api/ideas` | User | Submit idea |
| GET | `/api/ideas/[id]` | User | Get idea details |
| DELETE | `/api/ideas/[id]` | Author/Admin | Delete idea |
| POST | `/api/ideas/[id]/vote` | User | Vote on idea |

### Support

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/support/send-feedback` | User | Submit feedback |
| POST | `/api/support/reply` | Admin | Reply to support ticket |
| POST/GET | `/api/support/telegram-webhook` | None | Telegram bot webhook |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| GET | `/api/proxy/health` | None | Proxy health check |
| ALL | `/api/proxy/[...path]` | None | Supabase API proxy (for blocked regions) |
| POST | `/api/email/send` | Admin | Send email |
| GET | `/api/cron/cleanup` | Cron | Daily cleanup (verified by cron secret) |
| POST | `/api/segment` | User | Analytics event tracking |
| GET | `/api/test/google-direct` | Admin | Test Google AI provider |
| POST | `/api/auth/logout` | User | Logout (clear session) |

## Rate Limits

| Limit | Value | Enforced In |
|-------|-------|-------------|
| Concurrent generations per user | 5 | `app/api/generations/create/route.ts` |
| Upload files per request | 14 | `app/api/upload/route.ts` |
| Upload file size | 10 MB | `app/api/upload/route.ts` |
| Assistant images per message | 10 | `app/api/assistant/chat/route.ts` |
| Assistant videos per message | 10 | `app/api/assistant/chat/route.ts` |

## Webhook Integration

Webhook URL pattern: `${NEXTAUTH_URL}/api/webhook/{provider}`

Each provider calls back with:
- **Replicate**: prediction ID + status + output URLs
- **FAL**: request ID + status + output
- **Higgsfield**: job ID + status + output

Webhook handler flow: validate → find generation by prediction ID → download media → save to storage → update DB status.

WARNING: Webhook handlers should respond 200 quickly. Media processing (download + thumbnail) runs after response where possible.
