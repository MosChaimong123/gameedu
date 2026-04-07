import { describe, expect, it } from "vitest";
import { encodeNegamonLiveBattleReason, formatPointHistoryReason } from "@/lib/point-history-reason";

function fakeT(key: string, params?: Record<string, string | number>) {
    if (key === "negamonPointHistoryLiveBattle" && params) {
        return `LIVE ${params.rank}/${params.finalScore}/${params.startHp}`;
    }
    return key;
}

describe("formatPointHistoryReason", () => {
    it("decodes v1 encoded negamon live battle reasons", () => {
        const raw = encodeNegamonLiveBattleReason(2, 80, 100);
        expect(formatPointHistoryReason(raw, fakeT)).toBe("LIVE 2/80/100");
    });

    it("recognizes legacy Thai rows", () => {
        const legacy = "Negamon Battle สด — อันดับ #3 (50/100 HP)";
        expect(formatPointHistoryReason(legacy, fakeT)).toBe("LIVE 3/50/100");
    });

    it("passes through unknown reasons", () => {
        expect(formatPointHistoryReason("Teacher bonus", fakeT)).toBe("Teacher bonus");
    });
});
