# Getting Started with GameEdu

This guide walks a new developer through setting up a local environment, understanding
key configuration options, and running tests. It takes about **10–15 minutes** to have a
working dev server.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20.x | Project pins `engines.node: 20.x` in `package.json` |
| **npm** | bundled with Node | Used for install and scripts |
| **MongoDB** | any hosted | MongoDB Atlas free tier works; or a local instance |
| **Git** | any | — |

> Optional integrations (Google OAuth, Stripe, Cloudflare R2, Sentry, LINE bot) are
> **not required** to boot locally. The app detects their absence and falls back gracefully.

---

## 1. Clone & Install

```bash
git clone <repo-url> gamedu
cd gamedu
npm install
# postinstall runs `prisma generate` automatically
```

---

## 2. Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the **three minimum required variables**:

```env
# MongoDB connection string (MongoDB Atlas or local)
DATABASE_URL="mongodb+srv://USER:PASS@cluster.mongodb.net/gamedu?retryWrites=true&w=majority"

# Public URL — use localhost in dev
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

# Auth.js session secret — any random string in dev
AUTH_SECRET="any-random-string-for-local-dev"
NEXTAUTH_SECRET="any-random-string-for-local-dev"

# Required to create an ADMIN account
ADMIN_SECRET="dev-admin-secret"
```

See `.env.example` for the full annotated list of every optional variable
(Google OAuth, Stripe, Resend email, Cloudflare R2, Sentry, LINE bot, feature flags).

---

## 3. Start the Dev Server

```bash
npm run dev
```

The app runs at **http://localhost:3000**.

> **Why not `next dev`?** GameEdu uses a custom server (`run-server.cjs`) that attaches
> Socket.io to the same HTTP server for real-time games. `npm run dev` compiles
> `server.ts` first (`predev` hook) then starts this custom server.

---

## 4. Create Your First Account

1. Open http://localhost:3000
2. Sign up with an email + password (credentials login)
3. To create an **ADMIN** account, use the admin registration endpoint:
   - `POST /api/admin/register` with body `{ "adminSecret": "<ADMIN_SECRET from .env.local>" }`

---

## 5. Database Utilities

```bash
# Push schema changes to MongoDB (dev shortcut — use with care on shared DBs)
npm run db:push

# Seed the database with initial data
npm run db:seed

# Verify which database your env is pointed at (useful before any destructive op)
npm run db:print-target

# Ensure required indexes exist (Negamon economy)
npm run db:ensure-indexes
```

> **Before touching production data**, always run `db:print-target` to confirm you are
> pointing at the right database.

---

## 6. Running Tests

### Full Suite

```bash
npm test          # Vitest unit + integration tests
```

### Domain-Scoped Checks (test + type-check a specific area)

Use these when working on a specific feature — they are faster than the full suite:

| Command | Covers |
|---------|--------|
| `npm run check:auth` | Auth, OAuth, session, role, authorization |
| `npm run check:classroom-core` | Classroom management, points, analytics |
| `npm run check:assignment-quiz` | Assignments, quizzes, scoring |
| `npm run check:student-dashboard` | Student portal, login codes, economy commands |
| `npm run check:economy-shop-ledger` | Economy, shop, ledger, reconciliation |
| `npm run check:negamon-battle` | Negamon engine, rewards, sync |
| `npm run check:negamon-reward-audit` | Reward audit, remediation, effectiveness |
| `npm run check:live-game` | Gold Quest / Crypto Hack socket handlers |
| `npm run check:omr` | OMR scanner, auth, sets |
| `npm run check:board-social` | Class board, uploads, media |
| `npm run check:billing-plan` | Stripe, subscriptions, plan access |
| `npm run check:question-sets` | Set editor, uploads, AI import |

### Type-Check & Lint

```bash
npx tsc --noEmit     # TypeScript — no output files
npx eslint .         # ESLint
```

### i18n Check

```bash
npm run check:i18n          # Detect hardcoded (non-translated) strings
npm run check:i18n:strict   # Stricter mode
```

### End-to-End Tests (Playwright)

```bash
npm run test:e2e:asn:install   # Install Playwright Chromium (once)
npm run test:e2e:asn           # Run assignment-command-center e2e suite
```

---

## 7. Optional: Local Stripe Webhooks

To test Stripe billing flows locally you need the Stripe CLI installed separately.

```bash
# Forward Stripe webhooks to localhost
npm run billing:stripe-listen

# Print the current webhook signing secret (copy to STRIPE_WEBHOOK_SECRET)
npm run billing:stripe-print-secret

# Fire a test checkout.session.completed event
npm run billing:stripe-trigger-checkout
```

---

## 8. Optional: Feature Flags

These `.env.local` flags gate optional product features:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED` | off | Enable Negamon battle launcher from classroom |
| `NEXT_PUBLIC_CLASSROOM_GAMIFICATION_ENABLED` | on | Rank/events/Negamon settings in classroom |
| `NEXT_PUBLIC_OMR_DASHBOARD_ENABLED` | off | Show OMR section in dashboard |

---

## 9. Build for Production

```bash
npm run build   # clean → prisma generate → next build → compile server.ts
npm start       # Run the production server
```

For deploy configuration see [../RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md) and
[render-deploy.md](render-deploy.md).

---

## 10. Common Pitfalls

| Problem | Fix |
|---------|-----|
| `prisma generate` error on install | Check `DATABASE_URL` is set; run `npx prisma generate` manually |
| `NEXTAUTH_URL` mismatch | Must match the **exact** public origin — no trailing slash |
| Google OAuth redirect fails | Set `NEXT_PUBLIC_APP_URL` to the **HTTPS** origin, not localhost |
| Socket.io not connecting | `NEXT_PUBLIC_SOCKET_URL` must match the app origin |
| Can't create ADMIN account | Check `ADMIN_SECRET` matches `.env.local` |
| Type errors on `npm run dev` | Run `npx tsc --noEmit` to see exact errors before starting |

---

## Further Reading

- [Architecture overview](architecture.md) — how the layers, requests, and Socket.io flow together
- [Architecture conventions](architecture-conventions.md) — coding rules and layering constraints
- [Role semantics](role-semantics.md) — `USER` vs `STUDENT` vs `TEACHER` vs `ADMIN`
- [Route pattern guide](route-pattern-guide.md) — API route conventions
- [Contributor guide](../CONTRIBUTING.md) — PR workflow and code review expectations
