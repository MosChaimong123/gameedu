# Deployment Guide

GameEdu deploys as a single **Render Web Service** (Node.js) — Next.js 16 + a custom
server (`run-server.cjs`) that attaches Socket.io on the same HTTP port. Everything
ships as one process on one origin.

> **Quick start:** if you just want to deploy from the Blueprint, jump to
> [§2 Deploy via Blueprint](#2-deploy-via-blueprint).

---

## 1. Architecture on Render

```
Browser
  ├── HTTP(S) ──► Render Web Service (run-server.cjs)
  │                   ├── Next.js App Router (pages + API routes)
  │                   └── Socket.io (real-time games, same port)
  └── WebSocket ──► same Render Web Service
                         │
                         ▼
                  MongoDB Atlas (external)
```

| Component | Where it runs |
|-----------|--------------|
| App + API + Socket.io | Render Web Service (Node) |
| Database | MongoDB Atlas (external, you provision) |
| File uploads | Cloudflare R2 (optional, falls back to local disk) |
| Payments | Stripe (external) |
| Error monitoring | Sentry (external, optional) |

---

## 2. Deploy via Blueprint

The repo ships with a `render.yaml` Blueprint that wires everything up automatically.

**Steps:**

1. Push the repo to GitHub
2. Open [Render → New Blueprint](https://dashboard.render.com/blueprint/new) and connect your repo
3. Render reads `render.yaml` — fill in every secret the UI lists (see §3)
4. Click **Apply** — Render runs `npm ci && npm run build` and `npx prisma db push`
5. After the first successful deploy, optionally seed the database:
   ```bash
   # from local machine with production DATABASE_URL
   npm run db:seed
   ```

**Build + start commands** (already in `render.yaml`):

```
Build:  npm ci && npm run build
Start:  npm run start
Pre-deploy: npx prisma db push
```

---

## 3. Environment Variables

### Required (app will not boot without these)

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `AUTH_SECRET` | random 32+ char string | Auth.js JWT/session secret |
| `NEXTAUTH_SECRET` | same as `AUTH_SECRET` | Keep equal to `AUTH_SECRET` |
| `NEXTAUTH_URL` | `https://your-app.onrender.com` | Exact public HTTPS URL — no trailing slash |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.onrender.com` | Same as `NEXTAUTH_URL` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-app.onrender.com` | Same origin (Socket.io same-host) |
| `ADMIN_SECRET` | any secret string | Required to create the first ADMIN account |
| `AUTH_TRUST_HOST` | `true` | Required behind Render's reverse proxy |

### Recommended

| Variable | Notes |
|----------|-------|
| `SOCKET_IO_CORS_ORIGIN` | Public app URL(s) — defaults to `NEXTAUTH_URL` if unset |
| `RATE_LIMIT_STORE` | `auto` → uses MongoDB in production, memory in dev |
| `AUDIT_LOG_SINK` | `auto` → `both` (DB + console) in production |

### Optional Integrations

| Variable | When needed |
|----------|------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth sign-in |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email verification in production |
| `ENABLE_PUBLIC_SIGNUP` / `REQUIRE_EMAIL_VERIFICATION` | Signup policy |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js on client |
| `STRIPE_PRICE_PLUS_MONTHLY` / `STRIPE_PRICE_PLUS_YEARLY` | PLUS plan price IDs |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_BASE_URL` | Cloudflare R2 uploads |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry error monitoring |
| `SENTRY_AUTH_TOKEN` | Source map upload during build |
| `GEMINI_API_KEY` | AI question generation |
| `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` | LINE bot |
| `NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED` | Negamon battle launcher |
| `NEXT_PUBLIC_OMR_DASHBOARD_ENABLED` | OMR section in dashboard |

> For the full annotated list see [`.env.example`](../.env.example).

---

## 4. MongoDB Atlas Setup

Render does **not** provision MongoDB. You must bring your own Atlas cluster.

1. Create a cluster on [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user with read/write access
3. Allow Render outbound IPs (or `0.0.0.0/0` temporarily)
4. Copy the connection string into `DATABASE_URL`
5. Schema is applied via `npx prisma db push` (runs automatically on every deploy via `preDeployCommand` in `render.yaml`)

**Ensure required indexes exist** (run once after first deploy):

```bash
npm run db:ensure-indexes
```

---

## 5. Google OAuth Setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add **Authorized redirect URI**:
   ```
   https://your-app.onrender.com/api/auth/callback/google
   ```
4. Copy Client ID → `GOOGLE_CLIENT_ID`, Client Secret → `GOOGLE_CLIENT_SECRET`

**Verify OAuth is working:**

```bash
GET https://your-app.onrender.com/api/auth/providers-status
# expect: { "google": true, "credentials": true }
```

---

## 6. Stripe Billing Setup (optional)

1. Create Products and Prices in the Stripe Dashboard
2. Copy the `price_...` IDs into `STRIPE_PRICE_PLUS_MONTHLY` and `STRIPE_PRICE_PLUS_YEARLY`
3. Create a webhook endpoint in Stripe → `https://your-app.onrender.com/api/webhooks/stripe`
4. Subscribe to events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

**Local webhook testing:**

```bash
npm run billing:stripe-listen          # forward Stripe events to localhost
npm run billing:stripe-print-secret    # copy whsec_... to STRIPE_WEBHOOK_SECRET
npm run billing:stripe-trigger-checkout  # fire a test event
```

---

## 7. Health Checks

| Endpoint | Type | Use |
|----------|------|-----|
| `GET /api/health` | Liveness | Lightweight — process is up |
| `GET /api/ready` | Readiness | Checks env + DB — used by Render health check |

> **Point Render's health check at `/api/ready`**, not `/api/health`.

---

## 8. Build Process

`npm run build` does four things in sequence:

```
1. npm run clean          → delete .next/ and dist/
2. prisma generate        → regenerate Prisma client
3. next build             → compile Next.js app
4. tsc --project tsconfig.server.json  → compile server.ts → dist/
```

The resulting `dist/server.js` is what `run-server.cjs` loads at startup.

---

## 9. Pre-Deploy Verification

Run these locally before pushing to `main`:

```bash
npx tsc --noEmit      # type-check
npx eslint .          # lint
npm test              # full Vitest suite
npm run build         # smoke-check the build
```

---

## 10. Common Failure Cases

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| App boots locally, fails on Render | Missing `DATABASE_URL` / `AUTH_SECRET` / `NEXTAUTH_URL` | Check Render env vars |
| Login callback error | `NEXTAUTH_URL` has trailing slash or wrong origin | Remove trailing slash; match exact public URL |
| Google sign-in shows `error=Configuration` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` missing or wrong redirect URI | Check Google Console + env vars |
| Socket.io not connecting | `NEXT_PUBLIC_SOCKET_URL` wrong or CORS origin mismatch | Set `SOCKET_IO_CORS_ORIGIN` to exact public URL |
| Prisma errors after deploy | Schema not pushed | Run `npx prisma db push` manually |
| `[auth] Google OAuth disabled` in logs | OAuth env vars missing | Set both `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Student login code not working | `NEXT_PUBLIC_APP_URL` uses `0.0.0.0` or internal port | Must be the public HTTPS URL |

---

## 11. Rollback

Render keeps previous deploys. To roll back:

1. Go to Render Dashboard → your service → **Deploys**
2. Find the last good deploy → click **Redeploy**

If the rollback involves a schema change, manually revert it:

```bash
# local machine with production DATABASE_URL
npx prisma db push --force-reset   # ⚠️ destructive — use only if safe
```

---

## 12. Database Maintenance Scripts

```bash
npm run db:print-target                  # confirm which DB you're pointed at
npm run db:ensure-indexes                # create required MongoDB indexes
npm run db:cleanup-rpg:dry-run           # preview legacy RPG data cleanup
npm run db:cleanup-rpg                   # apply legacy RPG data cleanup
npm run db:report-duplicate-emails       # report duplicate user emails
npm run db:merge-duplicate-users         # merge duplicate accounts
npm run db:cleanup-negamon-legacy:dry-run  # preview Negamon legacy cleanup
npm run db:cleanup-negamon-legacy        # apply Negamon legacy cleanup
```

> ⚠️ Always run `db:print-target` before any destructive database operation to confirm
> you are on the right database.

---

## Further Reading

- [RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md) — detailed Render-specific notes and troubleshooting
- [render-deploy.md](render-deploy.md) — Blueprint walkthrough and common failure cases
- [production-readiness-runbook.md](production-readiness-runbook.md) — pre-launch checklist
- [backup-restore-runbook.md](backup-restore-runbook.md) — backup and restore procedures
- [phase-1-capacity-monitoring-runbook.md](phase-1-capacity-monitoring-runbook.md) — capacity monitoring
- [GETTING_STARTED.md](GETTING_STARTED.md) — local dev setup
