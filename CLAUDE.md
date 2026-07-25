# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (predev runs tsc --project tsconfig.server.json first)
npm run dev

# Full test suite
npm test

# Domain-scoped: runs tests + type-checks tsconfig.server.json
npm run check:negamon-battle   # Negamon engine, rewards, balance
npm run check:auth             # Auth, OAuth, sessions, rate limiting
npm run check:classroom-core   # Classroom management, points, analytics
npm run check:economy-shop-ledger
npm run check:live-game
npm run check:assignment-quiz
npm run check:student-dashboard
npm run check:billing-plan
npm run check:question-sets
npm run check:board-social
npm run check:omr

# Run a single test file
node ./node_modules/vitest/vitest.mjs run --config vitest.config.mts --pool threads <path/to/test.ts>

# Type-check server code only
npx tsc --project tsconfig.server.json --noEmit

# Lint
npx eslint .

# Build (clean → prisma generate → next build → tsc server)
npm run build
```

## Architecture

**Stack:** Next.js 14 App Router + custom Node.js server (`server.ts`) + Socket.IO. Database is PostgreSQL via Prisma (`src/lib/db.ts` exports `db`). Path alias `@/` maps to `src/`.

**Server entrypoint:** `run-server.cjs` bootstraps CJS path aliases then loads `dist/server.js` (compiled from `server.ts`). The `predev` script compiles `server.ts` before Next starts.

**App Router layout:**
- `src/app/api/` — Next.js API routes (REST endpoints, server-only)
- `src/app/dashboard/` — Teacher-facing UI
- `src/app/student/` — Student portal
- `src/app/host/` / `src/app/play/` — Live game host/player views

**Core library layers (`src/lib/`):**
- `auth/`, `authorization/`, `role-guards.ts` — Auth.js + role-based access
- `services/` — Business logic services (classroom settings, gamification schema)
- `game-negamon/` — Negamon V4 battle engine (Pokémon Showdown-based)
- `game-engine/` — Live game engines (Crypto Hack, Gold Quest, Bingo)
- `negamon-lite/` — Lightweight Negamon engine variant (feature-flagged)
- `socket/` — Socket.IO event handlers for live games
- `billing/`, `plan/` — Stripe + Thai payment + plan access
- `curriculum/` — Curriculum catalog, course registry, subject mapping
- `lessons/` — AI-assisted lesson creation pipeline

## Negamon V4 Battle Engine

The V4 engine is server-authoritative. Battle state (`NegamonBattleStateV4`) lives in MongoDB's `battleSession` collection (Prisma model). Key files:

```
src/lib/game-negamon/
  core/
    monster-growth.ts    — stat calculation (NEGAMON_STAT_GROWTH_MULTIPLIERS + role offsets)
    monster-snapshot.ts  — NegamonDerivedStats + createNegamonMonsterSnapshotFromState
    skills.ts            — skill/move definitions with energyCost
    rules.ts             — damage formula, stat stages, STAB
    session-v4.ts        — NegamonBattleSessionResultV4 schema
  engine-showdown/
    adapter.ts           — BattleSession ↔ Showdown bridge, loadShowdownRuntime()
    mapper.ts            — NegamonShowdownSideSeed, team set builder
    state.ts             — all V4 battle state types
    negamon-stats-rule.ts — custom Showdown rule "Negamon Stats Mod" (B1 fix)
  server/
    battle-v4.ts         — createBattle, getBattleState, resolveAction
    battle-v4-completion.ts — gold/XP/reward on battle end
```

**Stat injection (B1):** Showdown runs proxy Pokémon species. The custom rule `negamonstatsmod` (format suffix `@@@Negamon Stats Mod`) overrides each combatant's `baseStats` via `onModifySpecies` using `target.set.negamonBaseStats`. HP > 255 uses `species.maxHP`. Base stats are injected (not level-scaled) so Showdown's own level formula produces correct values.

**Stat axis remap:** Negamon `spd` (speed) → Showdown `spe`; Negamon `def` → Showdown `def` + `spd` (special defense). `spa` (special attack) added in B1 alongside `atk`; SPECIAL-category moves use `spa`, PHYSICAL use `atk`.

**Species:** `src/lib/negamon-species.ts` — 6 species with `baseStats: { hp, atk, def, spd, spa }`. `MonsterBaseStats` in `src/lib/types/negamon.ts` has `spa?: number` (optional for backward compat).

## Testing Conventions

- Unit tests: `src/lib/<domain>/__tests__/` or `src/__tests__/`
- Integration tests (require `DATABASE_URL`): `*.integration.test.ts`
- Use `check:<domain>` scripts to run related tests + type-check together — this is the standard workflow before committing domain changes
- Route tests verify auth (401/403), wrong-role rejection, and cross-classroom access
- `src/__tests__/utils/route-test-helpers.ts` — shared helpers used across ~20 route tests

## Deployment

Render auto-deploys from `main` (push to main = live production). Never push without confirming. See `docs/DEPLOYMENT.md`.
