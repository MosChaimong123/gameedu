import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RewardResultModal } from "../RewardResultModal";

describe("RewardResultModal", () => {
    it("explains pair cooldown when gold is blocked after a win", () => {
        const html = renderToStaticMarkup(
            <RewardResultModal
                open
                requestedGoldReward={30}
                goldReward={0}
                rewardBlockedReason="pair_cooldown"
                reward={{
                    gold: 0,
                    exp: 53,
                    grantedItemIds: [],
                    levelUps: [],
                    unlockedSkillIds: [],
                    blockedReason: "pair_cooldown",
                }}
                onClose={() => {}}
            />
        );

        expect(html).toContain("คู่นี้ยังอยู่ในช่วงพักรางวัล");
        expect(html).toContain("ทองที่ควรได้");
        expect(html).toContain("ทองที่ได้จริง");
        expect(html).toContain("30");
        expect(html).toContain("0");
        expect(html).toContain("EXP 53");
    });
});
