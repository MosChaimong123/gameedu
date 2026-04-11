# PR Review Template Playbook

Use this playbook together with `.github/pull_request_template.md`.

## Purpose

Keep PR descriptions consistent and reviewable across API, UI, and operational-safety changes.

## Required Sections

Every PR should clearly answer:

1. **What changed**
2. **Why now**
3. **Risk assessment**
4. **Test plan**

If any section is weak or missing, reviewers should request updates before approval.

## Good Examples (Short Form)

### What changed

- Added `GET /api/teacher/assignments/overview` with range and class filtering.
- Added assignment command center cards and deep-link actions on dashboard.
- Added route/service/helper tests and query contract docs.

### Why now

- Teachers needed a single place to triage overdue and missing work quickly.
- Existing classroom workflows required too many clicks and no cross-class priorities.

### Risk assessment

- Regression risk: incorrect deep-link query can land users in wrong tab.
- Mitigation: centralized link helpers + query normalization + dedicated tests.

### Test plan

- `npx vitest run src/__tests__/teacher-assignments-overview-route.test.ts`
- `npx vitest run src/__tests__/teacher-assignment-overview-service.test.ts`
- `npx vitest run src/__tests__/assignment-command-center-helpers.test.ts`
- Manual: dashboard click-through to classroom focus/highlight.

## Reviewer Quick Gate

Before approval, check:

- Policy is server-enforced (auth/role/ownership), not UI-only.
- Query contract is explicit and documented when introducing new params.
- Tests include both allowed and reject paths.
- Risk and rollback notes are concrete, not placeholders.

## Suggested Link Bundle In PR

For assignment command center related changes, include:

- `docs/assignment-command-center-query-contract.md`
- `docs/assignment-command-center-rollout-checklist.md`
- `docs/asn-201-211-changelog.md`

## PR Draft Fast Start

Use the ready-to-edit draft body:

- `docs/assignment-command-center-pr-body-template.md`
- Pre-filled variant for this slice:
  - `docs/assignment-command-center-pr-body-prefilled-asn-201-213.md`
- Ready-to-submit variant with executed command log:
  - `docs/assignment-command-center-pr-body-ready-asn-214.md`

Example command:

```bash
gh pr create --title "<title>" --body-file docs/assignment-command-center-pr-body-template.md
```

One-command prepare flow (generates a branch+timestamp file under `tmp/pr-bodies`):

```bash
npm run pr:body:asn
```
