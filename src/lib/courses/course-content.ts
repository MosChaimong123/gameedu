import { isLessonContentPublishReady, isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { isCourseAssessmentSource, type CourseAssessmentSource } from "@/lib/courses/assessment-source"

export type CourseUnlockRule =
    | { type: "none" }
    | { type: "previous_lesson_completed" }
    | { type: "lesson_completed"; lessonId: string }

export type CourseLessonRef = {
    id: string
    lessonId: string
    title?: string
    order: number
    required: boolean
    estimatedMinutes?: number
    unlockRule?: CourseUnlockRule
}

export type CourseModule = {
    id: string
    title: string
    description?: string
    order: number
    lessons: CourseLessonRef[]
}

export type CourseAssessmentType = "pretest" | "posttest" | "checkpoint"

export type CourseAssessmentV2 = {
    id: string
    type: CourseAssessmentType
    title: string
    questionSetId?: string
    moduleId?: string
    passScore?: number
    allowRetake?: boolean
    source?: CourseAssessmentSource
}

export type CourseCertificateRewardV1 = {
    behaviorPoints?: number
    achievementId?: string
    achievementTitle?: string
}

export type CourseCertificateConfigV1 = {
    enabled: boolean
    title?: string
    description?: string
    requiredAssessmentIds?: string[]
    reward?: CourseCertificateRewardV1
}

export type CourseContentV1 = {
    schemaVersion: "course_content_v1"
    title: string
    description?: string
    subject?: string
    gradeLevel?: string
    coverImageUrl?: string
    categoryIds?: string[]
    tagIds?: string[]
    modules: CourseModule[]
    assessments?: CourseAssessmentV2[]
    certificate?: CourseCertificateConfigV1
    estimatedMinutes?: number
}

export type CourseLessonPublishRecord = {
    id: string
    status?: string
    content: unknown
}

export type CoursePublishReadinessIssueCode =
    | "INVALID_COURSE_CONTENT"
    | "EMPTY_COURSE"
    | "EMPTY_MODULE"
    | "DUPLICATE_MODULE_ID"
    | "DUPLICATE_LESSON_REF_ID"
    | "DUPLICATE_LESSON_ID"
    | "MISSING_LESSON_RECORD"
    | "LESSON_NOT_PUBLISHED"
    | "LEGACY_LESSON_CONTENT"
    | "LESSON_NOT_PUBLISH_READY"
    | "DUPLICATE_ASSESSMENT_ID"
    | "INVALID_ASSESSMENT_MODULE"
    | "MISSING_ASSESSMENT_QUESTION_SET"
    | "MISSING_ASSESSMENT_SOURCE"
    | "INVALID_CERTIFICATE_ASSESSMENT_REFERENCE"

export type CoursePublishReadinessIssue = {
    code: CoursePublishReadinessIssueCode
    message: string
    moduleId?: string
    lessonId?: string
    assessmentId?: string
}

export type CourseAssessmentQuestionSetRecord = {
    id: string
}

function isNonEmptyText(value: unknown) {
    return typeof value === "string" && value.trim().length > 0
}

function isOptionalText(value: unknown) {
    return value === undefined || typeof value === "string"
}

function isOptionalTextArray(value: unknown) {
    return value === undefined || (Array.isArray(value) && value.every(isNonEmptyText))
}

function isNonNegativeFiniteNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isOptionalNonNegativeFiniteNumber(value: unknown) {
    return value === undefined || isNonNegativeFiniteNumber(value)
}

function isOptionalInteger(value: unknown) {
    return value === undefined || Number.isInteger(value)
}

function isOptionalBoolean(value: unknown) {
    return value === undefined || typeof value === "boolean"
}

function hasUniqueValues(values: string[]) {
    return new Set(values).size === values.length
}

function isCourseUnlockRule(value: unknown): value is CourseUnlockRule {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const rule = value as Record<string, unknown>
    if (rule.type === "none" || rule.type === "previous_lesson_completed") return true
    return rule.type === "lesson_completed" && isNonEmptyText(rule.lessonId)
}

function isCourseLessonRef(value: unknown): value is CourseLessonRef {
    if (!value || typeof value !== "object") return false

    const lesson = value as Record<string, unknown>
    return (
        isNonEmptyText(lesson.id) &&
        isNonEmptyText(lesson.lessonId) &&
        isOptionalText(lesson.title) &&
        Number.isInteger(lesson.order) &&
        (lesson.order as number) >= 0 &&
        typeof lesson.required === "boolean" &&
        isOptionalNonNegativeFiniteNumber(lesson.estimatedMinutes) &&
        isCourseUnlockRule(lesson.unlockRule)
    )
}

function isCourseModule(value: unknown): value is CourseModule {
    if (!value || typeof value !== "object") return false

    const module = value as Record<string, unknown>
    if (
        !isNonEmptyText(module.id) ||
        !isNonEmptyText(module.title) ||
        !isOptionalText(module.description) ||
        !Number.isInteger(module.order) ||
        (module.order as number) < 0 ||
        !Array.isArray(module.lessons)
    ) return false

    const lessons = module.lessons
    if (!lessons.every(isCourseLessonRef)) return false

    const refIds = lessons.map((lesson) => lesson.id)
    return hasUniqueValues(refIds)
}

function isCourseAssessmentType(value: unknown): value is CourseAssessmentType {
    return value === "pretest" || value === "posttest" || value === "checkpoint"
}

function isCourseAssessmentV2(value: unknown): value is CourseAssessmentV2 {
    if (!value || typeof value !== "object") return false

    const assessment = value as Record<string, unknown>
    return (
        isNonEmptyText(assessment.id) &&
        isCourseAssessmentType(assessment.type) &&
        isNonEmptyText(assessment.title) &&
        isOptionalText(assessment.questionSetId) &&
        isOptionalText(assessment.moduleId) &&
        isOptionalInteger(assessment.passScore) &&
        (assessment.passScore === undefined || (assessment.passScore as number) >= 0) &&
        (assessment.allowRetake === undefined || typeof assessment.allowRetake === "boolean") &&
        (assessment.source === undefined || isCourseAssessmentSource(assessment.source))
    )
}

function isCourseCertificateRewardV1(value: unknown): value is CourseCertificateRewardV1 {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const reward = value as Record<string, unknown>
    return (
        isOptionalInteger(reward.behaviorPoints) &&
        (reward.behaviorPoints === undefined || (reward.behaviorPoints as number) >= 0) &&
        isOptionalText(reward.achievementId) &&
        isOptionalText(reward.achievementTitle)
    )
}

function isCourseCertificateConfigV1(value: unknown): value is CourseCertificateConfigV1 {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const certificate = value as Record<string, unknown>
    return (
        typeof certificate.enabled === "boolean" &&
        isOptionalText(certificate.title) &&
        isOptionalText(certificate.description) &&
        (certificate.requiredAssessmentIds === undefined ||
            (Array.isArray(certificate.requiredAssessmentIds) && certificate.requiredAssessmentIds.every(isNonEmptyText))) &&
        isCourseCertificateRewardV1(certificate.reward)
    )
}

export function isCourseContentV1(value: unknown): value is CourseContentV1 {
    if (!value || typeof value !== "object") return false

    const content = value as Record<string, unknown>
    if (content.schemaVersion !== "course_content_v1") return false
    if (!isNonEmptyText(content.title)) return false
    if (!isOptionalText(content.description)) return false
    if (!isOptionalText(content.subject)) return false
    if (!isOptionalText(content.gradeLevel)) return false
    if (!isOptionalText(content.coverImageUrl)) return false
    if (!isCourseCertificateConfigV1(content.certificate)) return false
    if (!isOptionalTextArray(content.categoryIds)) return false
    if (!isOptionalTextArray(content.tagIds)) return false
    if (!(content.assessments === undefined || (Array.isArray(content.assessments) && content.assessments.every(isCourseAssessmentV2)))) {
        return false
    }
    if (!isOptionalNonNegativeFiniteNumber(content.estimatedMinutes)) return false
    if (!Array.isArray(content.modules)) return false
    if (!content.modules.every(isCourseModule)) return false

    const modules = content.modules as CourseModule[]
    if (!hasUniqueValues(modules.map((module) => module.id))) return false

    const assessments = (content.assessments ?? []) as CourseAssessmentV2[]
    return hasUniqueValues(assessments.map((assessment) => assessment.id))
}

function normalizeLessonRecords(records?: CourseLessonPublishRecord[] | Record<string, CourseLessonPublishRecord>) {
    if (!records) return new Map<string, CourseLessonPublishRecord>()
    if (Array.isArray(records)) return new Map(records.map((record) => [record.id, record]))
    return new Map(Object.entries(records))
}

function normalizeQuestionSetRecords(records?: CourseAssessmentQuestionSetRecord[] | Record<string, CourseAssessmentQuestionSetRecord>) {
    if (!records) return new Map<string, CourseAssessmentQuestionSetRecord>()
    if (Array.isArray(records)) return new Map(records.map((record) => [record.id, record]))
    return new Map(Object.entries(records))
}

export function getCoursePublishReadinessIssues(
    content: unknown,
    lessonRecords?: CourseLessonPublishRecord[] | Record<string, CourseLessonPublishRecord>,
    questionSetRecords?: CourseAssessmentQuestionSetRecord[] | Record<string, CourseAssessmentQuestionSetRecord>
): CoursePublishReadinessIssue[] {
    if (!isCourseContentV1(content)) {
        return [
            {
                code: "INVALID_COURSE_CONTENT",
                message: "Course content must use course_content_v1.",
            },
        ]
    }

    const issues: CoursePublishReadinessIssue[] = []
    if (content.modules.length === 0) {
        issues.push({
            code: "EMPTY_COURSE",
            message: "Course must contain at least one module.",
        })
    }

    const moduleIds = new Set<string>()
    const lessonRefIds = new Set<string>()
    const lessonIds = new Set<string>()
    const recordsById = normalizeLessonRecords(lessonRecords)
    const questionSetsById = normalizeQuestionSetRecords(questionSetRecords)

    for (const module of content.modules) {
        if (moduleIds.has(module.id)) {
            issues.push({
                code: "DUPLICATE_MODULE_ID",
                message: "Course modules must have unique ids.",
                moduleId: module.id,
            })
        }
        moduleIds.add(module.id)

        if (module.lessons.length === 0) {
            issues.push({
                code: "EMPTY_MODULE",
                message: "Published modules must contain at least one lesson.",
                moduleId: module.id,
            })
        }

        for (const lesson of module.lessons) {
            if (lessonRefIds.has(lesson.id)) {
                issues.push({
                    code: "DUPLICATE_LESSON_REF_ID",
                    message: "Course lesson refs must have unique ids.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
            }
            lessonRefIds.add(lesson.id)

            if (lessonIds.has(lesson.lessonId)) {
                issues.push({
                    code: "DUPLICATE_LESSON_ID",
                    message: "A lesson can appear only once in a published course.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
            }
            lessonIds.add(lesson.lessonId)

            const record = recordsById.get(lesson.lessonId)
            if (!record) {
                issues.push({
                    code: "MISSING_LESSON_RECORD",
                    message: "Published courses must validate every lesson reference.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
                continue
            }

            if (record.status !== undefined && record.status !== "PUBLISHED") {
                issues.push({
                    code: "LESSON_NOT_PUBLISHED",
                    message: "Course lessons must be published before the course is published.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
            }

            if (!isLessonContentV2(record.content)) {
                issues.push({
                    code: "LEGACY_LESSON_CONTENT",
                    message: "Course lessons must use lesson_content_v2.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
                continue
            }

            if (!isLessonContentPublishReady(record.content)) {
                issues.push({
                    code: "LESSON_NOT_PUBLISH_READY",
                    message: "Course lessons must be publish-ready Lesson V2 content.",
                    moduleId: module.id,
                    lessonId: lesson.lessonId,
                })
            }
        }
    }

    const moduleIdSet = new Set(content.modules.map((module) => module.id))
    const assessmentIds = new Set<string>()
    for (const assessment of content.assessments ?? []) {
        if (assessmentIds.has(assessment.id)) {
            issues.push({
                code: "DUPLICATE_ASSESSMENT_ID",
                message: "Course assessments must have unique ids.",
                assessmentId: assessment.id,
            })
        }
        assessmentIds.add(assessment.id)

        if (assessment.moduleId && !moduleIdSet.has(assessment.moduleId)) {
            issues.push({
                code: "INVALID_ASSESSMENT_MODULE",
                message: "Assessment moduleId must reference an existing course module.",
                assessmentId: assessment.id,
                moduleId: assessment.moduleId,
            })
        }

        if (!assessment.questionSetId || !questionSetsById.has(assessment.questionSetId)) {
            issues.push({
                code: "MISSING_ASSESSMENT_QUESTION_SET",
                message: "Course assessments must reference an existing question set before publish.",
                assessmentId: assessment.id,
            })
        }

        if (!assessment.source) {
            issues.push({
                code: "MISSING_ASSESSMENT_SOURCE",
                message: "Course assessments must declare the lesson, topic, module, or course source before publish.",
                assessmentId: assessment.id,
            })
        }
    }

    if (content.certificate?.enabled) {
        const validAssessmentIds = new Set((content.assessments ?? []).map((assessment) => assessment.id))
        for (const assessmentId of content.certificate.requiredAssessmentIds ?? []) {
            if (!validAssessmentIds.has(assessmentId)) {
                issues.push({
                    code: "INVALID_CERTIFICATE_ASSESSMENT_REFERENCE",
                    message: "Certificate criteria must reference existing course assessments.",
                    assessmentId,
                })
            }
        }
    }

    return issues
}

export function isCourseContentPublishReady(
    content: unknown,
    lessonRecords?: CourseLessonPublishRecord[] | Record<string, CourseLessonPublishRecord>,
    questionSetRecords?: CourseAssessmentQuestionSetRecord[] | Record<string, CourseAssessmentQuestionSetRecord>
) {
    return getCoursePublishReadinessIssues(content, lessonRecords, questionSetRecords).length === 0
}
