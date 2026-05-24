import { describe, expect, it } from "vitest";
import {
    encodeNegamonLiveBattleReason,
    encodeNegamonLiveBattleRewardReason,
    formatPointHistoryReason,
} from "@/lib/point-history-reason";

const LABELS: Record<string, string> = {
    negamonPointHistoryLiveBattle: "LIVE {rank}/{finalScore}/{startHp}",
    pointHistoryNegamonAttendance: "เช็คชื่อ — EXP มอนสเตอร์",
    pointHistoryNegamonQuestFallback: "รางวัลภารกิจ — EXP มอนสเตอร์",
    questLoginName: "เข้าแอปวันนี้",
    questCheckinName: "เช็คชื่อวันนี้",
    questChainLoginName: "รับรางวัลเข้าแอป",
    pointHistoryNegamonLevelUp: "เลื่อนระดับ Lv.{level}",
    pointHistoryNegamonSkillUnlock: "ปลดสกิลใหม่",
};

function fakeT(key: string, params?: Record<string, string | number>) {
    const template = LABELS[key] ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
        (text, [paramKey, value]) => text.replace(`{${paramKey}}`, String(value)),
        template
    );
}

describe("formatPointHistoryReason", () => {
    it("decodes v1 encoded negamon live battle reasons", () => {
        const raw = encodeNegamonLiveBattleReason(2, 80, 100);
        expect(formatPointHistoryReason(raw, fakeT)).toBe("LIVE 2/80/100");
    });

    it("decodes v2 idempotent negamon live battle reward reasons", () => {
        const raw = encodeNegamonLiveBattleRewardReason("123456", 1, 95, 100);
        expect(formatPointHistoryReason(raw, fakeT)).toBe("LIVE 1/95/100");
    });

    it("recognizes legacy Thai rows", () => {
        const legacy = "Negamon Battle สด — อันดับ #3 (50/100 HP)";
        expect(formatPointHistoryReason(legacy, fakeT)).toBe("LIVE 3/50/100");
    });

    it("formats negamon attendance and quest rewards", () => {
        expect(
            formatPointHistoryReason(
                "negamon_attendance_reward:checkin:student-1:2026-05-24",
                fakeT
            )
        ).toBe("เช็คชื่อ — EXP มอนสเตอร์");

        expect(
            formatPointHistoryReason(
                "negamon_quest_reward:daily:quest_login:quest:student-1:daily:2026-05-24:quest_login",
                fakeT
            )
        ).toBe("เข้าแอปวันนี้");

        expect(
            formatPointHistoryReason(
                "negamon_quest_reward:chain:chain:chain_learning_path:login:quest:student-1:chain:chain_learning_path:login",
                fakeT
            )
        ).toBe("รับรางวัลเข้าแอป");
    });

    it("formats level up and skill unlock reasons", () => {
        expect(formatPointHistoryReason("negamon_level_up:3", fakeT)).toBe("เลื่อนระดับ Lv.3");
        expect(formatPointHistoryReason("negamon_skill_unlocked:garuda-flame-burst", fakeT)).toBe(
            "ปลดสกิลใหม่"
        );
    });

    it("passes through unknown reasons", () => {
        expect(formatPointHistoryReason("Teacher bonus", fakeT)).toBe("Teacher bonus");
    });
});
