import { describe, expect, it } from "vitest"
import {
    getCanonicalTopicAssessments,
    getLessonPublishReadinessIssues,
    isLessonContentPublishReady,
    isLessonContentV2,
    isLessonOutlineBatchDraft,
    isLessonOutlineDraft,
    isLessonTopicContentDraft,
    type LessonContentV2,
    type LessonOutlineDraft,
    type LessonTopicContentDraft,
} from "../lesson-content"

const validOutline: LessonOutlineDraft = {
    title: "แรงและการเคลื่อนที่",
    description: "โครงบทเรียนฟิสิกส์เบื้องต้น",
    subject: "วิทยาศาสตร์",
    gradeLevel: "ม.2",
    topics: [
        {
            id: "topic-1",
            title: "แรงคืออะไร",
            description: "ความหมายและหน่วยของแรง",
            order: 0,
        },
        {
            id: "topic-2",
            title: "ผลของแรงต่อวัตถุ",
            description: "แรงทำให้วัตถุเปลี่ยนความเร็วหรือรูปร่าง",
            order: 1,
        },
    ],
}

const validTopicAssessment = {
    id: "topic-assessment-1",
    title: "แบบทดสอบหัวข้อแรงคืออะไร",
    questionSetId: "set-topic-1",
    passScore: 2,
    allowRetake: true,
    source: {
        sourceType: "topic" as const,
        lessonId: "lesson-1",
        topicId: "topic-1",
    },
    reward: {
        behaviorPoints: 5,
        gold: 10,
    },
    certificate: {
        enabled: false,
    },
}

const validTopicContent: LessonTopicContentDraft = {
    topicId: "topic-1",
    objectives: ["อธิบายความหมายของแรงได้"],
    sections: [
        {
            id: "section-1",
            heading: "ความหมายของแรง",
            content: "แรงคือการผลักหรือดึงที่ทำให้วัตถุเปลี่ยนสภาพการเคลื่อนที่",
            media: [
                {
                    id: "media-1",
                    type: "video",
                    url: "https://example.com/force.mp4",
                    caption: "คลิปอธิบายแรง",
                    source: "external_url",
                },
            ],
        },
    ],
    documents: [
        {
            type: "file",
            title: "ใบงานเรื่องแรง",
            url: "https://example.com/force.pdf",
        },
    ],
    assessment: validTopicAssessment,
}

const validContentV2: LessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: validOutline,
    topics: [
        {
            id: "topic-1",
            title: "แรงคืออะไร",
            description: "ความหมายและหน่วยของแรง",
            order: 0,
            contentStatus: "generated",
            objectives: validTopicContent.objectives,
            sections: validTopicContent.sections,
            documents: validTopicContent.documents,
            assessment: validTopicAssessment,
        },
        {
            id: "topic-2",
            title: "ผลของแรงต่อวัตถุ",
            description: "แรงทำให้วัตถุเปลี่ยนความเร็วหรือรูปร่าง",
            order: 1,
            contentStatus: "empty",
            objectives: [],
            sections: [],
        },
    ],
    estimatedMinutes: 25,
    metadata: {
        curriculum: {
            subject: "physics",
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "ม.4",
            semester: 1,
            unitId: "phy-m4-s1-u01",
            learningOutcomeIds: ["phy-lo-m4-s1-u01-01"],
            sourceRefs: [
                {
                    provider: "ipst",
                    title: "IPST Physics",
                    url: "https://www.ipst.ac.th/physics",
                    usage: "curriculum_reference",
                },
            ],
        },
        template: {
            templateId: "phy-tpl-m4-s1-u01-l01",
            templateLabel: "ฟิสิกส์คืออะไร",
            teacherNotes: "ให้ครูเติมตัวอย่างในชั้นเรียน",
            practicePlan: ["ใบงานสั้น 1 ชุด"],
        },
        mediaPlaceholders: [
            {
                id: "placeholder-1",
                title: "คลิปเปิดบทเรียน",
                note: "เลือกวิดีโออธิบายภาพรวม",
                scope: "lesson",
            },
        ],
    },
}

describe("lesson content contracts", () => {
    it("accepts a valid outline draft", () => {
        expect(isLessonOutlineDraft(validOutline)).toBe(true)
    })

    it("accepts a valid outline batch draft", () => {
        expect(
            isLessonOutlineBatchDraft({
                lessons: [
                    validOutline,
                    {
                        ...validOutline,
                        title: "แรงเสียดทาน",
                        topics: [{ id: "topic-1", title: "แรงเสียดทานคืออะไร", order: 0 }],
                    },
                ],
            })
        ).toBe(true)
    })

    it("rejects outline batches with duplicate lesson titles", () => {
        expect(isLessonOutlineBatchDraft({ lessons: [validOutline, validOutline] })).toBe(false)
    })

    it("rejects invalid outline drafts", () => {
        expect(isLessonOutlineDraft({ ...validOutline, title: " " })).toBe(false)
        expect(isLessonOutlineDraft({ ...validOutline, topics: [] })).toBe(false)
        expect(
            isLessonOutlineDraft({
                ...validOutline,
                topics: [
                    { id: "topic-1", title: "ซ้ำ", order: 0 },
                    { id: "topic-2", title: "ซ้ำ", order: 1 },
                ],
            })
        ).toBe(false)
    })

    it("accepts valid topic content", () => {
        expect(isLessonTopicContentDraft(validTopicContent)).toBe(true)
    })

    it("rejects invalid topic content", () => {
        expect(isLessonTopicContentDraft({ ...validTopicContent, topicId: "" })).toBe(false)
        expect(isLessonTopicContentDraft({ ...validTopicContent, objectives: [] })).toBe(false)
        expect(isLessonTopicContentDraft({ ...validTopicContent, sections: [] })).toBe(false)
        expect(isLessonTopicContentDraft({ ...validTopicContent, documents: {} as never })).toBe(false)
        expect(
            isLessonTopicContentDraft({
                ...validTopicContent,
                assessment: {
                    ...validTopicAssessment,
                    source: {
                        sourceType: "topic",
                        lessonId: "lesson-1",
                    },
                } as never,
            })
        ).toBe(false)
    })

    it("accepts valid full lesson content V2", () => {
        expect(isLessonContentV2(validContentV2)).toBe(true)
        expect(isLessonContentPublishReady(validContentV2)).toBe(true)
    })

    it("returns canonical topic assessments", () => {
        expect(getCanonicalTopicAssessments(validContentV2)).toEqual([
            {
                topicId: "topic-1",
                topicTitle: "แรงคืออะไร",
                assessment: validTopicAssessment,
            },
        ])
    })

    it("reports publish readiness issues when curriculum, media, or confirmation are missing", () => {
        const incompleteContent: LessonContentV2 = {
            ...validContentV2,
            metadata: {
                ...validContentV2.metadata,
                curriculum: {
                    ...validContentV2.metadata!.curriculum!,
                    gradeLevel: undefined,
                },
            },
            topics: validContentV2.topics.map((topic) =>
                topic.id === "topic-1"
                    ? {
                          ...topic,
                          documents: [],
                          sections: topic.sections.map((section) => ({ ...section, media: [] })),
                      }
                    : topic
            ),
        }

        expect(
            getLessonPublishReadinessIssues(incompleteContent, {
                requireTeacherConfirmation: true,
                publishConfirmed: false,
            }).map((issue) => issue.code)
        ).toEqual(
            expect.arrayContaining([
                "MISSING_CURRICULUM_GRADE_LEVEL",
                "MISSING_MEDIA_OR_DOCUMENT",
                "MISSING_TOPIC_VIDEO",
                "TEACHER_CONFIRMATION_REQUIRED",
            ])
        )
    })

    it("keeps backward compatibility for V2 payloads without metadata", () => {
        const legacyV2WithoutMetadata: LessonContentV2 = {
            ...validContentV2,
            metadata: undefined,
        }

        expect(isLessonContentV2(legacyV2WithoutMetadata)).toBe(true)
    })

    it("rejects invalid full lesson content V2", () => {
        expect(isLessonContentV2({ ...validContentV2, schemaVersion: "lesson_content_v1" })).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: [{ ...validContentV2.topics[0], id: "missing-topic" }],
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: validContentV2.topics.map((topic) =>
                    topic.id === "topic-1"
                        ? {
                              ...topic,
                              assessment: {
                                  ...validTopicAssessment,
                                  source: {
                                      sourceType: "lesson",
                                      lessonId: "lesson-1",
                                  },
                              } as never,
                          }
                        : topic
                ),
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: validContentV2.topics.map((topic) =>
                    topic.id === "topic-1"
                        ? {
                              ...topic,
                              assessment: {
                                  ...validTopicAssessment,
                                  source: {
                                      sourceType: "topic",
                                      lessonId: "lesson-1",
                                      topicId: "topic-2",
                                  },
                              },
                          }
                        : topic
                ),
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: [{ ...validContentV2.topics[0], contentStatus: "generated", objectives: [] }],
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: validContentV2.topics.map((topic) =>
                    topic.id === "topic-1"
                        ? {
                              ...topic,
                              assessment: {
                                  ...validTopicAssessment,
                                  reward: {
                                      ...validTopicAssessment.reward,
                                      gold: -1,
                                  },
                              },
                          }
                        : topic
                ),
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                topics: validContentV2.topics.map((topic) =>
                    topic.id === "topic-1"
                        ? {
                              ...topic,
                              assessment: {
                                  ...validTopicAssessment,
                                  certificate: {
                                      title: "invalid certificate",
                                  },
                              } as never,
                          }
                        : topic
                ),
            })
        ).toBe(false)
        expect(
            isLessonContentV2({
                ...validContentV2,
                metadata: {
                    ...validContentV2.metadata,
                    curriculum: {
                        ...validContentV2.metadata!.curriculum!,
                        learningOutcomeIds: [""],
                    },
                },
            })
        ).toBe(false)
    })

    it("rejects legacy lesson content V1", () => {
        const legacyContent = {
            objectives: ["Understand the topic"],
            sections: [
                {
                    id: "s1",
                    heading: "Intro",
                    content: "Main explanation",
                    examples: [{ title: "Example", body: "Example body" }],
                },
            ],
            keyTerms: [{ term: "Term", definition: "Definition" }],
            summary: "Summary",
            estimatedMinutes: 30,
        }

        expect(isLessonContentV2(legacyContent)).toBe(false)
        expect(isLessonContentPublishReady(legacyContent)).toBe(false)
    })

    it("blocks publishing V2 content when no topic content is ready", () => {
        const emptyContent: LessonContentV2 = {
            ...validContentV2,
            topics: validContentV2.topics.map((topic) => ({
                ...topic,
                contentStatus: "empty",
                objectives: [],
                sections: [],
            })),
        }

        expect(isLessonContentV2(emptyContent)).toBe(true)
        expect(isLessonContentPublishReady(emptyContent)).toBe(false)
    })
})
