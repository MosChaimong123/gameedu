import { describe, expect, it } from "vitest"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    normalizeLessonContentForApi,
    normalizeLessonContentCurriculumForWrite,
    resolveLessonContentCurriculumMetadata,
    resolveLessonCurriculumMetadata,
    resolveLessonCurriculumUnitTitle,
    withLessonNormalizedCurriculumSummary,
} from "@/lib/lessons/lesson-curriculum-metadata"

describe("lesson curriculum metadata", () => {
    it("normalizes legacy physics lesson metadata into canonical subject and unit context", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "ฟิสิกส์คืออะไร",
                description: "legacy physics lesson",
                subject: "ฟิสิกส์",
                gradeLevel: "ม.4",
                topics: [{ id: "topic-1", title: "บทนำ", order: 0 }],
            },
            topics: [
                {
                    id: "topic-1",
                    title: "บทนำ",
                    order: 0,
                    contentStatus: "generated",
                    objectives: ["อธิบายธรรมชาติของฟิสิกส์ได้"],
                    sections: [{ id: "section-1", heading: "ความหมาย", content: "ฟิสิกส์ศึกษาปรากฏการณ์ธรรมชาติ" }],
                },
            ],
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

        const resolved = resolveLessonContentCurriculumMetadata(content, "physics")

        expect(resolved.subjectId).toBe("science_technology")
        expect(resolved.subjectLabel).toBe("วิทยาศาสตร์และเทคโนโลยี")
        expect(resolved.rawUnitId).toBe("phy-m4-s1-u01")
        expect(resolved.unitId).toBe("sci-tech-u02")
        expect(resolved.unitTitle).toBe("ธรรมชาติและพัฒนาการทางฟิสิกส์")
        expect(resolved.learningOutcomes).toEqual([
            expect.objectContaining({
                id: "phy-lo-m4-s1-u01-01",
            }),
        ])
        expect(resolved.isLegacyPhysics).toBe(true)
    })

    it("keeps canonical lesson metadata readable without legacy fallback", () => {
        const resolved = resolveLessonCurriculumMetadata({
            curriculum: {
                subject: "thai",
                curriculumCode: "basic_education_2551_revised_2560",
                gradeLevel: "ม.1",
                unitId: "thai-u01",
                learningOutcomeIds: ["thai-lo-u01-01"],
            },
        })

        expect(resolved.subjectId).toBe("thai")
        expect(resolved.subjectLabel).toBe("ภาษาไทย")
        expect(resolved.unitId).toBe("thai-u01")
        expect(resolved.unitTitle).toBe("การฟัง การดู และการพูด")
        expect(resolved.learningOutcomes).toEqual([
            expect.objectContaining({
                id: "thai-lo-u01-01",
            }),
        ])
        expect(resolved.isLegacyPhysics).toBe(false)
    })

    it("resolves unit titles for both canonical and legacy ids", () => {
        expect(resolveLessonCurriculumUnitTitle("thai-u01")).toBe("การฟัง การดู และการพูด")
        expect(resolveLessonCurriculumUnitTitle("phy-m4-s1-u01")).toBe("ธรรมชาติและพัฒนาการทางฟิสิกส์")
    })

    it("normalizes canonical lesson metadata before write", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "การฟัง การดู และการพูด",
                description: "canonical thai lesson",
                subject: "ภาษาไทย",
                gradeLevel: "ม.1",
                topics: [{ id: "topic-1", title: "จับใจความ", order: 0 }],
            },
            topics: [
                {
                    id: "topic-1",
                    title: "จับใจความ",
                    order: 0,
                    contentStatus: "generated",
                    objectives: ["จับใจความสำคัญได้"],
                    sections: [{ id: "section-1", heading: "การฟัง", content: "สรุปประเด็นสำคัญ" }],
                },
            ],
            metadata: {
                curriculum: {
                    subject: "ภาษาไทย",
                    curriculumCode: "basic_education_2551_revised_2560",
                    gradeLevel: "ม.1",
                    courseId: "thai:thai-u01:m1",
                    courseTitle: "การฟัง การดู และการพูด",
                    unitId: "thai-u01",
                    standardIds: ["thai-standard-1"],
                    duringIndicatorIds: ["thai-during-1", "thai-during-1"],
                    terminalIndicatorIds: ["thai-terminal-1", "thai-terminal-1"],
                    learningOutcomeIds: ["thai-lo-u01-01", "thai-lo-u01-01"],
                },
            },
        }

        const normalized = normalizeLessonContentCurriculumForWrite(content, "ภาษาไทย")

        expect(normalized.metadata?.curriculum).toMatchObject({
            subject: "thai",
            courseId: "thai:thai-u01:m1",
            courseTitle: "การฟัง การดู และการพูด",
            unitId: "thai-u01",
            standardIds: ["thai-standard-1"],
            duringIndicatorIds: ["thai-during-1"],
            terminalIndicatorIds: ["thai-terminal-1"],
            learningOutcomeIds: ["thai-lo-u01-01"],
        })
    })

    it("resolves canonical course metadata fields for read side summaries", () => {
        const resolved = resolveLessonCurriculumMetadata({
            curriculum: {
                subject: "science_technology",
                curriculumCode: "basic_education_2551",
                gradeLevel: "ม.5",
                semester: 1,
                courseId: "science_technology:sci-tech-u05:m5",
                courseTitle: "วิทยาศาสตร์กายภาพ",
                unitId: "sci-tech-u05",
                standardIds: ["sci-std-w2.1"],
                duringIndicatorIds: ["indicator-a", "indicator-a"],
                terminalIndicatorIds: ["indicator-b", "indicator-b"],
                learningOutcomeIds: ["sci-tech-u05-lo-01"],
            },
        })

        expect(resolved.courseId).toBe("science_technology:sci-tech-u05:m5")
        expect(resolved.courseTitle).toBe("วิทยาศาสตร์กายภาพ")
        expect(resolved.standardIds).toEqual(["sci-std-w2.1"])
        expect(resolved.duringIndicatorIds).toEqual(["indicator-a"])
        expect(resolved.terminalIndicatorIds).toEqual(["indicator-b"])
    })

    it("normalizes lesson content for api responses without mutating stored shape manually", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "การฟัง การดู และการพูด",
                topics: [{ id: "topic-1", title: "จับใจความ", order: 0 }],
            },
            topics: [
                {
                    id: "topic-1",
                    title: "จับใจความ",
                    order: 0,
                    contentStatus: "generated",
                    objectives: ["จับใจความสำคัญได้"],
                    sections: [{ id: "section-1", heading: "การฟัง", content: "สรุปประเด็นสำคัญ" }],
                },
            ],
            metadata: {
                curriculum: {
                    subject: "ภาษาไทย",
                    curriculumCode: "basic_education_2551",
                    gradeLevel: "ม.1",
                    courseId: "thai:thai-u01:m1",
                    courseTitle: "การฟัง การดู และการพูด",
                    unitId: "thai-u01",
                    standardIds: ["thai-standard-1", "thai-standard-1"],
                    duringIndicatorIds: ["thai-during-1", "thai-during-1"],
                    terminalIndicatorIds: ["thai-terminal-1", "thai-terminal-1"],
                    learningOutcomeIds: ["thai-lo-u01-01", "thai-lo-u01-01"],
                },
            },
        }

        const normalized = normalizeLessonContentForApi(content, "ภาษาไทย") as LessonContentV2

        expect(normalized.metadata?.curriculum).toMatchObject({
            subject: "thai",
            courseId: "thai:thai-u01:m1",
            courseTitle: "การฟัง การดู และการพูด",
            standardIds: ["thai-standard-1"],
            duringIndicatorIds: ["thai-during-1"],
            terminalIndicatorIds: ["thai-terminal-1"],
            learningOutcomeIds: ["thai-lo-u01-01"],
        })
    })

    it("attaches normalized curriculum summary and normalized content together", () => {
        const lesson = withLessonNormalizedCurriculumSummary({
            id: "lesson-1",
            subject: "ภาษาไทย",
            content: {
                schemaVersion: "lesson_content_v2",
                outline: {
                    title: "การฟัง การดู และการพูด",
                    topics: [{ id: "topic-1", title: "จับใจความ", order: 0 }],
                },
                topics: [
                    {
                        id: "topic-1",
                        title: "จับใจความ",
                        order: 0,
                        contentStatus: "generated",
                        objectives: ["จับใจความสำคัญได้"],
                        sections: [{ id: "section-1", heading: "การฟัง", content: "สรุปประเด็นสำคัญ" }],
                    },
                ],
                metadata: {
                    curriculum: {
                        subject: "ภาษาไทย",
                        curriculumCode: "basic_education_2551",
                        gradeLevel: "ม.1",
                        courseId: "thai:thai-u01:m1",
                        courseTitle: "การฟัง การดู และการพูด",
                        unitId: "thai-u01",
                        learningOutcomeIds: ["thai-lo-u01-01", "thai-lo-u01-01"],
                    },
                },
            },
        })

        expect((lesson.content as LessonContentV2).metadata?.curriculum?.subject).toBe("thai")
        expect(lesson.normalizedCurriculumSummary?.courseId).toBe("thai:thai-u01:m1")
        expect(lesson.normalizedCurriculumSummary?.courseTitle).toBe("การฟัง การดู และการพูด")
    })

    it("keeps legacy physics unit ids on write while normalizing subject into canonical core subject", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "ฟิสิกส์คืออะไร",
                description: "legacy physics lesson",
                subject: "ฟิสิกส์",
                gradeLevel: "ม.4",
                topics: [{ id: "topic-1", title: "บทนำ", order: 0 }],
            },
            topics: [
                {
                    id: "topic-1",
                    title: "บทนำ",
                    order: 0,
                    contentStatus: "generated",
                    objectives: ["อธิบายธรรมชาติของฟิสิกส์ได้"],
                    sections: [{ id: "section-1", heading: "ความหมาย", content: "ฟิสิกส์ศึกษาปรากฏการณ์ธรรมชาติ" }],
                },
            ],
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

        const normalized = normalizeLessonContentCurriculumForWrite(content, "physics")

        expect(normalized.metadata?.curriculum).toMatchObject({
            subject: "science_technology",
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u01-01"],
        })
    })
})
