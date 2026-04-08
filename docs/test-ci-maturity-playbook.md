# Test And CI Maturity Playbook

This playbook defines the Q3 2026 testing and CI structure for GameEdu.

## Test Lanes

The repo now treats tests in three practical lanes:

- unit and route tests: `npm run test:unit`
- integration tests: `npm run test:integration`
- full suite: `npm test`

## Build Smoke

After production build, run:

```bash
npm run smoke:build
```

This verifies:

- `.next` exists
- the server app-path manifest exists
- critical routes are present in build artifacts

Current critical routes:

- `/api/health/route`
- `/api/ready/route`
- `/dashboard/page`
- `/student/home/page`

## CI Job Layout

CI is split into independent jobs so failures are easier to read:

- `governance`
- `typecheck`
- `lint`
- `test-unit`
- `test-integration`
- `build-smoke`

This makes it clear whether a PR failed because of policy drift, types, lint, tests, or production build output.

## When To Add Integration Coverage

Prefer integration tests when the flow crosses:

- Socket.IO room or host logic
- auth plus resource ownership
- route behavior that is hard to trust with pure mocks
- production-like sequences such as join, reconnect, submit, build, or ready checks

## Merge Expectations

For critical-path changes:

- add or update unit coverage
- add integration coverage if the flow crosses auth, socket, or room boundaries
- keep build smoke green

## Commands

```bash
npm run governance:check
npx tsc --noEmit
npx eslint .
npm run test:unit
npm run test:integration
npx next build
npm run smoke:build
```
