# Quarterly Security Sweep Routine

Use this routine at the start of each quarter or before large releases to keep the GameEdu security baseline from drifting.

## Objectives

- find new auth or ownership gaps before they reach production
- catch data exposure regressions from wide Prisma queries
- confirm new routes follow the shared contracts for errors, rate limiting, and audit logging

## Preparation

Review these docs first:

- [security-pr-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/security-pr-review-checklist.md)
- [route-pattern-guide.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-pattern-guide.md)
- [route-authorization-test-template.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-authorization-test-template.md)
- [socket-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/socket-review-checklist.md)
- [page-data-exposure-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/page-data-exposure-checklist.md)
- [error-code-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/error-code-contract.md)
- [operational-safety-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/operational-safety-contract.md)

## Sweep Passes

### 1. Route And Action Sweep

Check new or changed code under:

- `src/app/api`
- `src/actions`
- `src/lib/actions`

Questions:

- Does every protected route enforce auth, role, and ownership on the server?
- Does every guest flow prove its scope boundary?
- Are payloads validated and allowlisted?
- Are new error paths using structured `error.code`?

### 2. Page And Server-Component Sweep

Check:

- `src/app/dashboard`
- `src/app/admin`
- `src/app/student`

Questions:

- Are Prisma queries still `select`-based?
- Did any page start passing a wide ORM shape to a client component?
- Are admin or teacher pages protected at the page level as well as the API level?

### 3. Socket Sweep

Check:

- `src/lib/socket`
- `server.ts`

Questions:

- Does each event resolve identity server-side?
- Are room joins and room publishes gated correctly?
- Are event types allowlisted where needed?
- Are privileged and denied paths audited?

### 4. Operational Safety Sweep

Check:

- rate limits on public and high-cost routes
- audit logging on privileged mutations
- UI error helpers for newly added user-facing flows

Questions:

- Did any new route skip rate limiting even though it is public or abuse-prone?
- Did any privileged mutation land without audit logging?
- Did any new UI start parsing raw error strings again?

## Verification Commands

Run:

```bash
npx tsc --noEmit
npx eslint .
npm test
npx next build
```

## Expected Output

At the end of the sweep, produce:

- a short list of findings ordered by severity
- a list of accepted risks, if any
- a note confirming whether the baseline commands stayed green

## Team Rule

If the sweep finds a new auth, ownership, or data exposure issue, the fix should include a regression test in the same PR whenever practical.
