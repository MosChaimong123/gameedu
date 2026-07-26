import { describe, expect, it } from "vitest"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    resolveCanonicalSubjectId,
    resolveCurriculumUnitTitle,
    resolveLegacyLessonCurriculumContext,
    resolveLessonCurriculumContext,
} from "@/lib/lessons/lesson-curriculum-context"

const legacyPhysicsLessonContent: LessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "ฟิสิกส์คืออะไร",
        description: "legacy physics lesson",
        subject: "ฟิสิกส์",
        gradeLevel: "ม.4",
        topics: [{ id: "topic-1", title: "บทนำฟิสิกส์", order: 0 }],
    },
    topics: [
        {
            id: "topic-1",
            title: "บทนำฟิสิกส์",
            order: 0,
            contentStatus: "generated",
            objectives: ["อธิบายธรรมชาติของฟิสิกส์ได้"],
            sections: [{ id: "section-1", heading: "ความหมาย", content: "ฟิสิกส์ศึกษาปรากฏการณ์ธรรมชาติ" }],
        },
    ],
    estimatedMinutes: 45,
    metadata: {
        curriculum: {
            subject: "physics",
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "ม.4",
            semester: 1,
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u01-01"],
        },
    },
}

describe("lesson curriculum compatibility", () => {
    it("resolves physics labels to the physics subject now that it is an active additional subject", () => {
        expect(resolveCanonicalSubjectId("physics")).toBe("physics")
        expect(resolveCanonicalSubjectId("ฟิสิกส์")).toBe("physics")
    })

    it("migrates retired phy-* units onto their current physics equivalent", () => {
        expect(
            resolveLegacyLessonCurriculumContext({
                subject: "physics",
                unitId: "phy-m4-s1-u02",
            })
        ).toEqual({
            subjectId: "physics",
            unitId: "physics-additional-m4-s1-u02",
        })
    })

    it("migrates retired units that สสวท. moved to a different term", () => {
        // การเคลื่อนที่แนวโค้ง moved from ม.4 เทอม 2 to เทอม 1.
        expect(
            resolveLegacyLessonCurriculumContext({ subject: "ฟิสิกส์", unitId: "phy-m4-s2-u04" })
        ).toEqual({
            subjectId: "physics",
            unitId: "physics-additional-m4-s1-u04",
        })
    })

    it("drops an unknown phy-* unit rather than guessing", () => {
        expect(
            resolveLegacyLessonCurriculumContext({ subject: "physics", unitId: "phy-m9-s9-u99" })
        ).toEqual({
            subjectId: "physics",
            unitId: null,
        })
    })

    it("keeps canonical core lessons unchanged", () => {
        expect(
            resolveLegacyLessonCurriculumContext({
                subject: "science_technology",
                unitId: "sci-tech-u02",
            })
        ).toEqual({
            subjectId: "science_technology",
            unitId: "sci-tech-u02",
        })
    })

    it("resolves lesson context from legacy V2 metadata", () => {
        expect(resolveLessonCurriculumContext(legacyPhysicsLessonContent, "physics")).toEqual({
            subjectId: "physics",
            unitId: "physics-additional-m4-s1-u01",
        })
    })

    it("still resolves canonical core unit titles", () => {
        expect(resolveCurriculumUnitTitle("science_technology", "sci-tech-u02")).toBe("วิทยาศาสตร์กายภาพ")
    })
})
