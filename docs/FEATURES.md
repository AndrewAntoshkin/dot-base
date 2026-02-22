# Features

## Flow — Visual AI Pipeline Builder

### Architecture
- Page: `app/flow/page.tsx`
- Components: `components/flow/` (16 files)
- Store: `lib/flow/store.ts` (Zustand, 23KB)
- Comments store: `lib/flow/comments-store.ts`
- Types: `lib/flow/types.ts`
- API: `app/api/flow/`

### Node Types
- **Text Node**: prompt input, connects to image/video nodes
- **Image Node**: image generation, receives prompt from text node or manual input
- **Video Node**: video generation from image or text

### Key Features
- Drag-and-drop canvas (XYFlow)
- Auto-data propagation through edges (prompt flows from text → image → video)
- Real-time collaboration via flow members
- Comments with canvas positions
- Flow sharing via invite tokens
- Kanban board view in workspaces (`components/workspace-flows-kanban.tsx`)
- Node author badges

### DB Tables
`flows`, `flow_nodes`, `flow_edges`, `flow_invites`, `flow_members`, `flow_comments`

### Generation Flow
1. User configures node (model, prompt, settings)
2. `POST /api/flow/generate` — creates generation linked to flow
3. Webhook completes → node shows result
4. Result can feed into next node

NOTE: Flow generation on localhost uses polling (up to 5 min). In production, webhooks are used.

---

## LoRA Training — Custom Model Styles

### Architecture
- Page: `app/lora/page.tsx`
- Components: `components/lora/` (create, detail, info, training modals)
- API: `app/api/loras/`, `app/api/loras/caption/`
- Webhook: `app/api/webhook/replicate-training/`
- Config: `lib/lora-trainers-config.ts`

### Training Pipeline
1. User uploads 4-15 reference images (max 10MB each)
2. Optional: auto-caption via `POST /api/loras/caption`
3. Server creates ZIP archive → uploads to Supabase Storage
4. `POST /api/loras` sends training request to Replicate Training API
5. Webhook `/api/webhook/replicate-training` receives status updates
6. Trained weights saved to `lora-models` storage bucket

### Using LoRA in Generation
- Model override: `flux-dev-lora` (`black-forest-labs/flux-dev-lora`)
- `lora_weights` parameter contains LoRA URL
- `trigger_word` injected into prompt automatically
- URL parameter: `/?lora={id}` pre-selects LoRA

### DB Tables
`user_loras` (status: pending/training/completed/failed), `lora_training_images`

### Storage Buckets
- `lora-training-images`: uploaded reference images
- `lora-models`: trained model weights (up to 500MB)

NOTE: Training takes ~20-30 minutes. Max 15 images (optimal 10-12).

---

## Workspaces — Multi-Tenant Isolation

### Architecture
- Pages: `app/workspaces/page.tsx`, `app/workspaces/[slug]/page.tsx`
- Components: `components/workspace-create-modal.tsx`, `components/workspace-edit-modal.tsx`
- API: `app/api/workspaces/`

### Features
- Create/edit/delete workspaces
- Member management (roles: owner, admin, member)
- Generation isolation per workspace
- Workspace switcher in header
- Migrate existing generations to workspace
- Import user's personal generations

### DB Tables
`workspaces` (name, slug, created_by), `workspace_members` (user_id, role)

### Access Control
- Workspace membership checked via `workspace_members` join
- Owner can manage members, delete workspace
- Admin can manage members
- Member can create flows, view generations

---

## Admin Panel

### Architecture
- Page: `app/admin/page.tsx`
- Component: `components/pages/admin-page-client.tsx`
- API: `app/api/admin/`
- Server utils: `lib/admin.ts`, `lib/admin-client.ts`

### Features
- Dashboard: user count, generation counts, error rate, costs
- User management: view all users, change roles, view user generations
- Workspace management: list, create, delete
- Error monitoring: recent API errors
- Memory monitoring: heap usage, RSS
- Data cleanup: batch delete old generations, stale records
- Filter options for admin views

### Role System
| Role | Can Do |
|------|--------|
| `user` | Standard features |
| `admin` | + Admin panel, user management, workspace management |
| `super_admin` | + Change user roles, full system control |

Access check: `requireAdmin()` or `requireSuperAdmin()` from `lib/auth.ts`.

---

## AI Assistant Chat

### Architecture
- API: `app/api/assistant/chat/route.ts` (streaming)
- API: `app/api/assistant/conversations/`
- Component: `components/assistant-panel.tsx` (118KB)
- Provider: Google Generative AI (Gemini)

### Features
- Multimodal input: text + images (up to 10) + videos (up to 10)
- Streaming responses
- Conversation history (DB-persisted)
- Conversation favorites
- Context-aware: knows about current generation, model settings

### DB Tables
`assistant_conversations`, `assistant_messages`

WARNING: No file size validation on assistant images/videos. Consider adding upload size limits.

---

## Image Generation & Editing

### Actions

| Action | Page | Key Components |
|--------|------|---------------|
| Create | `app/page.tsx` (home) | `settings-form.tsx`, `output-panel.tsx` |
| Edit | `app/page.tsx` | `settings-form.tsx` (with image input) |
| Upscale | `app/page.tsx` | `settings-form.tsx` (image only) |
| Remove BG | `app/page.tsx` | `settings-form.tsx` (image only) |
| Inpaint | `app/inpaint/page.tsx` | `mask-editor.tsx` |
| Expand | `app/expand/page.tsx` | `directional-expand-selector.tsx` |

### Core Components
- `components/settings-form.tsx` (54KB) — model parameters, prompt, image upload
- `components/output-panel.tsx` (36KB) — results display, download, retry
- `components/model-selector.tsx` — model picker dropdown
- `components/action-selector.tsx` — action type picker
- `components/aspect-ratio-selector.tsx` — aspect ratio picker

### Generation Flow
See `ARCHITECTURE.md` > Request Lifecycle: Generation

---

## Video Generation

### Actions
- `video_create` — text-to-video (T2V)
- `video_i2v` — image-to-video (I2V)
- `video_edit` — edit existing video
- `video_upscale` — upscale video resolution

### Pages
- `app/video/page.tsx` — main video generation
- `app/keyframes/page.tsx` — keyframe interpolation

### Keyframes
- API: `app/api/keyframes/generate/`, `app/api/keyframes/status/[id]/`, `app/api/keyframes/continue/[id]/`
- Logic: `lib/keyframes.ts`
- Generate intermediate frames between two images
- Chain multiple segments for longer videos

---

## Brainstorm Mode

- Page: `app/brainstorm/page.tsx`
- Component: `components/pages/brainstorm-page-client.tsx`, `components/brainstorm-image-sheet.tsx`
- Generate multiple variations with different seeds/models simultaneously
- Quick iteration on prompt ideas

---

## Analysis Tools

| Action | Description | Page |
|--------|------------|------|
| `analyze_describe` | Describe image content | `app/analyze/page.tsx` |
| `analyze_ocr` | Extract text from image | `app/analyze/page.tsx` |
| `analyze_prompt` | Generate prompt from image | `app/analyze/page.tsx` |

Component: `components/text-output-panel.tsx` — displays text analysis results.

---

## Notifications

### Architecture
- Components: `components/notifications/notifications-button.tsx`
- API: `app/api/notifications/`
- DB: `notifications` table

### Features
- Bell icon in header with unread count
- Mark as read
- Admin can broadcast notifications to all users
- Realtime updates via Supabase (with proper cleanup)

NOTE: `channel.unsubscribe()` before `removeChannel()` in cleanup — prevents WebSocket leak.

---

## Support System

- Floating support button: `components/support-button.tsx`
- API: `app/api/support/send-feedback/`, `app/api/support/reply/`
- Telegram webhook: `app/api/support/telegram-webhook/`
- DB: `support_tickets` table

---

## Ideas / Feature Voting

- API: `app/api/ideas/`
- DB: `ideas` table (title, description, votes, author_id)
- Users submit feature requests, vote on existing ones

---

## SLA & Pricing

- Cost formula: `(GPU_time_seconds * GPU_price_per_second * 1.5) * 80`
- Pricing config: `lib/pricing.ts`
- Cost tracking: `cost_usd` and `cost_credits` on `generations` table
- Detailed SLA document: `docs/BASECRAFT_SLA.md` (business/legal reference)

---

## In-App Documentation

- Pages: `app/docs/` (layout + 20+ subpages)
- Components: `components/docs/`
- Feature guides, model docs, glossary, changelog, tips
- Accessible without auth at `/docs`
