# Testing Guide

GameEdu uses **Vitest** for unit and integration tests and **Playwright** for
end-to-end tests. This document explains how to run each kind of test, how tests are
organised, and how to add new tests.

---

## Test Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit + integration tests (all `*.test.ts` files) |
| **Playwright** | End-to-end browser tests (`e2e/`) |
| **@vitest/coverage-v8** | Coverage reporting |
| `--pool threads` | All Vitest runs use worker threads for isolation |

---

## Running Tests

### Full Suite

```bash
npm test
# equivalent to: vitest run --config vitest.config.mts --pool threads
```

### Watch Mode

```bash
npm run test:watch
```

### With Coverage

```bash
npx vitest run --coverage
```

---

## Domain-Scoped Checks

Each `check:*` script runs the relevant tests **and** type-checks the server
(`tsc --project tsconfig.server.json`). Run these when working on a specific domain —
they are faster than the full suite and catch type regressions too.

| Command | Domain covered |
|---------|----------------|
| `npm run check:auth` | Auth, OAuth, session, role, authorization, rate limiting |
| `npm run check:classroom-core` | Classroom management, points, analytics, tab loaders |
| `npm run check:assignment-quiz` | Assignments, quizzes, scoring, teacher overview |
| `npm run check:student-dashboard` | Student portal, login codes, economy commands, notifications |
| `npm run check:economy-shop-ledger` | Economy ledger, shop, reconciliation |
| `npm run check:negamon-battle` | Negamon engine, rewards, balance, tuning |
| `npm run check:negamon-reward-audit` | Reward audit, remediation, effectiveness, resync |
| `npm run check:live-game` | Gold Quest, Crypto Hack, socket game handlers |
| `npm run check:omr` | OMR scanner, auth, sets |
| `npm run check:board-social` | Class board, uploads, media, storage |
| `npm run check:billing-plan` | Stripe, subscriptions, plan access |
| `npm run check:question-sets` | Set editor, uploads, AI import |

---

## Test Types

### Unit Tests (`src/**/__tests__/`, `src/**/\_\_tests__/`)

Fast, isolated tests for individual functions and modules. Located next to the code
they test or under `src/__tests__/`.

```bash
npm run test:unit
# excludes *.integration.test.ts
```

### Integration Tests

Tests that require a running database or multiple modules working together.

```bash
npm run test:integration
# uses vitest.integration.config.mts
```

> Integration tests need `DATABASE_URL` set in `.env.local`.

### Route Authorization Tests

Every API route should have a corresponding authorization test that verifies:

- unauthenticated requests are rejected (401/403)
- wrong-role requests are rejected
- cross-classroom/cross-user access is rejected

See the template: [route-authorization-test-template.md](route-authorization-test-template.md)

```bash
npm run check:auth   # runs the full auth + authorization suite
```

---

## End-to-End Tests (Playwright)

E2e tests live in `e2e/` and use `playwright.asn.config.ts`.

```bash
# Install Chromium once
npm run test:e2e:asn:install

# Run the full e2e suite (headless)
npm run test:e2e:asn

# Run with browser visible
npm run test:e2e:asn:headed

# Negamon reward resync smoke test only
npm run test:e2e:negamon-reward
```

> E2e tests require the dev server to be running (`npm run dev`) and a populated
> test database. Set `PLAYWRIGHT_BASE_URL` in `.env.local` if the server is not on
> the default port.

---

## Test File Conventions

| Pattern | Meaning |
|---------|---------|
| `src/__tests__/*.test.ts` | Route-level or cross-module tests |
| `src/lib/<domain>/__tests__/*.test.ts` | Domain-unit tests co-located with the lib |
| `src/components/**/__tests__/*.test.tsx` | Component tests (React) |
| `*.integration.test.ts` | Needs live DB — excluded from `test:unit` |
| `e2e/*.spec.ts` | Playwright e2e specs |

### Test Helper Utilities

```
src/__tests__/utils/route-test-helpers.ts   — shared route-test helpers (imported 20×)
```

---

## Writing a New Test

### New route authorization test

1. Copy the template from [route-authorization-test-template.md](route-authorization-test-template.md)
2. Place in `src/__tests__/<domain>-route-auth.test.ts`
3. Use `route-test-helpers.ts` for setup

### New unit test

1. Create `src/lib/<domain>/__tests__/<module>.test.ts`
2. Import the module directly — no server needed
3. Use Vitest `expect`, `vi.fn()`, `vi.mock()` as needed

### New component test

1. Create `src/components/<domain>/__tests__/<Component>.test.tsx`
2. Use `@testing-library/react` (already a dependency via Vitest)

---

## Quality Checks (Beyond Tests)

```bash
npx tsc --noEmit          # Type-check (no output)
npx eslint .              # Lint
npm run check:i18n        # Detect hardcoded (non-translated) strings
npm run check:i18n:strict # Stricter i18n scan
npm run check:phase1      # Phase-1 production readiness checks
```

---

## CI Pipeline

Tests run automatically on every push via GitHub Actions (`.github/workflows/ci.yml`).

The pipeline runs:

| Job | What it does |
|-----|-------------|
| `governance` | PR hygiene checks |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `test-unit` | Vitest unit suite |
| `test-integration` | Vitest integration suite |
| `build-smoke` | `npm run build` smoke check |

All jobs must pass before merging.

---

## Manual QA Checklists

Before releasing, use the relevant manual checklist for your domain:

| Domain | Checklist |
|--------|-----------|
| Auth / OAuth | [auth-manual-qa-checklist.md](auth-manual-qa-checklist.md) |
| Classroom core | [classroom-core-manual-qa-checklist.md](classroom-core-manual-qa-checklist.md) |
| Assignments & quizzes | [assignment-quiz-manual-qa-checklist.md](assignment-quiz-manual-qa-checklist.md) |
| Student dashboard | [student-dashboard-manual-qa-checklist.md](student-dashboard-manual-qa-checklist.md) |
| Lessons / online course | [lesson-online-course-manual-qa-checklist.md](lesson-online-course-manual-qa-checklist.md) |
| Economy / shop | [economy-shop-ledger-manual-qa-checklist.md](economy-shop-ledger-manual-qa-checklist.md) |
| Live games | [live-game-host-play-socket-manual-qa-checklist.md](live-game-host-play-socket-manual-qa-checklist.md) |
| Negamon battle | [negamon-battle-manual-qa-checklist.md](negamon-battle-manual-qa-checklist.md) |
| OMR | [omr-manual-qa-checklist.md](omr-manual-qa-checklist.md) |
| Board / social | [board-social-manual-qa-checklist.md](board-social-manual-qa-checklist.md) |
| Billing / plan | [billing-plan-manual-qa-checklist.md](billing-plan-manual-qa-checklist.md) |
| Question sets | [question-sets-editor-upload-manual-qa-checklist.md](question-sets-editor-upload-manual-qa-checklist.md) |
| i18n | [i18n-manual-qa-checklist.md](i18n-manual-qa-checklist.md) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tests fail with `Cannot find module '@/...'` | Check `vitest.config.mts` alias — `@` maps to `./src` |
| Integration tests timeout | Ensure `DATABASE_URL` is set and MongoDB is reachable |
| Flaky test | See [flaky-test-triage-checklist.md](flaky-test-triage-checklist.md) |
| Playwright `browser not found` | Run `npm run test:e2e:asn:install` first |
| Type errors on `npm test` | Run `npx tsc --noEmit` first to see full diagnostics |

---

## Further Reading

- [test-ci-maturity-playbook.md](test-ci-maturity-playbook.md) — test strategy and CI maturity goals
- [flaky-test-triage-checklist.md](flaky-test-triage-checklist.md) — diagnosing unstable tests
- [route-authorization-test-template.md](route-authorization-test-template.md) — template for route-auth tests
- [architecture.md](architecture.md) — understanding what to test at each layer
