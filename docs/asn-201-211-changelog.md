# ASN-201 to ASN-211 Changelog

This changelog summarizes the Teacher Assignment Command Center delivery slice.

## ASN-201: Assignment Overview API

- Added teacher-facing assignment overview route:
  - `GET /api/teacher/assignments/overview`
- Added service aggregation for:
  - visible assignment counts
  - overdue counts
  - due-within-range counts
  - missing submission slots
- Added query normalization and ownership checks:
  - `range` (`7/14/30`, with optional `d` suffix)
  - `classId` (ObjectId, ownership-enforced)

## ASN-202: Assignment Command Center UI

- Added teacher dashboard component:
  - `src/components/dashboard/assignment-command-center.tsx`
- Added teacher summary stats + class-level rows + priority assignment list.
- Added EN/TH translations for assignment command center labels and states.

## ASN-203: Deep-Link Focus and Highlight

- Added deep-link behavior to classroom page:
  - `focus=assignments`
  - `highlightAssignmentId=<ObjectId>`
- Added query normalization in classroom page boundary.
- Added assignment table scroll + temporary highlight behavior.

## ASN-204: Hardening and Regression Coverage

- Added and updated tests for:
  - route auth/ownership/query behavior
  - classroom page query normalization
  - service aggregation behavior

## ASN-205: Helper Contract Layer

- Added shared helper functions for:
  - assignment overview API URL
  - classroom assignment deep links
  - class summary text formatting
- Added helper contract tests.

## ASN-206: Load Logic Extraction

- Extracted load behavior into dedicated module:
  - `loadTeacherAssignmentOverview(...)`
  - `useTeacherAssignmentOverview(...)`
- Added tests for success/failure/fallback behavior.

## ASN-207: Request Race Hardening

- Added latest-request gate to prevent stale responses overwriting latest state.
- Added unit tests for request gate behavior.

## ASN-208: AbortController Cancellation

- Added AbortController support to cancel previous in-flight requests.
- Added aborted-path handling in loader result contract.
- Added tests for abort behavior and signal forwarding.

## ASN-209: Link Canonicalization

- Unified deep-link generation through shared helpers.
- Removed remaining direct query-string concatenation in teacher command center.
- Expanded link helper tests.

## ASN-210: Rollout and Query Contract Docs

- Added query contract documentation:
  - `docs/assignment-command-center-query-contract.md`
- Added rollout checklist:
  - `docs/assignment-command-center-rollout-checklist.md`

## ASN-211: PR/Review Alignment Pack

- Updated PR template with explicit:
  - What changed
  - Why now
  - Risks
  - Test plan
- Added this changelog for reviewer context and release traceability.

## Notes

- This changelog is intentionally scoped to ASN-201..211 teacher assignment command center work.
- For route and security review standards, use existing governance docs in `docs/`.
