# Contribution Review Workflow

This workflow turns the Milestone 4 governance docs into a practical review loop for everyday development.

## When To Use This

Use this workflow for:

- API route changes
- server action changes
- page and server-component data fetch changes
- Socket.IO event changes
- admin, classroom, student, upload, AI, and login-code flows

## Author Workflow

Before opening a PR:

1. identify whether the change touches routes, pages, sockets, or privileged mutations
2. review the relevant checklist docs
3. add or update regression tests for auth, ownership, data exposure, or structured errors
4. run:

```bash
npx tsc --noEmit
npx eslint .
npm test
npx next build
```

## Reviewer Workflow

For each PR:

1. read the summary and risk notes in the PR template
2. open the most relevant checklist:
   - [security-pr-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/security-pr-review-checklist.md)
   - [socket-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/socket-review-checklist.md)
   - [page-data-exposure-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/page-data-exposure-checklist.md)
3. verify the route/page/socket pattern against [route-pattern-guide.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-pattern-guide.md)
4. verify the tests align with [route-authorization-test-template.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-authorization-test-template.md)
5. check whether the change should use:
   - structured errors from [error-code-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/error-code-contract.md)
   - rate limiting or audit logging from [operational-safety-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/operational-safety-contract.md)

## Review Heuristics

Ask these questions quickly:

- What identity does this code trust?
- What resource boundary does it protect?
- What exact data leaves the server?
- What abuse path or incident path exists if this fails?
- What test proves the protection?

## Escalation Rules

Pause review and request changes if:

- the policy exists only in the UI
- Prisma models are passed wide without `select` or DTO trimming
- a guest flow exposes broader data than intended
- a privileged mutation has no audit trail when it should
- a public or high-cost route has no rate limiting and is guessable or abusable
- a new protected route lands without regression coverage

## Quarterly Sweep Link

For broad audits instead of single PR review, use:

- [quarterly-security-sweep-routine.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/quarterly-security-sweep-routine.md)
