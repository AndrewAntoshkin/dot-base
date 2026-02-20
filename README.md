# BASECRAFT — AI Generation Platform

Scalable service for generating, editing, upscaling, and processing images and videos using AI models (Replicate, FAL AI, Google GenAI, Higgsfield).

## Stack

Next.js 16 (App Router) | TypeScript | Supabase (PostgreSQL + Storage + Auth) | Tailwind CSS | Zustand | React Query

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                   # http://localhost:3000
```

## Documentation

All project documentation is in the [`docs/`](docs/) directory:

| File | Contents |
|------|----------|
| [DOCS_GUIDE.md](docs/DOCS_GUIDE.md) | Documentation index, maintenance rules |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, project structure, auth, media pipeline, performance |
| [DATABASE.md](docs/DATABASE.md) | DB schema, tables, RLS, migrations, optimizations |
| [MODELS.md](docs/MODELS.md) | All AI models, providers, how to add new models |
| [API.md](docs/API.md) | 72+ API endpoints, webhooks, rate limits |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy (Vercel / PM2), env vars, monitoring, troubleshooting |
| [FEATURES.md](docs/FEATURES.md) | Flow, LoRA, Workspaces, Admin, Assistant, and more |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history |

## License

MIT
