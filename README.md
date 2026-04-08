# GameEdu

GameEdu is a classroom platform that combines:

- teacher-managed classrooms
- student portal access by linked account or login code
- assignment, quiz, leaderboard, board, and analytics flows
- teacher/admin authoring and hosting tools
- real-time classroom games such as Gold Quest and Crypto Hack

## Current Domain Status

The legacy RPG/farming system has been removed from the active product flow.

What remains active:

- classroom management
- student points, history, achievements, notifications
- question set authoring
- OMR tools
- real-time classroom game sessions

What is now treated as legacy:

- old RPG cleanup collections and fields
- removed student sync/RPG state flows
- archived RPG art-prompt references

## Key Docs

- Contributor guide: [CONTRIBUTING.md](/C:/Users/IHCK/GAMEEDU/gamedu/CONTRIBUTING.md)
- Domain and legacy cleanup summary: [docs/domain-legacy-cleanup-summary.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/domain-legacy-cleanup-summary.md)
- Role semantics: [docs/role-semantics.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/role-semantics.md)
- Legacy RPG cleanup runbook: [docs/legacy-rpg-cleanup-runbook.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/legacy-rpg-cleanup-runbook.md)
- Production readiness runbook: [docs/production-readiness-runbook.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/production-readiness-runbook.md)
- Backup and restore runbook: [docs/backup-restore-runbook.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/backup-restore-runbook.md)
- Test and CI maturity playbook: [docs/test-ci-maturity-playbook.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/test-ci-maturity-playbook.md)
- Flaky test triage checklist: [docs/flaky-test-triage-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/flaky-test-triage-checklist.md)
- Security PR review checklist: [docs/security-pr-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/security-pr-review-checklist.md)
- Route pattern guide: [docs/route-pattern-guide.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-pattern-guide.md)
- Architecture conventions: [docs/architecture-conventions.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/architecture-conventions.md)
- Route authorization test template: [docs/route-authorization-test-template.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/route-authorization-test-template.md)
- Socket review checklist: [docs/socket-review-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/socket-review-checklist.md)
- Page data exposure checklist: [docs/page-data-exposure-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/page-data-exposure-checklist.md)
- Quarterly security sweep routine: [docs/quarterly-security-sweep-routine.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/quarterly-security-sweep-routine.md)
- Contribution review workflow: [docs/contribution-review-workflow.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/contribution-review-workflow.md)
- Error code contract: [docs/error-code-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/error-code-contract.md)
- Operational safety contract: [docs/operational-safety-contract.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/operational-safety-contract.md)
- Archived RPG art prompts: [docs/rpg-character-art-prompts.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/rpg-character-art-prompts.md)

## Scripts

```bash
npm run dev
npm test
npx tsc --noEmit
npx eslint .
npm run db:cleanup-rpg:dry-run
npm run db:cleanup-rpg
```

## Notes

- Run the dry-run cleanup before touching production legacy data.
- Treat `USER` as a generic authenticated account, not as a synonym for `STUDENT`.
- Prefer canonical plural classroom API paths such as `/api/classrooms/...`.
- Prefer shared auth and role helpers when adding new protected routes or pages.

