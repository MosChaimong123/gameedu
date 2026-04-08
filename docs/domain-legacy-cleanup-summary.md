# Domain And Legacy Cleanup Summary

This document is the canonical summary of the Q4 2026 domain and legacy cleanup pass.

## Canonical Domain Paths

- Classroom API paths use the plural form: `/api/classrooms/...`
- Singular classroom aliases such as `/api/classroom/...` are no longer part of the active contract
- Student portal access still supports linked accounts and login-code access where documented

## Removed Legacy Artifacts

The following categories were intentionally removed from the active repo surface:

- backward-compat classroom route aliases that only redirected to plural endpoints
- obsolete dashboard planning notes that no longer reflect the shipped product
- empty placeholder scripts and reports with no operational value

## Current Sources Of Truth

Use these documents instead of old planning notes:

- `README.md` for current product/domain overview
- `CONTRIBUTING.md` for contributor workflow
- `docs/route-pattern-guide.md` for protected route patterns
- `docs/role-semantics.md` for role/domain wording
- `docs/legacy-rpg-cleanup-runbook.md` for legacy data cleanup
- `docs/production-readiness-runbook.md` for production operations

## Cleanup Rules Going Forward

- Do not reintroduce singular `/api/classroom/...` aliases unless a real compatibility requirement is documented
- Do not keep empty scripts or reports in the repo as placeholders
- Prefer updating a canonical doc over adding ad hoc planning markdown at the repo root
- When a flow becomes legacy, either document it explicitly or remove it once no longer needed
