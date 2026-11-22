import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("student learning surfaces after game retirement", () => {
    it("does not advertise quiz EXP or assessment game rewards", () => {
        const assignments = source("src/components/student/student-dashboard-assignments-tab.tsx");
        const assessment = source("src/components/student/student-lesson-assessment-panel.tsx");
        expect(assignments).not.toContain("studentDashRewardPreview");
        expect(assignments).not.toContain("estimateQuizAssignmentExpPreview");
        expect(assessment).not.toContain("payload.assessment.reward");
        expect(assessment).toContain("payload.certificateStatus");
    });

    it("does not load or calculate game state for the learning dashboard", () => {
        const loader = source("src/lib/services/student-dashboard/get-student-dashboard.ts");
        for (const field of [
            "gold", "inventory", "battleLoadout", "negamonSkills",
            "negamonSkillLoadout", "gamifiedSettings", "equippedFrame", "levelConfig",
        ]) {
            expect(loader).not.toContain(field);
        }
        expect(loader).not.toContain("getRankEntry");
        expect(loader).toContain("behaviorPoints: true");
        expect(loader).toContain("sumAcademicTotal");
    });
});
