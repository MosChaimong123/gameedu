"use strict";
/**
 * Property-Based Tests: Boss Operations Preservation
 *
 * Validates: Requirements R5/P1
 * ∀ classroom C, ∀ operation op ∈ {POST_boss, DELETE_boss}:
 *   op(C).gamifiedSettings.events === C.gamifiedSettings.events
 *   op(C).gamifiedSettings.customAchievements === C.gamifiedSettings.customAchievements
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
// Pure logic extracted from src/app/api/classroom/[id]/boss/route.ts
/**
 * Simulates the DELETE boss logic:
 * reads existing gamifiedSettings, removes only the boss key
 */
function applyBossDelete(gamifiedSettings) {
    const existing = gamifiedSettings || {};
    const { boss, ...rest } = existing;
    return rest;
}
/**
 * Simulates the POST boss logic:
 * reads existing gamifiedSettings, merges new boss key while preserving others
 */
function applyBossPost(gamifiedSettings, newBoss) {
    const existing = gamifiedSettings || {};
    return {
        ...existing,
        boss: newBoss,
    };
}
// Arbitraries
const eventArb = fast_check_1.default.record({ id: fast_check_1.default.string(), title: fast_check_1.default.string() });
const achievementArb = fast_check_1.default.record({ id: fast_check_1.default.string(), name: fast_check_1.default.string() });
const bossArb = fast_check_1.default.record({ name: fast_check_1.default.string(), maxHp: fast_check_1.default.integer({ min: 1, max: 10000 }) });
const gamifiedSettingsArb = fast_check_1.default.record({
    events: fast_check_1.default.array(eventArb),
    customAchievements: fast_check_1.default.array(achievementArb),
    boss: fast_check_1.default.option(bossArb, { nil: undefined }),
});
(0, vitest_1.describe)("Boss Preservation Properties", () => {
    /**
     * **Validates: Requirements R5/P1**
     * Boss DELETE must preserve events and customAchievements
     */
    (0, vitest_1.test)("Boss DELETE preserves events and customAchievements", () => {
        fast_check_1.default.assert(fast_check_1.default.property(gamifiedSettingsArb, (gamifiedSettings) => {
            const result = applyBossDelete(gamifiedSettings);
            (0, vitest_1.expect)(result.events).toEqual(gamifiedSettings.events);
            (0, vitest_1.expect)(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
        }));
    });
    /**
     * **Validates: Requirements R5/P1**
     * Boss DELETE must remove only the boss key
     */
    (0, vitest_1.test)("Boss DELETE removes only the boss key", () => {
        fast_check_1.default.assert(fast_check_1.default.property(gamifiedSettingsArb, (gamifiedSettings) => {
            const result = applyBossDelete(gamifiedSettings);
            (0, vitest_1.expect)(result).not.toHaveProperty("boss");
        }));
    });
    /**
     * **Validates: Requirements R5/P1**
     * Boss POST preserves events and customAchievements
     */
    (0, vitest_1.test)("Boss POST preserves events and customAchievements", () => {
        fast_check_1.default.assert(fast_check_1.default.property(gamifiedSettingsArb, bossArb, (gamifiedSettings, newBoss) => {
            const result = applyBossPost(gamifiedSettings, newBoss);
            (0, vitest_1.expect)(result.events).toEqual(gamifiedSettings.events);
            (0, vitest_1.expect)(result.customAchievements).toEqual(gamifiedSettings.customAchievements);
        }));
    });
    /**
     * **Validates: Requirements R5/P1**
     * Boss POST sets the new boss value
     */
    (0, vitest_1.test)("Boss POST sets the new boss value", () => {
        fast_check_1.default.assert(fast_check_1.default.property(gamifiedSettingsArb, bossArb, (gamifiedSettings, newBoss) => {
            const result = applyBossPost(gamifiedSettings, newBoss);
            (0, vitest_1.expect)(result.boss).toEqual(newBoss);
        }));
    });
});
