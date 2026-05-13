# Deploy GameEdu on Render

This app is a **single Web Service** (Node): Next.js UI plus a custom `server.ts` that attaches Socket.io on the same HTTP port. Use the Blueprint file at the repo root: `render.yaml`.

## 1. Prerequisites

- GitHub repo connected to Render (this project: `MosChaimong123/gameedu`).
- **MongoDB** cluster (e.g. MongoDB Atlas) and a connection string compatible with Prisma (`DATABASE_URL`).
- Blueprint `preDeployCommand` runs `npx prisma db push` before each release. If a deploy fails at that step, open **Render Shell** and run `npx prisma db push` manually, then redeploy.
- Optional after first boot: **Render Shell** → `npm run db:seed`

## 2. Create the Blueprint

Open: [New Blueprint (this repo)](https://dashboard.render.com/blueprint/new?repo=https://github.com/MosChaimong123/gameedu)

- Branch: `main`
- Blueprint path: `render.yaml`
- Fill every secret the UI lists (see table below).

## 3. Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | MongoDB URI for Prisma |
| `AUTH_SECRET` | Yes | Long random string (JWT/session) |
| `NEXTAUTH_SECRET` | Yes | Can match `AUTH_SECRET` |
| `NEXTAUTH_URL` | Yes | `https://<your-service>.onrender.com` (no trailing slash) |
| `NEXT_PUBLIC_APP_URL` | Yes | Same public HTTPS URL as above |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Same origin as the app (Socket.io on same host) |
| `SOCKET_IO_CORS_ORIGIN` | Recommended | Same URL, or comma-separated origins if you add more frontends |
| `ADMIN_SECRET` | Yes | Required to register the first admin user |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | If both are set, Google sign-in is enabled |
| `GEMINI_API_KEY` | Optional | AI question generation; leave unset if unused |

Render injects `PORT`; the server listens on `0.0.0.0` in production. `AUTH_TRUST_HOST` is set in `render.yaml` for Auth.js behind Render’s proxy.

## 4. Google OAuth (optional)

In Google Cloud Console, add **Authorized redirect URI**:

`https://<your-service>.onrender.com/api/auth/callback/google`

## 5. Health check

Render uses **`healthCheckPath: /api/ready`** in `render.yaml` (readiness: env + DB). **`/api/health`** is a lighter liveness probe for monitoring; do not point the Render service health check at `/api/health` unless you change `render.yaml` to match.

## 6. Optional app env (set in Dashboard if needed)

- `QUIZ_REVIEW_MODE` — global quiz review default (`end_only` / `never`); see `src/lib/quiz-review-policy.ts`.
