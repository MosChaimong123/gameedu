# Assignment Command Center PR Body Template

Use this body for ASN-related PRs, then replace placeholders before opening the PR.

## Summary

- What changed:
  - `<API/UI/tests/docs changes>`
- Why now:
  - `<problem and timing>`

## Change Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs
- [ ] Test-only

## What Changed (Detailed)

- API:
  - `<routes/services updated>`
- UI:
  - `<components/pages updated>`
- Tests:
  - `<new/updated tests>`
- Docs:
  - `<contracts/checklists/changelog updates>`

## Why

- Problem addressed:
  - `<concise problem statement>`
- Why this approach:
  - `<tradeoff and rationale>`

## Risk Assessment

- User impact risk:
  - `<low/medium/high + reason>`
- Security/data exposure risk:
  - `<low/medium/high + reason>`
- Operational risk:
  - `<load/abuse/reliability notes>`
- Mitigations:
  - `<tests, guards, rollback steps>`

## Query/Deep-Link Contract Impact

- [ ] No query semantics changed
- [ ] Query semantics changed and docs/tests were updated in same PR

If changed, list exactly:

- Added/changed params: `<param list>`
- Normalization behavior: `<rules>`
- Safe fallbacks: `<fallbacks>`

## Test Plan

- Targeted tests run:
  - [ ] `npx vitest run <test-file-1>`
  - [ ] `npx vitest run <test-file-2>`
  - [ ] `npx vitest run <test-file-3>`
- Functional manual checks:
  - [ ] Dashboard cards render expected data
  - [ ] Deep-link opens intended tab/focus/highlight
  - [ ] Error + retry behavior works

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx eslint .`
- [ ] `npm test`
- [ ] `npx next build`

## Security And Data Review

- [ ] Reviewed against `docs/security-pr-review-checklist.md`
- [ ] Route work follows `docs/route-pattern-guide.md`
- [ ] Protected route tests align with `docs/route-authorization-test-template.md`
- [ ] Page data exposure reviewed when server/page data changed

## Operational Safety

- [ ] New public or abuse-prone routes checked for rate limiting
- [ ] Privileged mutations checked for audit logging
- [ ] User-facing error paths use structured `error.code`

## Risks / Follow-ups

- Accepted risks:
  - `<if any>`
- Deferred tasks:
  - `<if any>`

## Rollback Plan

1. `<first rollback action>`
2. `<second rollback action>`
3. `<validation command/check after rollback>`

## Optional Release Notes Snippet

- User-facing:
  - `<bullet>`
- Internal/ops:
  - `<bullet>`
