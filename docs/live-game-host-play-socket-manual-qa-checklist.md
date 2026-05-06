# Live Game / Host / Play / Socket Manual QA Checklist

Manual QA checklist for Plan 06 after the live-game and socket hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:live-game`

Expected result:

- [x] `test:live-game` passes
- [x] `predev` passes

## Dev QA

- [x] Host can create a room from an owned question set
- [x] Invalid or duplicate player joins are rejected cleanly
- [x] Host-only start/end protections hold
- [x] Player reconnect and host reconnect restore the live room correctly
- [x] Locked or ended rooms reject late joins as expected
- [x] Socket event authorization and rate-limit paths stay scoped to the live game

## Staging QA

- [x] Real teacher session can create a live game room from a real question set
- [x] Real player join, duplicate nickname rejection, and invalid-room rejection work on staging
- [x] Host reconnect and player reconnect work on staging
- [x] Started or ended room boundaries reject unauthorized or late joins on staging
- [x] Socket lifecycle smoke completes without stale duplicate room state

## Notes

- Reuse one temporary QA question set for staging host smoke, then delete it after verification.
- Record the exact set id, created room pin, reconnect tokens used, and lifecycle events observed during staging verification.
- Latest staging smoke on `2026-05-06` passed with temporary set `69fb5be5ac1eacca23a7ffc9` and room pin `720465`, then deleted the QA set successfully.
- Verified boundaries on staging: unauthorized host create was rejected, invalid room join was rejected, duplicate nickname was rejected, player reconnect during `PLAYING` returned the original reconnect token, and late/post-end joins were rejected with `playSocketGameLocked`.
