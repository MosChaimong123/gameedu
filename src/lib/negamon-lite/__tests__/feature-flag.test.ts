import { afterEach, describe, expect, it } from "vitest";
import { isNegamonLiteBattleEnabled } from "@/lib/negamon-lite/feature-flag";

const originalValue = process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED;

afterEach(() => {
    if (originalValue === undefined) {
        delete process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED;
    } else {
        process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED = originalValue;
    }
});

describe("isNegamonLiteBattleEnabled", () => {
    it("enables the lite battle by default", () => {
        delete process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED;

        expect(isNegamonLiteBattleEnabled()).toBe(true);
    });

    it("allows production rollback through env values", () => {
        process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED = "false";
        expect(isNegamonLiteBattleEnabled()).toBe(false);

        process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED = "0";
        expect(isNegamonLiteBattleEnabled()).toBe(false);

        process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED = "off";
        expect(isNegamonLiteBattleEnabled()).toBe(false);
    });
});
