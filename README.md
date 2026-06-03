# GameEdu

> A classroom platform that blends class management with real-time educational games.

GameEdu lets teachers run classrooms, assign work, and host live in-class games, while
students join through a linked account or a simple login code. It combines assignments,
quizzes, leaderboards, a class board, analytics, OMR (answer-sheet) tools, and real-time
game sessions such as **Gold Quest**, **Crypto Hack**, and **Negamon Battle**.

---

## ✨ Features

- **Classroom management** — create/manage classrooms, students, points, history, achievements, notifications
- **Student portal** — access by linked account or one-time login code
- **Assignments & quizzes** — authoring, submission, manual scoring, leaderboards
- **Question set authoring** — import from CSV / Word, OMR answer-sheet tools
- **Class board & social** — posts, uploads, classroom feed
- **Real-time games** — Gold Quest, Crypto Hack, and the Negamon battle/economy system over Socket.io
- **Teacher/admin tooling** — hosting controls, analytics dashboards, role-based access
- **Billing** — PLUS subscription self-serve via Stripe (card + PromptPay)
- **Observability** — Sentry error/perf tracking, audit logging, rate limiting

---

## 🛠️ Tech Stack

| Area | Technology |
|------|------------|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript** |
| Runtime server | Custom Node server (`run-server.cjs`) with **Socket.io** integrated |
| Database | **MongoDB** via **Prisma 5** |
| Auth | **Auth.js / NextAuth v5** (Google OAuth + credentials + student login codes) |
| UI | **Tailwind CSS** + **Radix UI** + lucide-react |
| Payments | **Stripe** (subscriptions + PromptPay) |
| File storage | Cloudflare **R2** (optional; local fallback in dev) |
| Validation | **Zod** |
| Observability | **Sentry**, audit log, rate limiting |
| Testing | **Vitest** (unit/integration) + **Playwright** (e2e) |
| Deployment | **Render** (`render.yaml`) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20.x** (see `engines` in `package.json`)
- **npm**
- A **MongoDB** database (e.g. MongoDB Atlas connection string)

### Setup

```bash
# 1. Install dependencies (runs `prisma generate` automatically via postinstall)
npm install

# 2. Create your local env file and fill in the required values
cp .env.example .env.local

# 3. Start the dev server (custom Socket.io server on PORT, default 3000)
npm run dev
```

Then open <http://localhost:3000>.

### Minimum required environment variables

Set these in `.env.local` to boot locally (see `.env.example` for the full, annotated list):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MongoDB connection string (Prisma datasource) |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | Public origin of the app (use `http://localhost:3000` in dev) |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Auth.js session secret |
| `ADMIN_SECRET` | Required to create an `ADMIN` account |

Optional integrations (Google OAuth, Resend email, Stripe billing, Cloudflare R2,
LINE bot, Sentry, AI question generation) are documented inline in `.env.example` and
are no-ops in dev when left unset.

---

## 📁 Project Structure

```
gamedu/
├── run-server.cjs          # Custom server entry (Next.js + Socket.io)
├── server.ts               # Server/socket bootstrap (compiled by `predev`)
├── prisma/                 # Prisma schema (MongoDB models)
├── public/                 # Static assets
├── content/                # Static content (public pages)
├── scripts/                # Dev/ops scripts (db cleanup, stripe, checks, deploy)
├── e2e/                    # Playwright end-to-end tests
├── docs/                   # Project documentation (architecture, runbooks, QA, plans)
└── src/
    ├── app/                # Next.js App Router — pages + API routes
    ├── components/         # React components (classroom, student, negamon, board, ui, …)
    ├── actions/            # Server actions
    ├── hooks/              # React hooks
    ├── constants/          # Shared constants
    ├── types/              # Shared TypeScript types
    ├── __tests__/          # Unit/integration tests
    └── lib/                # Domain logic & libraries
        ├── api-handlers/   # Reusable route handler logic
        ├── auth/           # Auth helpers
        ├── authorization/  # Role guards & access control
        ├── billing/        # Stripe / subscription logic
        ├── email/          # Email verification & sending
        ├── export/         # CSV / spreadsheet export
        ├── game-core/      # Negamon engine core
        ├── game-engine/    # Game engine runtime
        ├── game-negamon/   # Negamon battle/economy
        ├── game-quests/    # Quests
        └── game-shop/      # In-game shop / economy
```

---

## 🏗️ Architecture Overview

The codebase is organized into clear architectural layers:

| Layer | Responsibility |
|-------|----------------|
| **Pages & App Shell** | App Router pages, layouts, play UI |
| **API & Server Routes** | Route handlers, webhooks, server actions |
| **UI Components** | React components, hooks, shared UI kit (Radix-based) |
| **Domain Services & Libraries** | Auth, billing, classroom/student/teacher services, storage, i18n |
| **Game Engine & Mechanics** | Negamon / Gold Quest / Crypto Hack engines, quests, shop, socket handlers |
| **Data & Schema** | Prisma schema, seeds |
| **Build, Ops & Infrastructure** | Custom server bootstrap, scripts, configs, CI pipeline |
| **Tests** | Unit, integration, route, and e2e tests |

**Entry points:** `run-server.cjs` → `server.ts` (boots Next.js + Socket.io) → `src/app/layout.tsx`.

> 📐 For the full architecture (data flow, dependency map, request/socket lifecycle),
> see [docs/architecture.md](docs/architecture.md). For conventions and route patterns,
> see [docs/architecture-conventions.md](docs/architecture-conventions.md) and
> [docs/route-pattern-guide.md](docs/route-pattern-guide.md).

---

## 🧪 Testing & Quality

```bash
npm test                 # Run the Vitest suite
npx tsc --noEmit         # Type-check
npx eslint .             # Lint
npm run check:i18n       # Detect hardcoded (non-i18n) strings
npm run check:phase1     # Phase-1 production readiness checks
```

Domain-scoped checks are also available (e.g. `npm run check:auth`,
`npm run check:classroom-core`, `npm run check:live-game`) — see `package.json`.

---

## 📦 Deployment

The app deploys to **Render** using `render.yaml` (build + `prisma db push` on preDeploy).
See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) and
[docs/render-deploy.md](docs/render-deploy.md) for details.

```bash
npm run build            # clean → prisma generate → next build → compile server
npm start                # Run the production server (run-server.cjs)
```

---

## 🔧 Useful Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the custom dev server (Next.js + Socket.io) |
| `npm run build` | Production build |
| `npm start` | Run the production server |
| `npm test` | Run the test suite |
| `npm run lint` | Lint with ESLint |
| `npm run db:cleanup-rpg:dry-run` | Preview legacy RPG data cleanup (safe) |
| `npm run db:cleanup-rpg` | Apply legacy RPG data cleanup |

> ⚠️ Always run the **dry-run** cleanup before touching production legacy data.

---

## 📊 Domain Status

The legacy RPG/farming system has been removed from the active product flow.

- **Active:** classroom management, student points/history/achievements/notifications,
  question set authoring, OMR tools, real-time classroom game sessions
- **Legacy (being cleaned up):** old RPG cleanup collections/fields, removed student
  sync/RPG state flows, archived RPG art-prompt references

See [docs/domain-legacy-cleanup-summary.md](docs/domain-legacy-cleanup-summary.md) and
[docs/legacy-rpg-cleanup-runbook.md](docs/legacy-rpg-cleanup-runbook.md).

---

## 📚 Documentation

### Start Here
- [Getting Started](docs/GETTING_STARTED.md) — local setup in 10–15 minutes
- [Glossary](docs/GLOSSARY.md) — OMR, login code, Negamon, USER vs STUDENT, and more
- [Documentation index](docs/README.md) — all docs organised by topic

### Testing, Deployment & Security
- [Testing guide](docs/TESTING.md) — Vitest, Playwright, domain checks, CI pipeline
- [Deployment guide](docs/DEPLOYMENT.md) — Render setup, env vars, Stripe, MongoDB, rollback
- [Security policy](SECURITY.md) — vulnerability reporting, scope, disclosure policy

### Architecture & Conventions
- [Architecture overview](docs/architecture.md) — data flow, dependency map, request & socket lifecycle
- [Architecture conventions](docs/architecture-conventions.md)
- [Route pattern guide](docs/route-pattern-guide.md)
- [Role semantics](docs/role-semantics.md)
- [Error code contract](docs/error-code-contract.md)
- [System analysis & improvement master plan](docs/system-analysis-and-improvement-master-plan.md)

### Production & Operations
- [Commercial production roadmap](docs/commercial-production-roadmap.md)
- [Phase-1 production readiness status](docs/phase-1-production-readiness-status.md)
- [Production readiness runbook](docs/production-readiness-runbook.md)
- [Backup & restore runbook](docs/backup-restore-runbook.md)
- [Operational safety contract](docs/operational-safety-contract.md)

### Security & Review
- [Security PR review checklist](docs/security-pr-review-checklist.md)
- [Socket review checklist](docs/socket-review-checklist.md)
- [Page data exposure checklist](docs/page-data-exposure-checklist.md)
- [Quarterly security sweep routine](docs/quarterly-security-sweep-routine.md)
- [Route authorization test template](docs/route-authorization-test-template.md)

### Testing & Contribution
- [Contributor guide](CONTRIBUTING.md)
- [Contribution review workflow](docs/contribution-review-workflow.md)
- [Test & CI maturity playbook](docs/test-ci-maturity-playbook.md)
- [Flaky test triage checklist](docs/flaky-test-triage-checklist.md)

---

## 📝 Conventions

- Treat `USER` as a generic authenticated account — **not** a synonym for `STUDENT`.
- Prefer canonical plural classroom API paths such as `/api/classrooms/...`.
- Prefer shared auth and role helpers when adding new protected routes or pages.
