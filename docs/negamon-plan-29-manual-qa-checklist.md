# Negamon Plan 29 Manual QA Checklist

Manual QA checklist for the Plan 29 movepool, growth, UI, and AI redesign release gate.

## Automated Preflight

Run before each manual pass:

- `npm.cmd test -- src/lib/game-negamon/__tests__/plan-29-release-gate.test.ts src/lib/game-negamon/__tests__/battle-balance.test.ts src/lib/game-negamon/__tests__/ai-engine.test.ts src/lib/game-negamon/__tests__/move-status-runtime.test.ts src/lib/game-negamon/__tests__/monster-snapshot.test.ts src/lib/game-negamon/__tests__/skill-loadout.test.ts src/lib/game-negamon/__tests__/progression.test.ts`
- `npm.cmd run check:negamon-battle`

Expected result:

- [ ] Release-gate regression suite passes
- [ ] Negamon battle preflight passes

## Local QA

- [x] New student at `Lv 1` sees exactly one species move plus `basic-attack`, and the first move matches the species opener identity in battle and profile UI
- [x] The same student gains the expected second, third, and fourth move unlocks at `Lv 4 / 8 / 16` without stale loadout ids or duplicate slots
- [x] A migrated student with an old stored unlock list is remapped to the canonical Plan 29 unlock list and stat snapshot
- [x] Profile, codex, and loadout screens show role tag, target style, move family, priority, and unlock level consistently for all six species
- [ ] Pyronox and Aerolisk feel proactive early and can convert to a clear finisher turn at `Lv 26`
- [ ] Terranoir and Tidemaw feel tanky without creating dead turns or unwinnable stalls
- [ ] Lumilune can win through sustain and tempo instead of only waiting for chip damage
- [x] Voltshade can disrupt energy and tempo without producing unreadable control spam
- [ ] Late-game capstone moves stay readable and fair when they land, including cooldown and energy tradeoffs

## Staging QA

- [ ] Teacher fixture can assign each of the six species and the selected student sees the same unlocks and stats as local
- [ ] Real student battle sessions keep loadout, unlock progression, and battle history consistent across refreshes
- [ ] Thai and English battle logs remain understandable when stat stages, drain healing, paralysis skips, and energy denial resolve in the same battle

## Notes

- Record classroom id, student ids, tested species ids, tested levels, and whether the run used a fresh or migrated student record.
- Prefer testing at `Lv 1`, `Lv 4`, `Lv 8`, `Lv 16`, `Lv 26`, and `Lv 50+` so both early pacing and late-game identity are covered.
- Latest local smoke on `2026-05-25` used classroom `6a12ee29a5e71c6c01a33947` with student `6a12ee47a5e71c6c01a3394e` (`7FUM5RLTLA4C`) and opponent `6a12ee47a5e71c6c01a3394f`.
- Verified local profile page rendered canonical Plan 29 Pyronox data at `Lv 16`, including role-tagged move cards, unlock pacing through `Lv 16`, next finisher at `Lv 26`, and energy pacing (`100 / +18 EN`).
- Verified local codex page rendered normalized base stats and move language for the classroom species list without leaking legacy move labels from stored classroom config.
- Verified local V3 battle flow could read opponents, start a session, read the session, and resolve one player move while preserving canonical skill metadata in the returned state.
- Latest six-species local fixture on `2026-05-25` used classroom `69c92744b57d21e0f3242fbe` (`Demo Class 101`) with:
  - `Alice / cmnbsf5su0001uv1hl8gqnbdk` → `Pyronox` at `Lv 1`
  - `Bob / cmnbsf5sx0003uv1hyt555ao7` → `Aerolisk` at `Lv 4`
  - `Charlie / cmnbsf5t00005uv1hlhh5b9oi` → `Terranoir` at `Lv 8`
  - `Diana / cmnbsf5t30007uv1hzyteqlse` → `Lumilune` at `Lv 16`
  - `Evan / cmnbsf5t60009uv1h4eeuo3zk` → `Voltshade` at `Lv 26`
  - `Fiona / cmnbsf5t8000buv1h6j8lmn9d` → `Tidemaw` at `Lv 50`
- Verified the six profile pages covered the intended unlock ladder `Lv 1 / 4 / 8 / 16 / 26 / 50` and showed the expected species identity, upcoming unlocks, and Plan 29 vocabulary.
- Verified the codex page from the same fixture listed all six species with the refreshed stat lines and type-chart content.
- Ran a temporary equal-level `Lv 26` battle pass for three pairings (`Pyronox vs Terranoir`, `Aerolisk vs Tidemaw`, `Lumilune vs Voltshade`) and restored the fixture back to the checkpoint ladder afterward.
- Local battle findings from that pass:
  - `Voltshade` disruption stayed readable and visible through energy-denial and control messages.
  - `Aerolisk vs Tidemaw` finished cleanly and exposed capstone / status interactions, though reward payout was blocked by `pair_cooldown` on repeat local runs.
  - `Pyronox vs Terranoir` and `Lumilune vs Voltshade` still need a human-driven pass for feel sign-off because scripted move selection can stall once PP or loadout choices become suboptimal.
- Remaining manual release work: finish the human-driven local matchup/fairness pass for the unchecked battle-feel items above, then repeat the final fairness checks on staging.
