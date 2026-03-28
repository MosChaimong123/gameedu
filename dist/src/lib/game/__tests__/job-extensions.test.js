"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const job_system_1 = require("../job-system");
(0, vitest_1.describe)("Job extensions (Advance/Master)", () => {
    (0, vitest_1.it)("getSkillsForLevel(KNIGHT, 20) includes advance-only skills", () => {
        const skills = (0, job_system_1.getSkillsForLevel)("KNIGHT", 20);
        (0, vitest_1.expect)(skills.some((s) => s.id === "knight_shield_bash")).toBe(true);
    });
    (0, vitest_1.it)("getMergedClassDef chains PALADIN to include WARRIOR + KNIGHT + PALADIN skills", () => {
        const def = (0, job_system_1.getMergedClassDef)("PALADIN");
        const ids = new Set(def.skills.map((s) => s.id));
        (0, vitest_1.expect)(ids.has("warrior_slash")).toBe(true);
        (0, vitest_1.expect)(ids.has("knight_shield_bash")).toBe(true);
        (0, vitest_1.expect)(ids.has("paladin_smite")).toBe(true);
    });
    (0, vitest_1.it)("getNewlyUnlockedSkills uses merged list for effective key", () => {
        const at19 = (0, job_system_1.getNewlyUnlockedSkills)("KNIGHT", 19, 20, []);
        (0, vitest_1.expect)(at19).toContain("knight_shield_bash");
    });
    (0, vitest_1.it)("getStatMultipliers differs for KNIGHT vs WARRIOR at BASE tier", () => {
        const w = (0, job_system_1.getStatMultipliers)("WARRIOR", "BASE");
        const k = (0, job_system_1.getStatMultipliers)("KNIGHT", "BASE");
        (0, vitest_1.expect)(k.def).toBeGreaterThan(w.def);
    });
    (0, vitest_1.it)("normalizeJobName preserves spaced master names", () => {
        (0, vitest_1.expect)((0, job_system_1.normalizeJobName)("death knight")).toBe("DEATH KNIGHT");
    });
    (0, vitest_1.it)("getPvpMatchupBaseClass maps KNIGHT to WARRIOR", () => {
        (0, vitest_1.expect)((0, job_system_1.getPvpMatchupBaseClass)("KNIGHT")).toBe("WARRIOR");
    });
    (0, vitest_1.it)("resolveEffectiveJobKey uses advanceClass when tier is ADVANCE", () => {
        (0, vitest_1.expect)((0, job_system_1.resolveEffectiveJobKey)({
            jobClass: "WARRIOR",
            jobTier: "ADVANCE",
            advanceClass: "KNIGHT",
        })).toBe("KNIGHT");
    });
});
