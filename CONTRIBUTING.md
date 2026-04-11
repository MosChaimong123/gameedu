# Contributing

This repo uses the governance and safety patterns added in Milestones 1-4. Use this file as the short entry point before opening a PR.

## Required Checks Before Opening A PR

Run:

```bash
npm run governance:check
npx tsc --noEmit
npx eslint .
npm run test:unit
npm run test:integration
npx next build
npm run smoke:build
```

## Required Review Docs

Pick the docs that match your change:

- Domain cleanup status: [docs/domain-legacy-cleanup-summary.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/domain-legacy-cleanup-summary.md)
- General security review: [docs/security-pr-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/security-pr-review-checklist.md)
- Route design: [docs/route-pattern-guide.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-pattern-guide.md)
- Route tests: [docs/route-authorization-test-template.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-authorization-test-template.md)
- Socket review: [docs/socket-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/socket-review-checklist.md)
- Page/server-component exposure review: [docs/page-data-exposure-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/page-data-exposure-checklist.md)
- Operational safety: [docs/operational-safety-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/operational-safety-contract.md)
- Error contract: [docs/error-code-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/error-code-contract.md)
- Team review workflow: [docs/contribution-review-workflow.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/contribution-review-workflow.md)

## Expectations

- Prefer canonical APIs and docs over backward-compat aliases or ad hoc root-level planning notes.
- New protected routes should include authorization tests.
- New public or abuse-prone routes should be reviewed for rate limiting.
- New privileged mutations should be reviewed for audit logging.
- New user-facing error paths should prefer structured `error.code` and shared UI helpers.
- Server components and pages should prefer `select` or narrow DTOs over passing wide Prisma models.

## Pull Requests

This repo includes a PR template at [pull_request_template.md](/C:/Users/IHCK/GAMEEDU/gamedu/.github/pull_request_template.md). Fill it in fully, especially the verification and security review sections.
