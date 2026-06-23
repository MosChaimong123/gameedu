import { describe, expect, it } from "vitest"
import {
    alignGeneratedOutlineBatchToCurriculumSelection,
    buildOutlineCurriculumPromptContext,
    buildTopicContentCurriculumPromptContext,
    getAvailableTemplateIdsForSubject,
    resolveAILessonCurriculumSelection,
    validateGeneratedOutlineBatchAgainstCurriculumSelection,
    validateTopicContentAgainstCurriculumSelection,
} from "../ai-curriculum-rules"

describe("ai curriculum rules", () => {
    it("resolves a template-bound curriculum selection", () => {
        const resolved = resolveAILessonCurriculumSelection({
            subjectId: "science_technology",
            unitId: "sci-tech-u01",
            templateId: "science_technology-master-template-01",
        })

        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            expect(resolved.data.template?.subjectId).toBe("science_technology")
            expect(resolved.data.selectedTopics.length).toBeGreaterThan(0)
            expect(resolved.data.selectedOutcomeIds.length).toBeGreaterThan(0)
        }
    })

    it("builds prompt context from the resolved curriculum selection", () => {
        const resolved = resolveAILessonCurriculumSelection({
            subjectId: "thai",
            unitId: "thai-u01",
            templateId: "thai-master-template-01",
        })

        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            const outlineContext = buildOutlineCurriculumPromptContext(resolved.data)
            const topicContext = buildTopicContentCurriculumPromptContext(resolved.data, resolved.data.selectedTopics[0]!.id)

            expect(outlineContext).toContain("Allowed unit topics")
            expect(outlineContext).toContain("You must use only allowed topic ids")
            expect(topicContext).toContain("Allowed learning outcomes for this topic")
        }
    })

    it("rejects generated outline topics outside the allowed curriculum selection", () => {
        const resolved = resolveAILessonCurriculumSelection({
            subjectId: "thai",
            unitId: "thai-u01",
            templateId: "thai-master-template-01",
        })

        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            const issues = validateGeneratedOutlineBatchAgainstCurriculumSelection(
                {
                    lessons: [
                        {
                            title: "ผิดโครงสร้าง",
                            topics: [
                                { id: "wrong-topic", title: "นอกหน่วย", order: 0 },
                            ],
                        },
                    ],
                },
                resolved.data
            )

            expect(issues.some((issue) => issue.code === "OUTLINE_TOPIC_NOT_ALLOWED")).toBe(true)
        }
    })

    it("aligns the generated outline back to canonical topic ids and titles", () => {
        const resolved = resolveAILessonCurriculumSelection({
            subjectId: "career",
            unitId: "career-u01",
            templateId: "career-master-template-01",
        })

        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            const aligned = alignGeneratedOutlineBatchToCurriculumSelection(
                {
                    lessons: [
                        {
                            title: "บทเรียนอิสระ",
                            topics: resolved.data.selectedTopics.map((topic, index) => ({
                                id: topic.id,
                                title: `ไม่ใช้ชื่อเดิม ${index}`,
                                order: index,
                            })),
                        },
                    ],
                },
                resolved.data
            )

            expect(aligned.lessons).toHaveLength(1)
            expect(aligned.lessons[0]?.title).toBe(resolved.data.template?.title)
            expect(aligned.lessons[0]?.topics[0]?.title).toBe(resolved.data.selectedTopics[0]?.title)
        }
    })

    it("validates topic content against the selected curriculum topic", () => {
        const resolved = resolveAILessonCurriculumSelection({
            subjectId: "foreign_languages",
            unitId: "lang-u01",
            templateId: "foreign_languages-master-template-01",
        })

        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            const issues = validateTopicContentAgainstCurriculumSelection(
                {
                    topicId: "wrong-topic",
                    objectives: ["ทดสอบ"],
                    sections: [{ id: "section-1", heading: "หัวข้อ", content: "เนื้อหา" }],
                    documents: [],
                },
                resolved.data
            )

            expect(issues.some((issue) => issue.code === "TOPIC_CONTENT_TOPIC_MISMATCH")).toBe(true)
        }
    })

    it("lists template ids by subject", () => {
        expect(getAvailableTemplateIdsForSubject("mathematics")).toEqual(["mathematics-master-template-01"])
    })
})
