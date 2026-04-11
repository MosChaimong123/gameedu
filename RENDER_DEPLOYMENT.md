# GameEdu Render Deployment Guide

GameEdu is ready to deploy to Render as a single `Web Service`.

The production shape is:
- Next.js 16 app
- custom Node server for Socket.IO
- Prisma client
- external MongoDB Atlas database

## 1. Recommended Render Setup

- Service type: `Web Service`
- Runtime: `Node`
- Region: `Singapore`
- Plan: `Free` by default
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check path: `/api/ready`

If you are deploying from GitHub, use the Blueprint in [render.yaml](/C:/Users/IHCK/GAMEEDU/gamedu/render.yaml).

## 2. Infrastructure You Must Bring

Render should host the app service.

You still need:
- MongoDB Atlas cluster
- Google OAuth app if you want Google sign-in
- app secrets for Auth.js / admin bootstrap

## 3. Required Environment Variables

Fill these in Render before the first successful boot:

| Variable | Required | Notes |
| :-- | :-- | :-- |
| `DATABASE_URL` | Yes | MongoDB Atlas connection string used by Prisma |
| `AUTH_SECRET` | Yes | Main Auth.js secret. `NEXTAUTH_SECRET` can act as a fallback, but keeping both equal is recommended |
| `NEXTAUTH_SECRET` | Recommended | Keep equal to `AUTH_SECRET` unless you intentionally separate them |
| `NEXTAUTH_URL` | Yes | Public app URL, e.g. `https://gamedu-app.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same public URL as above |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Same origin as the app on Render |
| `SOCKET_IO_CORS_ORIGIN` | Recommended | Set to the same public app URL |
| `ADMIN_SECRET` | Yes | Required for admin account bootstrap/protected admin flows |
| `AUTH_TRUST_HOST` | Yes | Set to `true` behind Render proxy |

## 4. Optional Environment Variables

| Variable | When needed | Notes |
| :-- | :-- | :-- |
| `GOOGLE_CLIENT_ID` | If using Google login | Optional |
| `GOOGLE_CLIENT_SECRET` | If using Google login | Optional |
| `GEMINI_API_KEY` | If using AI question generation | Optional |
| `RATE_LIMIT_STORE` | Usually leave default | `auto` becomes `mongo` in production |
| `AUDIT_LOG_SINK` | Usually leave default | `auto` becomes `both` in production |
| `HEALTHCHECK_DB_TIMEOUT_MS` | Optional | Default `3000` |

## 5. MongoDB Atlas Notes

Because Prisma uses MongoDB, Render does not provision the database for this app automatically.

Before first launch:
- Create a MongoDB Atlas cluster
- Add a database user
- Add Render network access
  - easiest starting point: temporary `0.0.0.0/0`
  - tighter allowlisting is better once you know your outbound path constraints
- copy the connection string into `DATABASE_URL`

## 6. First Deploy Steps

1. Push the repo to GitHub
2. In Render, create a Blueprint from the repo or create a Web Service manually
3. Fill all secrets/environment variables
4. Deploy
5. After the first successful deploy, run:

```bash
npx prisma db push
```

On Render Free, `Shell` is not available, so run this from your local machine with the same production `DATABASE_URL`.

If you want sample data too:

```bash
npm run db:seed
```

## 7. Production Behavior Notes

- Socket.IO is served by the same custom Node process as the Next app
- Render `Web Service` is required; do not deploy this as a static site
- The app reads Render's `PORT` automatically
- `/api/health` is the liveness endpoint
- `/api/ready` is the readiness endpoint and should be used for Render health checks
- `npm run build` already handles:
  - cleanup
  - `prisma generate`
  - `next build`
  - server TypeScript compilation

## 8. Pre-Deploy Verification

Run these locally before pushing:

```bash
npm run lint -- src/app src/components src/lib
npm test
npm run smoke:build
```

## 9. Common Failure Cases

### App boots locally but fails on Render

Check:
- `DATABASE_URL` is set
- `AUTH_SECRET` is set
- at least one of `NEXTAUTH_URL` or `NEXT_PUBLIC_APP_URL` is set

### Login callback issues

Check:
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- Google OAuth redirect URL matches the Render domain

### Socket connection issues

Check:
- `NEXT_PUBLIC_SOCKET_URL` equals the public app URL
- `SOCKET_IO_CORS_ORIGIN` includes that same origin
- the app is deployed as a `Web Service`, not a static site

### Prisma errors after first deploy

Run:

```bash
npx prisma db push
```

## 10. Render URL

Blueprint entry:
- [render.yaml](/C:/Users/IHCK/GAMEEDU/gamedu/render.yaml)

Repo:
- [https://github.com/MosChaimong123/gameedu](https://github.com/MosChaimong123/gameedu)
