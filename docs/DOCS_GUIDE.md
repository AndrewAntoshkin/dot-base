# Documentation Guide

## Purpose

This folder (`docs/`) is the single source of truth for AI agents and developers working on BASECRAFT. All project documentation lives here.

## File Index

| File | Read when... |
|------|-------------|
| `ARCHITECTURE.md` | Understanding the system, tech stack, project structure, auth, performance constraints |
| `MODELS.md` | Adding/modifying AI models, understanding providers and parameters |
| `API.md` | Building/fixing API endpoints, webhooks, auth patterns |
| `DATABASE.md` | DB schema changes, migrations, RLS, Supabase config, query optimization |
| `DEPLOYMENT.md` | Deploying, configuring env vars, monitoring, testing, troubleshooting |
| `FEATURES.md` | Working on specific features: Flow, LoRA, Workspaces, Admin, Assistant, etc. |
| `CHANGELOG.md` | Checking version history, recent changes |

## Rules for Maintaining Documentation

### General Rules

1. All documentation in English
2. Never copy code into docs — reference file paths from project root (e.g., `lib/replicate/token-pool.ts`)
3. Use tables over prose for structured data
4. Each doc file should stay under 500 lines; split only if exceeded
5. Date-stamp sections that may become stale
6. Mark dangers with `WARNING:`, non-obvious behavior with `NOTE:`

### When to Update

| Code Change | Update These Files |
|-------------|-------------------|
| New AI model | `MODELS.md` + `CHANGELOG.md` |
| New API endpoint | `API.md` + `CHANGELOG.md` |
| DB schema change | `DATABASE.md` + `CHANGELOG.md` |
| New feature | `FEATURES.md` + `CHANGELOG.md` |
| Deploy/infra change | `DEPLOYMENT.md` |
| Architecture change | `ARCHITECTURE.md` |
| Performance fix | `ARCHITECTURE.md` (performance section) |

### CHANGELOG Rules

- Every PR with user-visible changes must update `CHANGELOG.md`
- Format: [Keep a Changelog](https://keepachangelog.com/)
- Sections: Added, Changed, Fixed, Removed
- Include DB migration instructions when applicable

## Contributing to the Project

- Branch naming: `feature/*`, `fix/*`, `docs/*`
- Commit format: conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Pre-PR checklist: `npm run lint`, `npm run type-check`, test changed functionality, update `CHANGELOG.md`
- Code style details: see `ARCHITECTURE.md` > Code Conventions

## Writing Style

- Imperative headers ("Add a model", not "Adding a model")
- File paths relative to project root: `lib/replicate/token-pool.ts`
- No emoji in documentation
- Be concise — if it can be a table, make it a table
