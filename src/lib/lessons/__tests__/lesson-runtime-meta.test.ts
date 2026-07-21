import { describe, expect, it } from "vitest"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import { resolveLessonRuntimeMeta } from "@/lib/lessons/lesson-runtime-meta"

describe("lesson runtime meta", () => {
    it("keeps rendering legacy physics lesson metadata for old lesson payloads", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "ธรรมชาติของฟิสิกส์",
                description: "legacy lesson",
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
                    sections: [{ id: "section-1", heading: "บทนำ", content: "ฟิสิกส์ศึกษาปรากฏการณ์ธรรมชาติ" }],
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

        expect(
            resolveLessonRuntimeMeta(content, {
                subject: "physics",
                gradeLevel: "ม.4",
            })
        ).toMatchObject({
            subjectLabel: "วิทยาศาสตร์และเทคโนโลยี",
            unitTitle: "ธรรมชาติและพัฒนาการทางฟิสิกส์",
            gradeLabel: "ม.4",
            semesterLabel: "เทอม 1",
        })
    })

    it("resolves canonical lesson learning outcomes without legacy physics fallback", () => {
        const content: LessonContentV2 = {
            schemaVersion: "lesson_content_v2",
            outline: {
                title: "การฟัง การดู และการพูด",
                description: "canonical core lesson",
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
                    sections: [{ id: "section-1", heading: "ฟังจับใจความ", content: "สรุปประเด็นสำคัญจากเรื่องที่ฟัง" }],
                },
            ],
            estimatedMinutes: 50,
            metadata: {
                curriculum: {
                    subject: "thai",
                    curriculumCode: "basic_education_2551_revised_2560",
                    gradeLevel: "ม.1",
                    unitId: "thai-u01",
                    learningOutcomeIds: ["thai-lo-u01-01"],
                },
            },
        }

        const meta = resolveLessonRuntimeMeta(content, {
            subject: "ภาษาไทย",
            gradeLevel: "ม.1",
        })

        expect(meta.subjectLabel).toBe("ภาษาไทย")
        expect(meta.unitTitle).toBe("การฟัง การดู และการพูด")
        expect(meta.learningOutcomes).toEqual([
            expect.objectContaining({
                id: "thai-lo-u01-01",
            }),
        ])
    })
})
