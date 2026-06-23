import { describe, expect, it } from "vitest"
import {
    getCoursePublishReadinessIssues,
    isCourseContentPublishReady,
    isCourseContentV1,
    type CourseAssessmentQuestionSetRecord,
    type CourseContentV1,
    type CourseLessonPublishRecord,
} from "../course-content"
import type { CourseAssessmentSource } from "../assessment-source"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"

const validAssessmentSource: CourseAssessmentSource = {
    sourceType: "module",
    courseId: "course-1",
    moduleId: "module-1",
}

const publishReadyLessonContent: LessonContentV2 = {
    schemaVersion: "lesson_content_v2",
    outline: {
        title: "Force and Motion",
        subject: "Physics",
        gradeLevel: "Grade 8",
        topics: [
            {
                id: "topic-1",
                title: "What is force?",
                order: 0,
            },
        ],
    },
    topics: [
        {
            id: "topic-1",
            title: "What is force?",
            order: 0,
            contentStatus: "generated",
            objectives: ["Explain the meaning of force."],
            sections: [
                {
                    id: "section-1",
                    heading: "Force basics",
                    content: "Force is a push or pull that can change motion.",
                    media: [
                        {
                            id: "media-1",
                            type: "video",
                            url: "https://example.com/force.mp4",
                            source: "external_url",
                        },
                    ],
                },
            ],
            documents: [
                {
                    type: "file",
                    title: "Force worksheet",
                    url: "https://example.com/force.pdf",
                },
            ],
        },
    ],
    estimatedMinutes: 20,
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

const emptyLessonContent: LessonContentV2 = {
    ...publishReadyLessonContent,
    topics: publishReadyLessonContent.topics.map((topic) => ({
        ...topic,
        contentStatus: "empty",
        objectives: [],
        sections: [],
    })),
}

const validCourse: CourseContentV1 = {
    schemaVersion: "course_content_v1",
    title: "Physics Starter Course",
    description: "A short course for basic physics.",
    subject: "Physics",
    gradeLevel: "Grade 8",
    coverImageUrl: "https://example.com/cover.png",
    categoryIds: ["science"],
    tagIds: ["force", "motion"],
    modules: [
        {
            id: "module-1",
            title: "Module 1",
            description: "Foundations",
            order: 0,
            lessons: [
                {
                    id: "course-lesson-1",
                    lessonId: "lesson-1",
                    title: "Force and Motion",
                    order: 0,
                    required: true,
                    estimatedMinutes: 20,
                    unlockRule: { type: "none" },
                },
            ],
        },
    ],
    assessments: [
        {
            id: "assessment-1",
            type: "posttest",
            title: "Module 1 posttest",
            questionSetId: "set-1",
            moduleId: "module-1",
            passScore: 7,
            allowRetake: true,
            source: validAssessmentSource,
        },
    ],
    certificate: {
        enabled: true,
        title: "Physics Starter Certificate",
        requiredAssessmentIds: ["assessment-1"],
        reward: {
            behaviorPoints: 15,
            achievementId: "course-physics-starter",
            achievementTitle: "Physics Starter Graduate",
        },
    },
    estimatedMinutes: 20,
}

const lessonRecords: CourseLessonPublishRecord[] = [
    {
        id: "lesson-1",
        status: "PUBLISHED",
        content: publishReadyLessonContent,
    },
]

const questionSetRecords: CourseAssessmentQuestionSetRecord[] = [
    {
        id: "set-1",
    },
]

describe("course content contracts", () => {
    it("accepts a valid course content V1 payload", () => {
        expect(isCourseContentV1(validCourse)).toBe(true)
    })

    it("rejects invalid course content payloads", () => {
        expect(isCourseContentV1({ ...validCourse, schemaVersion: "lesson_content_v2" })).toBe(false)
        expect(isCourseContentV1({ ...validCourse, title: " " })).toBe(false)
        expect(isCourseContentV1({ ...validCourse, modules: "module-1" })).toBe(false)
        expect(
            isCourseContentV1({
                ...validCourse,
                modules: [{ ...validCourse.modules[0], lessons: [{ ...validCourse.modules[0].lessons[0], order: -1 }] }],
            })
        ).toBe(false)
    })

    it("allows a draft course with no modules before publish", () => {
        expect(isCourseContentV1({ ...validCourse, modules: [] })).toBe(true)
        expect(getCoursePublishReadinessIssues({ ...validCourse, modules: [] }).map((issue) => issue.code)).toContain(
            "EMPTY_COURSE"
        )
    })

    it("passes publish readiness when every referenced lesson is published Lesson V2 content", () => {
        expect(getCoursePublishReadinessIssues(validCourse, lessonRecords, questionSetRecords)).toEqual([])
        expect(isCourseContentPublishReady(validCourse, lessonRecords, questionSetRecords)).toBe(true)
    })

    it("rejects publish readiness when a lesson record is missing", () => {
        expect(getCoursePublishReadinessIssues(validCourse).map((issue) => issue.code)).toContain("MISSING_LESSON_RECORD")
        expect(isCourseContentPublishReady(validCourse)).toBe(false)
    })

    it("rejects draft lessons before course publish", () => {
        const issues = getCoursePublishReadinessIssues(validCourse, [
            {
                ...lessonRecords[0],
                status: "DRAFT",
            },
        ], questionSetRecords)

        expect(issues.map((issue) => issue.code)).toContain("LESSON_NOT_PUBLISHED")
    })

    it("rejects legacy lesson content before course publish", () => {
        const legacyLessonContent = {
            objectives: ["Understand force."],
            sections: [{ id: "section-1", heading: "Intro", content: "Legacy body" }],
            summary: "Legacy summary",
        }

        const issues = getCoursePublishReadinessIssues(validCourse, [
            {
                id: "lesson-1",
                status: "PUBLISHED",
                content: legacyLessonContent,
            },
        ], questionSetRecords)

        expect(issues.map((issue) => issue.code)).toContain("LEGACY_LESSON_CONTENT")
    })

    it("rejects Lesson V2 content that is not publish-ready", () => {
        const issues = getCoursePublishReadinessIssues(validCourse, [
            {
                id: "lesson-1",
                status: "PUBLISHED",
                content: emptyLessonContent,
            },
        ], questionSetRecords)

        expect(issues.map((issue) => issue.code)).toContain("LESSON_NOT_PUBLISH_READY")
    })

    it("rejects duplicate lesson ids in a published course", () => {
        const courseWithDuplicateLesson: CourseContentV1 = {
            ...validCourse,
            modules: [
                validCourse.modules[0],
                {
                    id: "module-2",
                    title: "Module 2",
                    order: 1,
                    lessons: [
                        {
                            id: "course-lesson-2",
                            lessonId: "lesson-1",
                            order: 0,
                            required: true,
                        },
                    ],
                },
            ],
        }

        expect(getCoursePublishReadinessIssues(courseWithDuplicateLesson, lessonRecords, questionSetRecords).map((issue) => issue.code)).toContain(
            "DUPLICATE_LESSON_ID"
        )
    })

    it("rejects assessment payloads that point to missing modules or missing question sets", () => {
        const brokenCourse: CourseContentV1 = {
            ...validCourse,
            assessments: [
                {
                    id: "assessment-1",
                    type: "checkpoint",
                    title: "Broken checkpoint",
                    questionSetId: "set-missing",
                    moduleId: "module-missing",
                    source: validAssessmentSource,
                },
            ],
        }

        const issues = getCoursePublishReadinessIssues(brokenCourse, lessonRecords, questionSetRecords).map((issue) => issue.code)
        expect(issues).toContain("INVALID_ASSESSMENT_MODULE")
        expect(issues).toContain("MISSING_ASSESSMENT_QUESTION_SET")
    })

    it("rejects publish readiness when an assessment has no source contract", () => {
        const brokenCourse: CourseContentV1 = {
            ...validCourse,
            assessments: [
                {
                    ...validCourse.assessments![0],
                    source: undefined,
                },
            ],
        }

        const issues = getCoursePublishReadinessIssues(brokenCourse, lessonRecords, questionSetRecords).map((issue) => issue.code)
        expect(issues).toContain("MISSING_ASSESSMENT_SOURCE")
    })

    it("rejects certificate criteria that reference missing assessments", () => {
        const brokenCourse: CourseContentV1 = {
            ...validCourse,
            certificate: {
                enabled: true,
                requiredAssessmentIds: ["assessment-missing"],
            },
        }

        const issues = getCoursePublishReadinessIssues(brokenCourse, lessonRecords, questionSetRecords).map((issue) => issue.code)
        expect(issues).toContain("INVALID_CERTIFICATE_ASSESSMENT_REFERENCE")
    })
})
