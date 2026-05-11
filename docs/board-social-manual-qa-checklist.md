# Board / Classroom Social Manual QA Checklist

Manual QA checklist for Plan 11 after the board action hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:board-social`

Expected result:

- [x] `test:board-social` passes
- [x] `predev` passes

## Dev QA

- [x] Board/classroom ownership is enforced for reads and mutations
- [x] Post delete is limited to the author or classroom teacher
- [x] Poll repeat voting updates the existing vote instead of creating a duplicate
- [x] Reaction retry/toggle does not create duplicate reactions
- [x] Unsafe external links, unsafe media URLs, invalid YouTube ids, empty polls, and oversized content are rejected
- [x] Comment content is trimmed and empty comments are rejected
- [x] Optimistic UI rollback and readable error toasts are verified in browser

## Staging QA

- [x] Real teacher can create a temporary board post in a classroom
- [x] Real linked student can read the board and interact only within their classroom scope
- [x] Poll voting updates a single vote when the same actor votes again
- [x] Reaction toggle add/remove stays consistent after refresh
- [x] Non-author linked student cannot delete someone else's post
- [x] Temporary staging post/poll fixtures are deleted after verification

## Notes

- Prefer a temporary classroom fixture already created for staging QA, then delete temporary board posts after verification.
- Record classroom id, board id, post ids, poll option ids, and the exact error shown for any blocked path.
- `npm.cmd run check:board-social` passed on `2026-05-08` with `2 files / 13 tests`.
- `npm.cmd run check:board-social` passed again on `2026-05-09` with `2 files / 16 tests` after server-side board validation hardening.
- Local browser QA on `2026-05-08` used classroom `69fe0c48fb0c7ac36007a6ef`.
- Verified unsafe link creation shows readable feedback: `The attached link or media URL is not valid.`
- Verified safe link creation refreshes the board and shows `Board safe link QA post` immediately.
- Staging browser QA on `https://www.teachplayedu.com/` used temporary classroom `69fe1852c742538ee879e088` (`QA Board Actors 1778260035368`), then deleted it after verification.
- Teacher actor `borisud29744@sikhiu.ac.th` created a link post and a poll fixture from the classroom board tab.
- Linked student actor 1 used student code `5YSXMBZZ7HRC`; linked student actor 2 used student code `CZJZDCLA5SZ4`.
- Student actor 1 created `Student staging board poll`, voted `Student Alpha`, changed the vote to `Student Beta`, refreshed, and the poll remained at `1 votes` with `Student Beta` selected.
- Student actor 1 toggled a heart reaction on/off and refreshed after each state; reaction count persisted at `1` after add and disappeared after remove.
- Student actor 2 could read the board but had no delete/menu control for teacher posts or student actor 1's post.
- Cleanup proof: `DELETE /api/classrooms/69fe1852c742538ee879e088` returned `200`; follow-up `GET /api/classrooms/69fe1852c742538ee879e088` returned `404 NOT_FOUND`.
- Follow-up hardening: media-only safe link posts are accepted, link posts without a URL are rejected server-side, and poll votes now reject option ids that do not belong to the target poll.
