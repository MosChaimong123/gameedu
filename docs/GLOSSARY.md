# Glossary

Project-specific terms, abbreviations, and naming conventions used throughout the
GameEdu codebase and documentation. When a term has a precise technical meaning here
that differs from common usage, this document is authoritative.

---

## Roles & Users

### USER
Generic authenticated account. **Not** a synonym for `STUDENT`. A `USER` can hold any
role. When writing code, use `USER` to mean "any signed-in person" and narrow the role
explicitly when needed.

> See [role-semantics.md](role-semantics.md) for the full role model.

### STUDENT
A `USER` who has joined at least one classroom as a student. Students access the
platform via a **login code** or by linking an account to a teacher-managed classroom.

### TEACHER
A `USER` with classroom-management permissions. Teachers create classrooms, assign
work, manage points, and host live game sessions.

### ADMIN
A platform-level administrator. Can manage users and classrooms across the system.
Created via the admin registration endpoint using `ADMIN_SECRET`.

### Login Code
A short alphanumeric code generated per classroom (or per student) that lets a student
join without a full account. Handled in `src/lib/student-login-code.ts`.

---

## Classroom & Assignments

### Classroom
The core organisational unit. A teacher creates a classroom; students join it.
Classrooms contain assignments, quizzes, a leaderboard, a board, and student point
records.

### Assignment
A piece of work a teacher creates and assigns to a classroom. Students submit
responses; teachers (or the system) score them.

### Quiz
An auto-graded assignment variant — students answer questions in sequence and receive
immediate feedback. Related to the Vitest suite `test:assignment-quiz`.

### OMR (Optical Mark Recognition)
Answer-sheet scanning tools built into GameEdu. Teachers upload or scan paper answer
sheets; the OMR module reads student responses using image processing (OpenCV in the
browser). Feature-flagged via `NEXT_PUBLIC_OMR_DASHBOARD_ENABLED`.

### Worksheet
A printable/exportable student worksheet generated from a question set. Handled in
`src/lib/print-student-login-cards.ts` and the worksheet builder component.

### Board
The classroom social feed — teachers and students can post messages, links, and
uploaded media. Backed by Cloudflare R2 for file storage.

### Leaderboard
Per-classroom ranking of students by points. Displayed on the student dashboard and
classroom dashboard.

---

## Real-Time Games

### Gold Quest
A host-driven quiz game played live in the classroom. The teacher (host) controls the
pace; students answer questions and accumulate gold.

### Crypto Hack
Another live classroom game. Implemented in `src/lib/game-engine/` alongside Gold Quest.

### Negamon
A Pokémon-inspired battle RPG layer built into GameEdu. Students choose a starter
monster (Negamon) and battle each other or in a classroom league. Economy (gold, items)
is separate from classroom points.

### Negamon Battle
A server-authoritative real-time PvP battle between two students' Negamon. The server
owns game state; clients only send inputs. See
[negamon-battle-phase-3-server-authority.md](negamon-battle-phase-3-server-authority.md).

### Negamon Economy
The in-game currency (`gold`) and item system for Negamon. Transactions are
idempotency-keyed and ledger-backed to prevent duplication.
See `src/lib/game-negamon/` and the economy docs.

### Starter (Negamon)
The first Negamon a student selects when joining the system. Selection is
handled in `StarterSelectionModal.tsx`.

### Game Session
A live real-time game instance (Gold Quest, Crypto Hack, or Negamon battle) running
over Socket.io. The teacher hosts; students join by classroom code or direct link.

---

## Economy & Billing

### Points
Classroom-level score awarded by the teacher (manually or via assignments/quizzes).
Distinct from Negamon gold. Displayed on the leaderboard.

### Gold
Negamon in-game currency. Earned via battles, quests, and passive income. Spent in
the in-game shop. Tracked in `EconomyTransaction` (MongoDB ledger).

### EconomyTransaction
A Prisma model representing a single gold credit or debit. Has an `idempotencyKey` to
prevent duplicate rewards.

### PLUS Plan
The paid subscription tier. Unlocks additional classroom features. Sold via Stripe
(monthly/yearly card or PromptPay QR for Thai users).

### PromptPay
Thai QR-code payment method supported for PLUS subscriptions via Stripe Checkout.

### Stripe Webhook
Stripe sends events (e.g. `checkout.session.completed`,
`customer.subscription.updated`) to `/api/webhooks/stripe`. Handled in
`src/lib/billing/`.

---

## Infrastructure & Tooling

### run-server.cjs
The custom Node.js server entry point. It boots Next.js and attaches Socket.io to the
same HTTP server, so real-time traffic and normal HTTP share one origin.

### server.ts
TypeScript source compiled by `predev`. Contains the Socket.io attachment logic and
server bootstrap. Output goes to `dist/`.

### App Router
Next.js 16 file-system routing under `src/app/`. API routes live in
`src/app/api/`, pages in `src/app/<route>/page.tsx`.

### Socket.io
The WebSocket library used for real-time game sessions (Gold Quest, Crypto Hack,
Negamon battle). The server attaches to the same port as Next.js via
`run-server.cjs`.

### Prisma
ORM used to talk to MongoDB. The schema lives in `prisma/schema.prisma`. Always use
the `db.ts` singleton — never instantiate `PrismaClient` directly.

### db.ts
`src/lib/db.ts` — the Prisma client singleton imported by 115 files. The single
gateway to MongoDB.

### R2
Cloudflare R2 object storage used for file uploads (board attachments, media library).
Falls back to local disk in dev when R2 env vars are absent.

### Auth.js / NextAuth v5
Authentication library. Supports Google OAuth, email/password credentials, and the
custom student login-code flow. Configuration in `src/auth.ts`.

### Audit Log
Append-only log of sensitive mutations (points changes, admin actions, economy
transactions). Written via `src/lib/security/audit-log.ts`.

### Sentry
Error and performance monitoring. Configured in `instrumentation.ts`. Optional in dev
(SDK is a no-op without `SENTRY_DSN`).

---

## Naming Conventions

| Term | Meaning |
|------|---------|
| `ASN` | Assignment (prefix used in script/test names, e.g. `asn-201`) |
| `OMR` | Optical Mark Recognition (answer-sheet scanning) |
| `QA checklist` | Manual pre-release verification checklist in `docs/` |
| `Runbook` | Step-by-step operational procedure document |
| `Phase 1` | The first commercial production milestone |
| `Legacy / RPG` | Removed farming/RPG system (not Negamon — Negamon is active) |
| `canon` | Canonical — the authoritative/preferred form (e.g. "canonical plural API paths") |
| `hydration` | React server → client state transfer (Next.js App Router context) |
| `idempotency key` | Unique string per economy transaction preventing duplicate credits |
| `login code` | Short alphanumeric code for student classroom access without a full account |

---

*For role definitions in detail see [role-semantics.md](role-semantics.md).
For the full architecture see [architecture.md](architecture.md).*
