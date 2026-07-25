# Frontend Architecture Hotspot Cleanup

Date: 2026-07-11

## Goal

Phase 6 focuses on frontend architecture: component structure, state management,
routing boundaries, UI patterns, and the data/service boundary used by client
features.

This is an inventory and cleanup plan. The current worktree has many active UI
changes, so this phase should avoid broad UI rewrites until each hotspot can be
handled in a narrow PR-sized pass.

## Scope

In scope:

- Large page/client components under `src/app/**` and `src/components/**`
- Client-side state orchestration, fetch calls, routing, and dialogs
- UI components importing Prisma/domain persistence types directly
- Follow-up guard ideas for already-cleaned frontend boundaries

Out of scope for this phase:

- Visual redesign
- Behavior changes
- Moving large dirty files in one pass
- Replacing existing UI primitives or design tokens

## Hotspot Inventory

Snapshot from the current workspace:

| File | Lines | useState | useEffect | fetch | router usage | Primary concern |
|------|------:|---------:|----------:|------:|-------------:|-----------------|
| `src/components/classroom/classroom-line-assignment-panel.tsx` | 2128 | 25 | 3 | 6 | 0 | LINE assignment command center mixes data loading, filtering, dialogs, and dense render sections |
| `src/components/classroom/worksheet-builder.tsx` | 2033 | 10 | 3 | 0 | 0 | Worksheet editing schema, item editing, drag/drop, preview, and renderer controls live together |
| `src/app/dashboard/lessons/create/page.tsx` | 1950 | 19 | 7 | 1 | 3 | Wizard state, curriculum selection, AI/manual generation, and large JSX sections are in one route component |
| `src/components/classroom/classroom-economy-ledger-tab.tsx` | 1650 | 31 | 2 | 9 | 0 | Ledger filters, analytics, reconciliation, export, and adjustments share one state surface |
| `src/app/student/[code]/lessons/[lessonId]/page.tsx` | 1599 | 17 | 11 | 6 | 3 | Student lesson playback, video tracking, content tabs, sidebar, and assessment wiring are coupled |
| `src/components/dashboard/media-library-grid.tsx` | 1495 | 16 | 2 | 0 | 9 | Grid, preview, edit, delete, bulk tags, and navigation all live in one component file |
| `src/components/courses/course-builder-client.tsx` | 1439 | 26 | 10 | 7 | 4 | Course form, lesson fetching, assignment flow, curriculum filters, and assessment builder wiring are coupled |
| `src/app/dashboard/lessons/[id]/edit/page.tsx` | 1324 | 19 | 3 | 5 | 0 | Edit page owns load/save/publish/assign plus analytics filters and large render sections |
| `src/components/classroom/classroom-table.tsx` | 1242 | 6 | 3 | 4 | 0 | Table still has dense score/review render paths despite Phase 4 extraction |
| `src/components/classroom/add-assignment-dialog.tsx` | 1100 | 20 | 4 | 6 | 0 | Assignment create/edit form state, worksheet setup, quiz setup, visibility, delete, and API calls are coupled |
| `src/app/host/[setId]/page.tsx` | 1045 | 19 | 9 | 1 | 5 | Host setup, game settings, socket lifecycle, routing, and modal UI are in one page |
| `src/components/student/student-course-player.tsx` | 1032 | 13 | 3 | 6 | 3 | Course playback state, assessment attempts, certificate flow, and lesson navigation are coupled |

## Boundary Smells Found

- Several UI components still import Prisma model types directly, for example
  classroom dialogs/cards/tables and Negamon classroom overview. Prefer feature
  view models or `*.types.ts` contracts near services/components.
- Page routes such as lesson create/edit own too much client orchestration. They
  should compose a small client container and focused sections/hooks.
- Many large components combine server API fetches, transient UI state, modal
  state, filters, and JSX. These are the best candidates for hooks plus section
  components.
- Some query-string synchronization logic is embedded in large components. Prefer
  small helpers like the existing classroom page query normalizer pattern.

## Recommended Refactor Order

1. Lesson create/edit pages
   - Extract `lesson-builder.types.ts`, `use-lesson-builder-draft`, and section
     components for source selection, curriculum selection, topic/media editing,
     save/publish actions, and analytics.
   - Keep route pages as thin client containers or server pages that mount a
     client builder.
   - Validation: `teacher-lessons-routes`, lesson content tests, `tsc`, eslint.

2. Media library grid
   - Extract presentational pieces already visible in-file: media thumbnail,
     preview modal, edit dialog, bulk tags dialog, delete confirm, and grid
     toolbar.
   - Keep navigation callbacks in one container.
   - Validation: media/action tests, `tsc`, eslint.

3. Worksheet builder and assignment dialog
   - Split worksheet item editors by item type.
   - Move assignment form state into a hook or reducer.
   - Keep worksheet media picking as a separate panel boundary.
   - Validation: worksheet builder tests, worksheet schema/review tests,
     assignment route tests.

4. Student lesson/course playback
   - Extract video tracking hooks, content tab sections, assessment action hook,
     and sidebar navigation.
   - Keep login-code and lesson identifiers flowing through one typed context.
   - Validation: student lesson/course route tests, student dashboard tests,
     browser QA for video watch progress.

5. Classroom table and economy/LINE panels
   - Continue small decompositions like Phase 4.
   - Avoid one huge rewrite because these files mix high-risk teacher workflows.
   - Validation: classroom core checks, worksheet/LINE/manual score route tests.

6. Host/play game pages
   - Separate socket lifecycle hooks from setup UI and game mode/settings panels.
   - Align with existing socket review checklist.
   - Validation: `check:live-game`, socket integration tests, manual reconnect QA.

## Proposed Component Pattern

Use this shape for each hotspot:

```text
src/components/<domain>/<feature>/
  <feature>-client.tsx       # container: data calls, router, top-level state
  <feature>.types.ts         # UI/view model contracts
  use-<feature>-state.ts     # reducer or grouped state hooks
  <feature>-toolbar.tsx      # focused section
  <feature>-dialog.tsx       # focused dialog
  <feature>-empty-state.tsx  # presentational state
```

Keep API calls either in the container hook or a feature action module. Do not
spread fetch/error handling across many presentational children.

## State Management Rule

Prefer local state while the workflow is isolated. Move to a reducer when:

- There are more than 8 related `useState` calls.
- A form has create/edit/reset/submit/delete modes.
- Several dialogs depend on the same selected entity.
- URL query state and local filters must stay synchronized.

Do not introduce a global state library for these flows unless multiple routes
need the same live client state.

## Routing Rule

- Keep `useRouter`, `useSearchParams`, and query-string writes in a small
  container or route-query helper.
- Presentational components should receive callbacks and typed values, not
  router/search params directly.
- Reuse normalizer helpers for query state where possible.

## Guard Follow-Up

After the first concrete Phase 6 cleanup, extend `npm run check:architecture`
with narrow frontend contracts, for example:

- Extracted components must stay outside the route page.
- A cleaned page must stay under a line-count budget.
- A cleaned UI component must not import `@prisma/client`.
- A cleaned presentational component must not call `fetch()`.

Avoid applying these rules globally until legacy hotspots are refactored.

## Validation

Minimum for documentation-only Phase 6:

- `npm run check:architecture`
- `npx tsc --noEmit --incremental false`

For implementation passes:

- Targeted domain tests listed above
- `npx eslint <changed files>`
- `npm run check:i18n:strict` when user-facing UI strings change
- Browser/manual QA for lesson playback, media preview, worksheet editing, and
  host/socket flows

## Current Recommendation

Start with `src/app/dashboard/lessons/create/page.tsx` and
`src/app/dashboard/lessons/[id]/edit/page.tsx` once their current dirty changes
are ready to stabilize. They are large, user-facing, and already tied to the
service cleanup from earlier phases, so reducing their route/page complexity
will reinforce the new backend/service boundaries.

## Phase 6 Progress

- Started with a low-risk extraction from lesson create/edit pages: topic
  deliverable detection and topic content status now live in
  `src/lib/lessons/lesson-content.ts`.
- Added lesson content unit coverage so assessment-only topics can be shown as
  edited in draft/edit flows without becoming publishable content by themselves.
- Cleaned the first create-page hook warnings by stabilizing the default
  curriculum subject used during initial URL hydration and memoizing the selected
  lesson topic draft list.
