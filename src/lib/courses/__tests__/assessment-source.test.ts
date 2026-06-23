import { describe, expect, it } from "vitest"
import {
    isCourseAssessmentSource,
    isQuestionSetSourceMetadata,
    isTopicAssessmentSource,
    isTopicQuestionSetSourceMetadata,
    validateCourseAssessmentSource,
    validateQuestionSetSourceMetadata,
    validateTopicAssessmentSource,
    validateTopicQuestionSetSourceMetadata,
} from "../assessment-source"

describe("assessment source contract", () => {
    it("accepts valid lesson, topic, module, and course sources", () => {
        expect(isCourseAssessmentSource({ sourceType: "lesson", lessonId: "lesson-1" })).toBe(true)
        expect(isCourseAssessmentSource({ sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" })).toBe(true)
        expect(isCourseAssessmentSource({ sourceType: "module", courseId: "course-1", moduleId: "module-1" })).toBe(true)
        expect(isCourseAssessmentSource({ sourceType: "course", courseId: "course-1" })).toBe(true)
    })

    it("rejects invalid source payloads", () => {
        expect(validateCourseAssessmentSource({ sourceType: "lesson" })).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
        expect(validateCourseAssessmentSource({ sourceType: "topic", lessonId: "lesson-1" })).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
        expect(validateCourseAssessmentSource({ sourceType: "module", moduleId: "module-1" })).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
    })

    it("accepts valid question set source metadata", () => {
        const payload = {
            source: { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" },
            generatedFrom: "ai_lesson_assessment" as const,
            subjectId: "physics" as const,
            curriculumCode: "basic_education_2551_revised_2560",
            gradeLevel: "m4",
            unitId: "phy-m4-s1-u02",
            learningOutcomeIds: ["phy-lo-m4-s1-u02-01"],
            assessmentBlueprintId: "physics-assessment-blueprint-v1",
            assessmentFamily: "science_inquiry",
            recommendedPassScore: 6,
            createdFromLessonTitle: "Force and motion",
        }

        expect(isQuestionSetSourceMetadata(payload)).toBe(true)
        expect(validateQuestionSetSourceMetadata(payload)).toEqual({
            ok: true,
            sourceMetadata: payload,
        })
    })

    it("accepts valid topic-only source contracts", () => {
        const sourcePayload = { sourceType: "topic", lessonId: "lesson-1", topicId: "topic-1" } as const
        const metadataPayload = {
            source: sourcePayload,
            generatedFrom: "ai_lesson_assessment" as const,
            createdFromLessonTitle: "Force and motion",
        }

        expect(isTopicAssessmentSource(sourcePayload)).toBe(true)
        expect(validateTopicAssessmentSource(sourcePayload)).toEqual({
            ok: true,
            source: sourcePayload,
        })
        expect(isTopicQuestionSetSourceMetadata(metadataPayload)).toBe(true)
        expect(validateTopicQuestionSetSourceMetadata(metadataPayload)).toEqual({
            ok: true,
            sourceMetadata: metadataPayload,
        })
    })

    it("rejects non-topic source contracts for topic assessments", () => {
        expect(validateTopicAssessmentSource({ sourceType: "lesson", lessonId: "lesson-1" })).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
        expect(
            validateTopicQuestionSetSourceMetadata({
                source: { sourceType: "lesson", lessonId: "lesson-1" },
                generatedFrom: "ai_lesson_assessment",
            })
        ).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
        expect(
            validateTopicQuestionSetSourceMetadata({
                source: { sourceType: "topic", lessonId: "lesson-1" },
                generatedFrom: "ai_lesson_assessment",
            })
        ).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
    })

    it("rejects malformed question set source metadata", () => {
        expect(
            validateQuestionSetSourceMetadata({
                source: { sourceType: "course" },
                generatedFrom: "ai_lesson_assessment",
                recommendedPassScore: 0,
            })
        ).toEqual({
            ok: false,
            code: "INVALID_ASSESSMENT_SOURCE",
        })
    })
})
