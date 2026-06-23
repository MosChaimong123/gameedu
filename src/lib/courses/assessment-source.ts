import { z } from "zod"
import { canonicalSubjectIdSchema } from "@/lib/curriculum/subject-catalog"

export const assessmentSourceTypeSchema = z.enum(["lesson", "topic", "module", "course"])

const objectIdLikeSchema = z.string().trim().min(1)

export const courseAssessmentSourceSchema = z
    .object({
        sourceType: assessmentSourceTypeSchema,
        lessonId: objectIdLikeSchema.optional(),
        topicId: z.string().trim().min(1).optional(),
        moduleId: z.string().trim().min(1).optional(),
        courseId: objectIdLikeSchema.optional(),
    })
    .superRefine((value, ctx) => {
        const requireOnly = (key: keyof typeof value, label: string) => {
            if (!value[key]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `${label} is required`,
                    path: [key],
                })
            }
        }

        if (value.sourceType === "lesson") {
            requireOnly("lessonId", "lessonId")
        }
        if (value.sourceType === "topic") {
            requireOnly("lessonId", "lessonId")
            requireOnly("topicId", "topicId")
        }
        if (value.sourceType === "module") {
            requireOnly("courseId", "courseId")
            requireOnly("moduleId", "moduleId")
        }
        if (value.sourceType === "course") {
            requireOnly("courseId", "courseId")
        }
    })

export type CourseAssessmentSource = z.infer<typeof courseAssessmentSourceSchema>

export const topicAssessmentSourceSchema = courseAssessmentSourceSchema.refine(
    (value) => value.sourceType === "topic" && Boolean(value.lessonId) && Boolean(value.topicId),
    {
        message: "topic assessment source must include lessonId and topicId",
    }
)

export type TopicAssessmentSource = z.infer<typeof topicAssessmentSourceSchema>

export const questionSetSourceMetadataSchema = z.object({
    source: courseAssessmentSourceSchema,
    generatedFrom: z.enum(["teacher_manual", "ai_lesson_assessment", "ai_course_assessment"]).default("teacher_manual"),
    subjectId: canonicalSubjectIdSchema.optional(),
    curriculumCode: z.string().trim().min(1).optional(),
    gradeLevel: z.string().trim().min(1).optional(),
    unitId: z.string().trim().min(1).optional(),
    learningOutcomeIds: z.array(z.string().trim().min(1)).min(1).optional(),
    assessmentBlueprintId: z.string().trim().min(1).optional(),
    assessmentFamily: z.string().trim().min(1).optional(),
    recommendedPassScore: z.number().int().min(1).optional(),
    createdFromLessonTitle: z.string().trim().min(1).optional(),
    createdFromCourseTitle: z.string().trim().min(1).optional(),
})

export type QuestionSetSourceMetadata = z.infer<typeof questionSetSourceMetadataSchema>

export const topicQuestionSetSourceMetadataSchema = questionSetSourceMetadataSchema.refine(
    (value) => value.source.sourceType === "topic" && Boolean(value.source.lessonId) && Boolean(value.source.topicId),
    {
        message: "topic assessment metadata must use a topic source",
        path: ["source"],
    }
)

export function isCourseAssessmentSource(value: unknown): value is CourseAssessmentSource {
    return courseAssessmentSourceSchema.safeParse(value).success
}

export function isTopicAssessmentSource(value: unknown): value is TopicAssessmentSource {
    return topicAssessmentSourceSchema.safeParse(value).success
}

export function isQuestionSetSourceMetadata(value: unknown): value is QuestionSetSourceMetadata {
    return questionSetSourceMetadataSchema.safeParse(value).success
}

export function isTopicQuestionSetSourceMetadata(value: unknown): value is QuestionSetSourceMetadata {
    return topicQuestionSetSourceMetadataSchema.safeParse(value).success
}

export function validateCourseAssessmentSource(
    value: unknown
): { ok: true; source: CourseAssessmentSource } | { ok: false; code: "INVALID_ASSESSMENT_SOURCE" } {
    const parsed = courseAssessmentSourceSchema.safeParse(value)
    if (!parsed.success) {
        return { ok: false, code: "INVALID_ASSESSMENT_SOURCE" }
    }

    return { ok: true, source: parsed.data }
}

export function validateTopicAssessmentSource(
    value: unknown
): { ok: true; source: TopicAssessmentSource } | { ok: false; code: "INVALID_ASSESSMENT_SOURCE" } {
    const parsed = topicAssessmentSourceSchema.safeParse(value)
    if (!parsed.success) {
        return { ok: false, code: "INVALID_ASSESSMENT_SOURCE" }
    }

    return { ok: true, source: parsed.data }
}

export function validateQuestionSetSourceMetadata(
    value: unknown
): { ok: true; sourceMetadata: QuestionSetSourceMetadata } | { ok: false; code: "INVALID_ASSESSMENT_SOURCE" } {
    const parsed = questionSetSourceMetadataSchema.safeParse(value)
    if (!parsed.success) {
        return { ok: false, code: "INVALID_ASSESSMENT_SOURCE" }
    }

    return { ok: true, sourceMetadata: parsed.data }
}

export function validateTopicQuestionSetSourceMetadata(
    value: unknown
): { ok: true; sourceMetadata: QuestionSetSourceMetadata } | { ok: false; code: "INVALID_ASSESSMENT_SOURCE" } {
    const parsed = topicQuestionSetSourceMetadataSchema.safeParse(value)
    if (!parsed.success) {
        return { ok: false, code: "INVALID_ASSESSMENT_SOURCE" }
    }

    return { ok: true, sourceMetadata: parsed.data }
}
