# CLAUDE.md — Revenue Driver Tree

## Overview

Revenue Driver Tree is a SaaS revenue planning tool with interactive tree visualization and AI-powered defaults. Users enter their ARR goal and basic metrics, and the tool generates a complete revenue decomposition tree. They can then adjust numbers interactively to explore what-if scenarios.

## Tech Stack

- **Frontend:** Vite + React 19 + React Flow v12 + Zustand + Clerk React
- **Backend:** Express + Drizzle ORM + PostgreSQL + Clerk Express + Anthropic SDK
- **Auth:** Clerk (Google OAuth + email/password)
- **AI:** Claude Sonnet 4.6 (structured output for tree generation, plain text for narration)
- **Database:** PostgreSQL on Railway (JSONB for tree storage)
- **Hosting:** Railway (monolith — Express serves Vite build in production)

## Project Structure

```
revenue-driver-tree/
├── package.json              # Workspace root (client + server)
├── vite.config.ts            # Vite + React + /api proxy to :3001
├── drizzle.config.ts         # Drizzle ORM config
├── shared/schemas/tree.ts    # Zod schemas (source of truth for types)
├── client/                   # React frontend
│   ├── src/lib/              # Calculation engine, tree template, API client
│   ├── src/stores/           # Zustand store (tree state, undo/redo)
│   ├── src/hooks/            # Auto-save, undo/redo keybindings
│   ├── src/components/       # Tree, editor, dashboard, layout components
│   └── src/pages/            # Route pages
└── server/                   # Express backend
    ├── src/db/               # Drizzle schema + client
    ├── src/middleware/        # Auth middleware
    ├── src/routes/            # Tree CRUD + AI endpoints
    ├── src/webhooks/          # Clerk webhook handler
    ├── src/ai/               # Claude integration (generate + summarize)
    └── src/lib/              # Tree template (server copy)
```

## Development

```bash
npm install           # Install all workspace dependencies
npm run dev           # Start Vite (5173) + Express (3001) concurrently

npm run build         # Build client + server for production
npm start             # Start production server

npm run db:generate   # Generate Drizzle migrations
npm run db:migrate    # Apply migrations
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Required:
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret key
- `CLERK_WEBHOOK_SIGNING_SECRET` — Clerk webhook signing secret
- `ANTHROPIC_API_KEY` — Anthropic API key
- `DATABASE_URL` — PostgreSQL connection string
- `APP_URL` — Application URL (http://localhost:5173 for dev)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/trees | Required | Create tree (triggers AI generation) |
| GET | /api/trees | Required | List user's trees |
| GET | /api/trees/:id | Required | Get full tree |
| PUT | /api/trees/:id | Required | Save tree (auto-save) |
| DELETE | /api/trees/:id | Required | Delete tree |
| POST | /api/trees/:id/duplicate | Required | Duplicate tree |
| POST | /api/trees/:id/summarize | Required | AI scenario summary |
| POST | /api/trees/:id/share | Required | Generate share token |
| GET | /api/shared/:token | Public | Read-only shared view |
| GET | /api/health | Public | Health check |

## Key Conventions

- **Shared schemas:** `shared/schemas/tree.ts` is the single source of truth for types. Both client and server import from it.
- **Tree template:** Identical in `client/src/lib/` and `server/src/lib/` — keep them in sync.
- **Churn is negative:** Revenue Target = New Biz + Expansion + (-Churn) + Pricing.
- **Middleware ordering:** Webhook routes use `express.raw()` BEFORE `express.json()`.
- **Client-side computation:** All tree recalculation happens in the browser. Server stores state only.
- **Share tokens:** `nanoid(12)`, URL-safe, stored on the tree record.

## Deployment

Railway monolith. Express serves the Vite build in production.
- Staging: auto-deploy from `main`
- Production: manual promote from staging
- Health check: `GET /api/health`
