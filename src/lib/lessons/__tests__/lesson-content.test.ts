import { describe, expect, it } from "vitest"
import {
    getActiveLessonTopics,
    getCanonicalTopicAssessments,
    getLessonPublishReadinessIssues,
    getLessonTopicContentStatus,
    getLessonTopicRequirements,
    hasLessonTopicDeliverableContent,
    hasLessonTopicStudentContent,
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

    it("requires teacher confirmation when asked, even for publishable content", () => {
        expect(
            getLessonPublishReadinessIssues(validContentV2, {
                requireTeacherConfirmation: true,
                publishConfirmed: false,
            }).map((issue) => issue.code)
        ).toEqual(["TEACHER_CONFIRMATION_REQUIRED"])
    })

    it("publishes without curriculum metadata, per-topic video, or documents (medium gate)", () => {
        const minimalContent: LessonContentV2 = {
            ...validContentV2,
            metadata: undefined,
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

        // topic-1 still has objectives + a section with real content → publishable
        expect(isLessonContentPublishReady(minimalContent)).toBe(true)
    })

    it("blocks publish when no topic has objectives plus content", () => {
        const emptyContent: LessonContentV2 = {
            ...validContentV2,
            topics: validContentV2.topics.map((topic) =>
                topic.id === "topic-1"
                    ? { ...topic, contentStatus: "empty" as const, sections: [], documents: [], media: [], assessment: undefined }
                    : topic
            ),
        }

        expect(getLessonPublishReadinessIssues(emptyContent).map((issue) => issue.code)).toEqual([
            "NO_READY_TOPIC",
        ])
    })

    it("marks topic status from deliverables without relying on objectives", () => {
        const emptyTopic = {
            ...validContentV2.topics[0],
            objectives: ["auto-filled objective"],
            sections: [],
            documents: [],
            media: [],
            assessment: undefined,
        }
        const assessmentOnlyTopic = {
            ...emptyTopic,
            assessment: validTopicAssessment,
        }

        expect(hasLessonTopicDeliverableContent(emptyTopic)).toBe(false)
        expect(getLessonTopicContentStatus(emptyTopic)).toBe("empty")
        expect(hasLessonTopicDeliverableContent(assessmentOnlyTopic)).toBe(true)
        expect(getLessonTopicContentStatus(assessmentOnlyTopic)).toBe("edited")
        expect(hasLessonTopicStudentContent(assessmentOnlyTopic)).toBe(true)
        expect(getLessonTopicRequirements(assessmentOnlyTopic).hasAssessment).toBe(true)
    })

    it("does not treat assessment-only topics as publishable content", () => {
        const assessmentOnlyContent: LessonContentV2 = {
            ...validContentV2,
            topics: validContentV2.topics.map((topic) =>
                topic.id === "topic-1"
                    ? {
                          ...topic,
                          contentStatus: "empty" as const,
                          sections: [],
                          documents: [],
                          media: [],
                          assessment: validTopicAssessment,
                      }
                    : topic
            ),
        }

        expect(getLessonTopicContentStatus(assessmentOnlyContent.topics[0])).toBe("edited")
        expect(getLessonPublishReadinessIssues(assessmentOnlyContent).map((issue) => issue.code)).toEqual([
            "NO_READY_TOPIC",
        ])
    })

    it("selects active student topics from deliverables instead of stored content status", () => {
        const videoOnlyTopic: LessonContentV2["topics"][number] = {
            ...validContentV2.topics[0],
            contentStatus: "empty",
            sections: [],
            documents: [],
            media: [{ id: "video-1", type: "video", url: "https://example.com/video.mp4" }],
            assessment: undefined,
        }
        const documentOnlyTopic: LessonContentV2["topics"][number] = {
            ...validContentV2.topics[1],
            contentStatus: "empty",
            sections: [],
            media: [],
            documents: [{ id: "document-1", title: "Worksheet", url: "https://example.com/work.pdf" }],
            assessment: undefined,
        }
        const emptyTopic: LessonContentV2["topics"][number] = {
            ...validContentV2.topics[1],
            id: "topic-empty",
            contentStatus: "generated",
            sections: [],
            media: [],
            documents: [],
            assessment: undefined,
        }
        const content = {
            ...validContentV2,
            topics: [videoOnlyTopic, documentOnlyTopic, emptyTopic],
        }

        expect(getActiveLessonTopics(content).map((topic) => topic.id)).toEqual([
            videoOnlyTopic.id,
            documentOnlyTopic.id,
        ])
        expect(getLessonTopicRequirements(videoOnlyTopic)).toMatchObject({
            hasMedia: true,
            hasVideo: true,
            hasStudentContent: true,
        })
        expect(hasLessonTopicStudentContent(documentOnlyTopic)).toBe(true)
        expect(getLessonTopicRequirements(documentOnlyTopic)).toMatchObject({
            hasDocument: true,
            hasVideo: false,
            requiresContentAcknowledgement: true,
        })
        expect(hasLessonTopicStudentContent(emptyTopic)).toBe(false)
    })

    it("keeps all topics as a compatibility fallback when none has student content", () => {
        const emptyTopics = validContentV2.topics.map((topic) => ({
            ...topic,
            contentStatus: "empty" as const,
            sections: [],
            media: [],
            documents: [],
            assessment: undefined,
        }))

        expect(getActiveLessonTopics({ ...validContentV2, topics: emptyTopics })).toEqual(emptyTopics)
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
