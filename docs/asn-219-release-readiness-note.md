# ASN-219 Release Readiness Note

Release readiness summary for Assignment Command Center delivery slice.

## Decision Snapshot

- Feature readiness: `Ready for controlled rollout` (pending manual QA checklist completion)
- Risk level: `Medium` (deep-link correctness and dashboard UX behavior)
- Rollback complexity: `Low to medium` (UI entry points and route/service can be reverted together)

## Preconditions Before Merge/Deploy

- [ ] `docs/asn-217-manual-qa-checklist.md` completed and attached to PR
- [ ] Targeted regression matrix in `docs/asn-216-hygiene-report.md` is green
- [ ] PR body includes contract links and risk notes
- [ ] Team agrees on deferred e2e scope

## Go / No-Go Criteria

Go if all are true:

- teacher dashboard flows pass manual QA checklist
- targeted vitest matrix remains green
- no new policy/security review findings

No-Go if any occurs:

- deep-link opens wrong tab/focus/highlight path
- stale data appears during rapid range switching
- route ownership/role behavior regresses

## Rollout Strategy

1. Merge during normal low-risk window.
2. Validate teacher dashboard flow on production-like account.
3. Monitor early user feedback for deep-link navigation mismatches.

## Rollback Plan

1. Revert dashboard entry points for assignment command center.
2. Revert classroom deep-link focus/highlight wiring.
3. Revert assignment overview route/service pair.
4. Re-run targeted regression matrix to confirm restored baseline.

## Post-Release Follow-up

- Add browser-level e2e for:
  - assignment deep-link click-through
  - highlight behavior stability
- Re-run full verification (`tsc/eslint/test/build`) once unrelated baseline issues are stabilized.
