# Architecture Guards

This document describes the lightweight architecture guard used after the route,
service, and UI decomposition passes.

## Command

```bash
npm run check:architecture
```

The command runs `scripts/check-architecture-guards.mjs`. It is intentionally a
static contract check, not a full architecture analyzer. The goal is to prevent
recently cleaned areas from sliding back into the old shape while legacy hotspots
continue to be refactored in smaller phases.

## What It Enforces

- Refactored API routes for lessons, assignments, worksheet review/export,
  student notifications, and student topic assessment attempts must delegate to
  `src/lib/services/**`.
- Thin adapter routes that were cleaned up must not import `@/lib/db` directly.
- Thin adapter routes stay under a small line-count budget so business logic does
  not drift back into route handlers.
- AI lesson generation routes must share the lesson AI generation service.
- `ClassroomTable` must keep the LINE submission review hint extracted into
  `src/components/classroom/line-submission-review-hint.tsx`.
- The student lesson route page must remain a thin composition boundary, while
  API orchestration and video tracking stay in dedicated hooks.
- Student lesson presentational modules must not call `fetch()` or import Prisma
  types, and the player client stays within its post-decomposition line budget.
- Student lesson UI must not reintroduce local active-topic filtering based on
  stored `contentStatus`.
- Docs must continue to mention this guard command.

## When To Run

Run this command when changing:

- `src/app/api/lessons/**`
- `src/app/api/ai/lessons/**`
- `src/app/api/classrooms/[id]/assignments/**`
- `src/app/api/student/[code]/notifications/**`
- `src/app/api/student/[code]/lessons/**/assessment/**`
- `src/components/classroom/classroom-table.tsx`
- `src/app/student/[code]/lessons/[lessonId]/page.tsx`
- `src/components/lessons/student-player/**`
- `src/lib/services/lessons/**`
- `src/lib/services/assignments/**`
- `src/lib/services/student-dashboard/**`

## Updating The Guard

Update the guard only when the architecture intentionally changes. Prefer adding
specific contracts for cleaned areas over broad rules that fail on known legacy
hotspots. If a route grows beyond the line budget, move the new business logic
into a service before raising the budget.

## Relationship To Other Checks

`npm run check:architecture` complements, but does not replace:

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- targeted Vitest route/service/component tests
- relevant domain checks such as `npm run check:student-dashboard`
