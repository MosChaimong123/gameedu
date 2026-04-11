import { describe, expect, it } from "vitest";
import { resolveNegamonTuning } from "../negamon-battle-tuning";
import { DEFAULT_NEGAMON_BATTLE_TUNING } from "../types/game";

describe("resolveNegamonTuning", () => {
    it("uses defaults when negamonBattle is absent", () => {
        expect(resolveNegamonTuning({})).toEqual(DEFAULT_NEGAMON_BATTLE_TUNING);
    });

    it("merges partial overrides and clamps out-of-range values", () => {
        const t = resolveNegamonTuning({
            negamonBattle: {
                startHp: 9999,
                roundSeconds: 3,
                movePower: 1,
            },
        });
        expect(t.startHp).toBe(500);
        expect(t.roundSeconds).toBe(5);
        expect(t.movePower).toBe(5);
        expect(t.betweenSeconds).toBe(DEFAULT_NEGAMON_BATTLE_TUNING.betweenSeconds);
    });
});
