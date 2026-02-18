# Revenue Driver Tree

A SaaS revenue planning tool that decomposes top-line ARR goals into interactive driver trees with AI-powered defaults. Users enter their current metrics and planning target; AI generates a complete revenue decomposition tree in under 60 seconds. They then adjust values interactively — dragging sliders, editing numbers — to explore what-if scenarios and see which combination of levers closes the gap.

**Live:** [web-production-9b4b1.up.railway.app](https://web-production-9b4b1.up.railway.app)

---

## Tech Stack

- **Frontend:** Vite + React 19, React Flow v12 (tree visualization), Dagre (layout), Zustand (state + undo/redo), Clerk React (auth)
- **Backend:** Express, Drizzle ORM, Clerk Express (auth middleware + webhooks), Anthropic SDK (Claude Sonnet 4.6)
- **Database:** PostgreSQL on Railway (JSONB for tree node storage)
- **Hosting:** Railway — single monolith (Express serves the Vite build in production)
- **Auth:** Clerk (Google OAuth + email/password)

---

## Prerequisites

- **Node.js** 20 or later
- **PostgreSQL** running locally (or a connection string to a remote database)
- **Clerk account** — create a free account at [clerk.com](https://clerk.com), create an application, and get your publishable + secret keys
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Sherlock-Labs/revenue-driver-tree.git
cd revenue-driver-tree
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for the workspace root, `client/`, and `server/`.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all required values (see [Environment Variables](#environment-variables) below).

### 4. Set up the database

Create a local Postgres database:

```bash
createdb revenue_driver_tree
```

Run the Drizzle migrations to create the schema:

```bash
npm run db:migrate
```

### 5. Start the dev server

```bash
npm run dev
```

This starts:
- Vite dev server at `http://localhost:5173` (React frontend)
- Express API server at `http://localhost:3001` (backend)

Vite proxies `/api/*` requests to the Express server, so both are available through the single Vite URL. Open `http://localhost:5173` in your browser.

---

## Project Structure

```
revenue-driver-tree/
├── package.json                  # Workspace root — scripts, dev dependencies
├── vite.config.ts                # Vite config — /api proxy to :3001
├── drizzle.config.ts             # Drizzle ORM config
├── .env.example                  # Environment variable template
│
├── shared/
│   └── schemas/
│       └── tree.ts               # Zod schemas — single source of truth for types
│                                 # Used by: API validation, AI structured output, frontend types
│
├── client/                       # React frontend
│   ├── src/
│   │   ├── App.tsx               # Routes — public (landing, sign-in, shared) + protected
│   │   ├── index.css             # Design tokens + global styles
│   │   ├── lib/
│   │   │   ├── tree-engine.ts    # Calculation engine — pure functions, no side effects
│   │   │   ├── tree-template.ts  # Default SaaS revenue tree structure (~20 nodes)
│   │   │   └── api.ts            # Typed fetch wrapper
│   │   ├── stores/
│   │   │   └── tree-store.ts     # Zustand — nodes, undo/redo stack (50 states), pin state
│   │   ├── hooks/
│   │   │   ├── useAutoSave.ts    # Debounced PUT /api/trees/:id (2s, 3 retries)
│   │   │   └── useUndoRedo.ts    # Cmd+Z / Cmd+Shift+Z keybindings
│   │   ├── components/
│   │   │   ├── tree/             # TreeCanvas, RevenueNode, layout + collapse hooks
│   │   │   ├── editor/           # InlineValueEditor, PercentageSlider
│   │   │   ├── summary/          # SummaryPanel (AI summary slide-out)
│   │   │   ├── dashboard/        # TreeCard, CreateTreeForm
│   │   │   └── layout/           # AppHeader, TreeToolbar
│   │   └── pages/
│   │       ├── LandingPage.tsx   # Marketing page (unauthenticated)
│   │       ├── DashboardPage.tsx # Tree list
│   │       ├── NewTreePage.tsx   # Onboarding form
│   │       ├── TreePage.tsx      # Main tree editor
│   │       └── SharedTreePage.tsx # Read-only public view
│
└── server/                       # Express backend
    └── src/
        ├── index.ts              # Express app — middleware ordering, static serve
        ├── db/
        │   ├── index.ts          # Drizzle client (pg Pool)
        │   └── schema/tables.ts  # Schema: users, trees (JSONB), processedEvents
        ├── middleware/auth.ts    # requireAuth, getAuth helpers
        ├── routes/trees.ts       # All tree endpoints (10 routes)
        ├── webhooks/clerk.ts     # user.created/updated/deleted sync
        └── ai/
            ├── generate-values.ts  # Tree generation — Claude structured output
            └── summarize-tree.ts   # Scenario narration — Claude plain text
```

---

## Key Architecture Decisions

**Client-side tree computation.** All tree recalculation happens in the browser (`client/src/lib/tree-engine.ts`). The server stores state and handles AI calls only. This gives sub-1ms recalculations with no network round-trip for interactive editing.

**JSONB tree storage.** The full node array is stored as a single JSONB column in Postgres. Trees are always loaded and saved atomically — no relational node table. Auto-save writes one `UPDATE` per debounce interval.

**Template + AI value fill.** The default SaaS revenue tree structure is defined in code (`tree-template.ts`). Claude only generates the numeric values (~240 tokens, targeting <5 seconds). This is the only approach that hits the latency target.

**Flat node array with `parentId`.** Tree nodes are a flat array, not nested JSON. This avoids recursive Zod schemas (which Claude's structured output does not support) and makes hierarchy reconstruction trivial client-side.

**Churn as a negative value.** The root node uses `computeType: "sum"`. Since sum adds all children, churn is stored as a negative number. Revenue Target = New Biz + Expansion + (-Churn) + Pricing.

For full rationale, see [`docs/revenue-driver-tree-tech-approach.md`](https://github.com/Sherlock-Labs/teamhq/blob/main/docs/revenue-driver-tree-tech-approach.md) in the TeamHQ repo.

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Dev | `npm run dev` | Start Vite + Express concurrently (ports 5173 + 3001) |
| Build | `npm run build` | Build Vite client + compile TypeScript server |
| Start | `npm start` | Start the compiled production server |
| Generate migration | `npm run db:generate` | Generate Drizzle migrations from schema changes |
| Run migrations | `npm run db:migrate` | Apply pending migrations to the database |

---

## Deployment

The app deploys as a Railway monolith: one web service + one Postgres database. Express serves the Vite build in production.

- **Staging:** `https://web-staging-e37c.up.railway.app` — auto-deploys from `main`
- **Production:** `https://web-production-9b4b1.up.railway.app` — manual promote from staging
- **Health check:** `GET /api/health`

Initial deploy steps:

```bash
# After connecting the GitHub repo in Railway:
railway run npm run db:migrate
```

For the full deployment configuration, Clerk webhook setup, and first-deploy checklist, see [`docs/revenue-driver-tree-deployment.md`](https://github.com/Sherlock-Labs/teamhq/blob/main/docs/revenue-driver-tree-deployment.md) in the TeamHQ repo.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running locally.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key — from Clerk dashboard (starts with `pk_`) |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key — from Clerk dashboard (starts with `sk_`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Yes | Clerk webhook signing secret — from the webhook endpoint in Clerk dashboard (starts with `whsec_`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — from [console.anthropic.com](https://console.anthropic.com) |
| `DATABASE_URL` | Yes | PostgreSQL connection string — e.g., `postgresql://localhost:5432/revenue_driver_tree` |
| `APP_URL` | Yes | Application base URL — `http://localhost:5173` for local dev |
| `PORT` | No | Express server port — defaults to `3001` |
| `NODE_ENV` | No | `development`, `staging`, or `production` — defaults to `development` |

> **Note on Clerk webhooks for local dev:** To test Clerk webhook events locally (user.created, user.updated, user.deleted), you need to expose your local Express server using a tool like [ngrok](https://ngrok.com) and create a webhook endpoint in the Clerk dashboard pointing to `https://your-tunnel-url/api/webhooks/clerk`. For basic development without webhook events, you can leave `CLERK_WEBHOOK_SIGNING_SECRET` empty — the app will function but user records won't sync to the local database.
