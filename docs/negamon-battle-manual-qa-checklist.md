# Negamon Battle / Monster Manual QA Checklist

Manual QA checklist for Plan 07 after the Negamon battle correctness and battle UI hardening pass.

## Automated Preflight

Run before or after each manual QA pass:

- `npm.cmd run check:negamon-battle`

Expected result:

- [x] `test:negamon-battle` passes
- [x] `predev` passes

## Dev QA

- [x] Student can open the Battle tab on mobile width without horizontal scrolling in the opponent picker, HUD, action row, or battle log
- [x] Invalid battle loadout is rejected with a readable error and a valid loadout save succeeds
- [x] Passive unlock route returns `NEGAMON_PASSIVES_DISABLED` and the UI does not offer passive purchases
- [x] Interactive battle can start, resolve server-owned turns, and finish with a fresh session on rematch
- [x] Auto and speed controls do not desync battle resolution or duplicate the completed session
- [x] Battle history and reward text stay readable in both Thai and English

## Staging QA

- [x] Real teacher session can create a temporary Negamon classroom fixture with two students
- [x] Real student codes can fetch battle opponents only inside their own classroom scope
- [x] Real student loadout save and invalid-loadout rejection work on staging
- [x] Real interactive and auto battles complete on staging without client-reported save paths
- [x] Real battle history and passive-disabled boundaries stay correct on staging

## Notes

- Prefer a temporary classroom fixture for staging and delete it after verification.
- Record classroom id, student ids, student codes, session ids, and whether reward payout was allowed or blocked by policy.
- Latest staging smoke on `2026-05-06` reused temporary classroom `69f9facaeaecc54536c0cdf1`, created students `69fb5fe993d9f1cbd2566495` / `69fb5fe993d9f1cbd2566496` with login codes `95E3SE3H3WQ7` / `25VJZRU87TWT`, then deleted the classroom after verification.
- Verified boundaries on staging: wrong student code was rejected on opponents lookup, invalid battle loadout returned `INVALID_BATTLE_LOADOUT`, passive unlock returned `NEGAMON_PASSIVES_DISABLED`, `saveInteractive` returned `SERVER_AUTHORITATIVE_REQUIRED`, auto battle saved session `69fb5fea93d9f1cbd2566497`, interactive battle saved session `69fb5feb93d9f1cbd2566499`, and interactive reward payout was correctly blocked by `pair_cooldown` after the earlier auto-battle reward.
