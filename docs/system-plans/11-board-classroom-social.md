# System Plan 11: Board / Classroom Social

Last updated: 2026-05-03

## Scope

- Board, posts, comments, images, YouTube links, polls, reactions

## Key Files

- `src/components/board`
- Board actions/API files
- Prisma: `Board`, `BoardPost`, `BoardPoll`, `BoardPollVote`, `BoardComment`, `BoardReaction`

## Problem Analysis Checklist

- [ ] ตรวจ board/classroom ownership
- [ ] ตรวจ post/comment edit/delete permission
- [ ] ตรวจ poll double vote
- [ ] ตรวจ reaction count race
- [ ] ตรวจ unsafe external link/embed
- [ ] ตรวจ image/media preview
- [ ] ตรวจ optimistic UI rollback

## Improvement Plan

1. Map all board mutations
2. Add action authorization tests
3. Harden link/media validation
4. Add poll/reaction idempotency checks
5. Manual QA social flow

## Validation

- `npm.cmd test -- src/__tests__/board-actions-auth.test.ts`
- `npm.cmd test -- src/__tests__/i18n-regression.test.ts`
- `npm.cmd run lint`
- `npm.cmd run build`

## Exit Criteria

- Board mutation ทุกตัวมี permission test
- Poll/reaction ไม่ duplicate จาก retry
