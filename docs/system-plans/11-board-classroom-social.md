# System Plan 11: Board / Classroom Social

Last updated: 2026-05-08

## Scope

- Classroom board, posts, comments, images, YouTube links, polls, reactions

## Key Files

- `src/components/board`
- `src/lib/actions/board-actions.ts`
- `src/lib/board-action-error-messages.ts`
- Prisma: `Board`, `BoardPost`, `BoardPoll`, `BoardPollVote`, `BoardComment`, `BoardReaction`

## Problem Analysis Checklist

- [x] Check board/classroom ownership
- [x] Check post/comment author and teacher permissions
- [x] Check poll repeat vote behavior
- [x] Check reaction retry/toggle behavior
- [x] Check unsafe external link and media validation
- [x] Check image/media preview server-side safety boundaries
- [x] Check optimistic UI rollback and browser feedback states
- [x] Check staging teacher/student board flow with real data

## Improvement Plan

- [x] Map board mutations
- [x] Add board social one-command preflight
- [x] Add action authorization and idempotency tests
- [x] Harden link/media/content validation
- [x] Run staging QA social flow

## Validation

- `npm.cmd run check:board-social`
- `npm.cmd run check:i18n:strict`
- `npm.cmd run lint`
- `npm.cmd run build`
- Manual: `docs/board-social-manual-qa-checklist.md`

## Exit Criteria

- Board mutations have permission tests
- Poll/reaction retry paths do not duplicate user actions
- Unsafe board links/media are rejected server-side
- Staging board flow is verified with teacher and student actors

## Progress Note 1

- Added one-command Board/Social preflight in [package.json](/C:/Users/IHCK/GAMEEDU/gamedu/package.json): `npm.cmd run test:board-social` and `npm.cmd run check:board-social`.
- Added Board/Social manual QA checklist in [board-social-manual-qa-checklist.md](/C:/Users/IHCK/GAMEEDU/gamedu/docs/board-social-manual-qa-checklist.md).
- Hardened [src/lib/actions/board-actions.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/lib/actions/board-actions.ts) so board post creation validates post type, content length, poll shape, URL protocols, and YouTube ids on the server.
- Added regression coverage in [board-actions-auth.test.ts](/C:/Users/IHCK/GAMEEDU/gamedu/src/__tests__/board-actions-auth.test.ts) for unsafe links, invalid polls, delete permissions, poll vote updates, reaction toggles, unsupported reactions, and comment trimming.
- Remaining work is browser/staging QA for optimistic UI feedback and real teacher/student social flows.

## Progress Note 2

- `npm.cmd run check:board-social` passed on `2026-05-08` with `2 files / 13 tests`.
- Local browser QA on `http://localhost:3000` used classroom `69fe0c48fb0c7ac36007a6ef`.
- Verified the board tab opens, unsafe link creation surfaces readable feedback (`The attached link or media URL is not valid.`), and a safe link post refreshes into the board immediately.
- Remaining work for Plan 11 is staging verification with real teacher/student board actors.

## Progress Note 3

- Staging browser QA on `https://www.teachplayedu.com/` completed on `2026-05-08`.
- Used real teacher login `borisud29744@sikhiu.ac.th` and temporary classroom `69fe1852c742538ee879e088`.
- Created two temporary student profiles and linked them through the normal `Link to my account` flow: `5YSXMBZZ7HRC` and `CZJZDCLA5SZ4`.
- Verified teacher post creation, linked-student board read, student poll creation, repeat vote update without duplicate votes, reaction add/remove persistence after refresh, and non-author student delete controls staying unavailable.
- Deleted the temporary classroom fixture; follow-up classroom fetch returned `404 NOT_FOUND`.

## Progress Note 4

- Closed follow-up board validation defects on `2026-05-09`.
- Kept media-only safe link posts valid while rejecting link posts that omit the URL.
- Added poll option ownership validation so `voteBoardPoll` rejects option ids that do not belong to the post's poll.
- `npm.cmd run check:board-social` passed with `2 files / 16 tests`, followed by `predev`.
