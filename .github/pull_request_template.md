## Summary

- What changed?
- Why now?

## Change Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Docs
- [ ] Test-only

## What Changed (Detailed)

- List touched areas (API/UI/DB/tests/docs)
- Include key file paths when useful

## Why

- What problem does this solve?
- Why this approach?

## Risk Assessment

- User impact if this regresses
- Security/data exposure risk
- Operational risk (load, abuse, reliability)

## Test Plan

- [ ] Happy path manually verified
- [ ] Reject/edge path verified
- [ ] Regression tests added/updated
- Commands run:
  - [ ] `npx vitest run <targeted-tests>`

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npx eslint .`
- [ ] `npm test`
- [ ] `npx next build`

## Security And Data Review

- [ ] I reviewed this PR against [Security PR Review Checklist](/C:/Users/IHCK/GAMEEDU/gamedu/docs/security-pr-review-checklist.md)
- [ ] Any new or changed route follows [Route Pattern Guide](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-pattern-guide.md)
- [ ] Any protected route includes or updates authorization tests using [Route Authorization Test Template](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-authorization-test-template.md)
- [ ] Any socket changes were reviewed against [Socket Review Checklist](/C:/Users/IHCK/GAMEEDU/gamedu/docs/socket-review-checklist.md)
- [ ] Any page or server-component data changes were reviewed against [Page Data Exposure Checklist](/C:/Users/IHCK/GAMEEDU/gamedu/docs/page-data-exposure-checklist.md)

## Operational Safety

- [ ] New public or abuse-prone routes were checked for rate limiting
- [ ] New privileged mutations were checked for audit logging
- [ ] New user-facing error paths use structured `error.code` and shared UI helpers

## Risks / Follow-ups

- What still needs follow-up?
- Are there any accepted risks or deferred tasks?

## Optional Release Notes Snippet

- User-facing change in 1-3 bullets
- Internal/ops notes in 1-3 bullets
