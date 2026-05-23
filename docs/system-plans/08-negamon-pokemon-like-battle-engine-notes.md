# System Notes 08: Pokemon-Like Battle Engine Patterns for Negamon

Last updated: 2026-05-23

## Sources Reviewed

- Pokemon Showdown separates the client, game server, and battle simulator. The game server owns battle simulation and communicates with clients through sockets/protocol messages.
- Pokemon Showdown exposes its simulator as a Node.js package and keeps battle simulation in `sim/`, separate from UI and server routes.
- `pkmn/engine` models battles as state plus two core operations: `update` the battle from player choices, and compute valid `choices` from the current state.
- `@smogon/calc` keeps damage calculation as a reusable package with explicit attacker, defender, move, and field inputs.

## Patterns We Should Adopt

- Server owns turn resolution. Client sends intent only; server decides actor order, energy, damage, status, faint, and reward.
- UI should receive valid choices from server state instead of guessing only from local state.
- Battle state transitions should be deterministic with seeded RNG and cursor/state version.
- Damage calculation should stay pure and testable, with no DB access.
- Logs/events should be structured first, translated/displayed later.

## Applied In This Pass

- Added `getBattleMoveChoices(fighter)` in `src/lib/battle-engine.ts`.
- `beginInteractive` and `turnInteractive` now return `validMoveChoices` from the server.
- `PLAYER_ACTION_REQUIRED` responses also include current `validMoveChoices`.
- Added regression coverage that high-EN and low-EN moves are reported correctly.

## Next Recommended Passes

- Feed `validMoveChoices` into `ActionMenu` so disabled states come from server choice data after every turn.
- Add `choiceRequestId` or `stateVersion` to each client action payload to reject stale UI clicks more clearly.
- Extract one-on-one battle protocol response types into a shared file so route, UI, and tests cannot drift.
- Add battle replay snapshots: initial fighters, seed, submitted choices, events, final reward.
