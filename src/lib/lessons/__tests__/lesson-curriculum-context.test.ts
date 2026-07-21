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
    it("maps legacy physics labels into the canonical core subject filter", () => {
        expect(resolveCanonicalSubjectId("physics")).toBe("science_technology")
        expect(resolveCanonicalSubjectId("ฟิสิกส์")).toBe("science_technology")
    })

    it("maps legacy physics units to the canonical physical science unit for read compatibility", () => {
        expect(
            resolveLegacyLessonCurriculumContext({
                subject: "physics",
                unitId: "phy-m4-s1-u02",
            })
        ).toEqual({
            subjectId: "science_technology",
            unitId: "sci-tech-u02",
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
            subjectId: "science_technology",
            unitId: "sci-tech-u02",
        })
    })

    it("still resolves canonical core unit titles", () => {
        expect(resolveCurriculumUnitTitle("science_technology", "sci-tech-u02")).toBe("วิทยาศาสตร์กายภาพ")
    })
})
