/**
 * CTB Engine — Conditional Turn-Based system (FFX-style)
 *
 * Each entity has a counter that increases by their speed each tick.
 * When the counter reaches CTB_THRESHOLD (1000), it is their turn.
 * After acting, the counter resets to the overflow amount.
 *
 * Turn order examples (playerSpeed=105 Rogue, bossSpeed=95 shadow_queen NORMAL):
 *   Tick  1: Player acts  (faster → goes first from 0)
 *   Tick  2: Boss   acts  (boss counter carried over)
 *   Tick  3: Player acts
 *   ...  slightly more player turns per boss turn
 *
 * For equal speeds (both 80): P → B → P → B → ... (strict alternation)
 */

import { CTB_THRESHOLD } from "./stat-calculator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TurnOwner = "player" | "boss";

/** Persisted CTB counters stored on PersonalClassroomBoss */
export interface CTBState {
  playerCounter: number; // 0 … CTB_THRESHOLD-1
  bossCounter: number;   // 0 … CTB_THRESHOLD-1
}

/** One slot in the predicted timeline */
export interface TurnSlot {
  owner: TurnOwner;
  index: number; // 0 = next turn, 1 = turn after, …
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Integer ticks until a counter reaches CTB_THRESHOLD at the given speed.
 * Returns 0 if the counter is already at or above the threshold
 * (entity is ready to act immediately).
 */
function ticksUntilAct(counter: number, speed: number): number {
  if (counter >= CTB_THRESHOLD) return 0;
  return Math.ceil((CTB_THRESHOLD - counter) / speed);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create an initial CTBState where both entities start proportionally
 * ahead based on their speed so the first turn feels natural.
 *
 * Player gets a slight advantage in a tie (speed-proportional head start).
 */
export function createInitialCTBState(
  playerSpeed: number,
  bossSpeed: number
): CTBState {
  // Give each side a head start proportional to their share of total speed.
  // Multiply by 0.5 so neither entity acts on the very first tick.
  const total = playerSpeed + bossSpeed;
  return {
    playerCounter: Math.floor((playerSpeed / total) * CTB_THRESHOLD * 0.5),
    bossCounter:   Math.floor((bossSpeed   / total) * CTB_THRESHOLD * 0.5),
  };
}

/**
 * Advance the CTB counters until the next entity is ready to act.
 *
 * - Player wins tie-breaks (player-friendly design).
 * - After acting, the actor's counter carries the overflow
 *   (e.g. if counter reaches 1040, new counter = 40 — high-speed actors
 *    get their next turn slightly sooner, rewarding speed investment).
 */
export function advanceToNextTurn(
  state: CTBState,
  playerSpeed: number,
  bossSpeed: number
): { owner: TurnOwner; newState: CTBState } {
  const playerTicks = ticksUntilAct(state.playerCounter, playerSpeed);
  const bossTicks   = ticksUntilAct(state.bossCounter,   bossSpeed);

  const minTicks = Math.min(playerTicks, bossTicks);

  const advPlayer = state.playerCounter + playerSpeed * minTicks;
  const advBoss   = state.bossCounter   + bossSpeed   * minTicks;

  // Player acts if they tied or reach threshold first
  if (playerTicks <= bossTicks) {
    return {
      owner: "player",
      newState: {
        playerCounter: advPlayer - CTB_THRESHOLD,  // carry overflow
        bossCounter:   advBoss,
      },
    };
  } else {
    return {
      owner: "boss",
      newState: {
        playerCounter: advPlayer,
        bossCounter:   advBoss - CTB_THRESHOLD,    // carry overflow
      },
    };
  }
}

/**
 * Predict the next `steps` turns without mutating the original state.
 * Used by the UI Timeline Bar (PR4) to render upcoming turns.
 *
 * @param state       Current CTB counters
 * @param playerSpeed StatCalculator.getCTBSpeed(stats.spd)
 * @param bossSpeed   getBossCTBSpeed(preset, difficultyId)
 * @param steps       Number of future turns to predict (default 8)
 */
export function predictTimeline(
  state: CTBState,
  playerSpeed: number,
  bossSpeed: number,
  steps = 8
): TurnSlot[] {
  const slots: TurnSlot[] = [];
  let current: CTBState = { ...state };

  for (let i = 0; i < steps; i++) {
    const { owner, newState } = advanceToNextTurn(current, playerSpeed, bossSpeed);
    slots.push({ owner, index: i });
    current = newState;
  }

  return slots;
}

/**
 * Apply a speed modifier to a CTB counter (Slow / Haste mechanic — PR5).
 *
 * Slow  on boss:   counter -= amount  (pushes the boss further from acting)
 * Haste on player: counter += amount  (pulls the player closer to acting)
 *
 * Results are clamped to [0, CTB_THRESHOLD - 1].
 */
export function applyCounterModifier(
  counter: number,
  delta: number
): number {
  return Math.max(0, Math.min(CTB_THRESHOLD - 1, counter + delta));
}

/**
 * How full (0–1) is the given counter as a fraction of CTB_THRESHOLD.
 * Useful for rendering a "charge bar" in the UI.
 */
export function ctbProgress(counter: number): number {
  return Math.min(1, counter / CTB_THRESHOLD);
}
