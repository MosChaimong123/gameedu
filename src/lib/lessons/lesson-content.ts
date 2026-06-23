import { isCurriculumSourceRef, type CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import { isCourseAssessmentSource, type CourseAssessmentSource } from "@/lib/courses/assessment-source"
import { normalizeTeachingMediaReferences, type TeachingMediaReference } from "@/lib/teaching-media-reference"
import type { TopicAssessmentV2 } from "@/lib/lessons/lesson-assessment"

export type LessonMediaBlock = {
    id: string
    type: "image" | "video"
    url: string
    mediaId?: string
    title?: string
    caption?: string
    source?: "upload" | "media_library" | "external_url"
}

export type LessonOutlineDraft = {
    title: string
    description?: string
    subject?: string
    gradeLevel?: string
    topics: Array<{
        id: string
        title: string
        description?: string
        order: number
    }>
}

export type LessonOutlineBatchDraft = {
    lessons: LessonOutlineDraft[]
}

export type LessonTopicContentDraft = {
    topicId: string
    objectives: string[]
    sections: Array<{
        id: string
        heading: string
        content: string
        media?: LessonMediaBlock[]
    }>
    documents?: TeachingMediaReference[]
    media?: LessonMediaBlock[]
    assessment?: TopicAssessmentV2
}

export type LessonContentMetadata = {
    curriculum?: {
        subject: string
        curriculumCode: string
        gradeLevel?: string
        semester?: number
        unitId?: string
        learningOutcomeIds?: string[]
        sourceRefs?: CurriculumSourceRef[]
    }
    template?: {
        templateId?: string
        templateLabel?: string
        teacherNotes?: string
        practicePlan?: string[]
    }
    mediaPlaceholders?: Array<{
        id: string
        title: string
        note?: string
        scope: "lesson" | "topic"
        topicId?: string
    }>
}

export type LessonContentV2 = {
    schemaVersion: "lesson_content_v2"
    outline: LessonOutlineDraft
    topics: Array<{
        id: string
        title: string
        description?: string
        order: number
        contentStatus: "empty" | "generated" | "edited"
        objectives: string[]
        sections: Array<{
            id: string
            heading: string
            content: string
            media?: LessonMediaBlock[]
        }>
        documents?: TeachingMediaReference[]
        media?: LessonMediaBlock[]
        assessment?: TopicAssessmentV2
    }>
    estimatedMinutes?: number
    metadata?: LessonContentMetadata
}

export type LessonPublishReadinessIssueCode =
    | "INVALID_LESSON_CONTENT_V2"
    | "MISSING_CURRICULUM_CODE"
    | "MISSING_CURRICULUM_GRADE_LEVEL"
    | "MISSING_CURRICULUM_UNIT_ID"
    | "MISSING_CURRICULUM_OUTCOME_IDS"
    | "NO_READY_TOPIC"
    | "MISSING_TOPIC_OBJECTIVES"
    | "MISSING_TOPIC_SECTIONS"
    | "MISSING_MEDIA_OR_DOCUMENT"
    | "MISSING_TOPIC_VIDEO"
    | "AI_PLACEHOLDER_FOUND"
    | "TEACHER_CONFIRMATION_REQUIRED"

export type LessonPublishReadinessIssue = {
    code: LessonPublishReadinessIssueCode
    message: string
    topicId?: string
}

const LESSON_PLACEHOLDER_PATTERNS = [
    "ไม่แน่ใจ",
    "ควรตรวจสอบ",
    "ใส่เนื้อหาที่นี่",
    "ครูสามารถเติมเนื้อหาสำหรับหัวข้อ",
] as const

function isNonEmptyText(value: unknown) {
    return typeof value === "string" && value.trim().length > 0
}

function isNonEmptyTextArray(value: unknown) {
    return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyText)
}

function isOptionalText(value: unknown) {
    return value === undefined || typeof value === "string"
}

function hasUniqueNonEmptyTopicTitles(topics: Array<Record<string, unknown>>) {
    const titles = new Set<string>()
    for (const topic of topics) {
        const title = typeof topic.title === "string" ? topic.title.trim().toLowerCase() : ""
        if (!title || titles.has(title)) return false
        titles.add(title)
    }
    return true
}

function isLessonMediaBlock(value: unknown): value is LessonMediaBlock {
    if (!value || typeof value !== "object") return false

    const media = value as Record<string, unknown>
    const validType = media.type === "image" || media.type === "video"
    const validSource =
        media.source === undefined ||
        media.source === "upload" ||
        media.source === "media_library" ||
        media.source === "external_url"

    return (
        isNonEmptyText(media.id) &&
        validType &&
        isNonEmptyText(media.url) &&
        isOptionalText(media.mediaId) &&
        isOptionalText(media.title) &&
        isOptionalText(media.caption) &&
        validSource
    )
}

function isLessonMediaBlockArray(value: unknown) {
    return value === undefined || (Array.isArray(value) && value.every(isLessonMediaBlock))
}

function isTeachingMediaReferenceArray(value: unknown) {
    return value === undefined || (Array.isArray(value) && normalizeTeachingMediaReferences(value).length === value.length)
}

function isLessonContentMetadata(value: unknown): value is LessonContentMetadata {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const metadata = value as Record<string, unknown>
    if (metadata.curriculum !== undefined) {
        if (!metadata.curriculum || typeof metadata.curriculum !== "object") return false
        const curriculum = metadata.curriculum as Record<string, unknown>
        if (!isNonEmptyText(curriculum.subject) || !isNonEmptyText(curriculum.curriculumCode)) return false
        if (!isOptionalText(curriculum.gradeLevel)) return false
        if (
            curriculum.semester !== undefined &&
            (!Number.isInteger(curriculum.semester) || ![1, 2].includes(curriculum.semester as number))
        ) return false
        if (!isOptionalText(curriculum.unitId)) return false
        if (
            curriculum.learningOutcomeIds !== undefined &&
            (!Array.isArray(curriculum.learningOutcomeIds) ||
                !curriculum.learningOutcomeIds.every(isNonEmptyText))
        ) return false
        if (
            curriculum.sourceRefs !== undefined &&
            (!Array.isArray(curriculum.sourceRefs) || !curriculum.sourceRefs.every(isCurriculumSourceRef))
        ) return false
    }

    if (metadata.template !== undefined) {
        if (!metadata.template || typeof metadata.template !== "object") return false
        const template = metadata.template as Record<string, unknown>
        if (!isOptionalText(template.templateId)) return false
        if (!isOptionalText(template.templateLabel)) return false
        if (!isOptionalText(template.teacherNotes)) return false
        if (
            template.practicePlan !== undefined &&
            (!Array.isArray(template.practicePlan) || !template.practicePlan.every(isNonEmptyText))
        ) return false
    }

    if (metadata.mediaPlaceholders !== undefined) {
        if (!Array.isArray(metadata.mediaPlaceholders)) return false
        const placeholderIds = new Set<string>()
        for (const placeholderValue of metadata.mediaPlaceholders) {
            if (!placeholderValue || typeof placeholderValue !== "object") return false
            const placeholder = placeholderValue as Record<string, unknown>
            const id = typeof placeholder.id === "string" ? placeholder.id.trim() : ""
            if (!id || placeholderIds.has(id)) return false
            placeholderIds.add(id)

            if (!isNonEmptyText(placeholder.title)) return false
            if (!isOptionalText(placeholder.note)) return false
            if (placeholder.scope !== "lesson" && placeholder.scope !== "topic") return false
            if (!isOptionalText(placeholder.topicId)) return false
        }
    }

    return true
}

function isLessonSection(value: unknown, options: { allowEmptyContent: boolean }) {
    if (!value || typeof value !== "object") return false

    const section = value as Record<string, unknown>
    const hasValidContent =
        options.allowEmptyContent ? typeof section.content === "string" : isNonEmptyText(section.content)

    return (
        isNonEmptyText(section.id) &&
        isNonEmptyText(section.heading) &&
        hasValidContent &&
        isLessonMediaBlockArray(section.media)
    )
}

function isLessonAssessmentReward(value: unknown) {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const reward = value as Record<string, unknown>
    return (
        (reward.behaviorPoints === undefined || (Number.isInteger(reward.behaviorPoints) && (reward.behaviorPoints as number) >= 0)) &&
        (reward.gold === undefined || (Number.isInteger(reward.gold) && (reward.gold as number) >= 0)) &&
        isOptionalText(reward.achievementId) &&
        isOptionalText(reward.achievementTitle)
    )
}

function isLessonAssessmentCertificate(value: unknown) {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const certificate = value as Record<string, unknown>
    return (
        typeof certificate.enabled === "boolean" &&
        isOptionalText(certificate.title) &&
        isOptionalText(certificate.description)
    )
}

function isTopicAssessment(value: unknown) {
    if (value === undefined) return true
    if (!value || typeof value !== "object") return false

    const assessment = value as Record<string, unknown>
    const passScore = assessment.passScore

    return (
        isNonEmptyText(assessment.id) &&
        isNonEmptyText(assessment.title) &&
        isNonEmptyText(assessment.questionSetId) &&
        (passScore === undefined || (Number.isInteger(passScore) && (passScore as number) >= 0)) &&
        (assessment.allowRetake === undefined || typeof assessment.allowRetake === "boolean") &&
        isCourseAssessmentSource(assessment.source) &&
        isLessonAssessmentReward(assessment.reward) &&
        isLessonAssessmentCertificate(assessment.certificate)
    )
}

export function isLessonOutlineDraft(value: unknown): value is LessonOutlineDraft {
    if (!value || typeof value !== "object") return false

    const outline = value as Record<string, unknown>
    if (!isNonEmptyText(outline.title)) return false
    if (!isOptionalText(outline.description)) return false
    if (!isOptionalText(outline.subject)) return false
    if (!isOptionalText(outline.gradeLevel)) return false
    if (!Array.isArray(outline.topics) || outline.topics.length === 0 || outline.topics.length > 10) return false

    const topics = outline.topics as Array<Record<string, unknown>>
    if (!hasUniqueNonEmptyTopicTitles(topics)) return false

    return topics.every((topic) => {
        return (
            isNonEmptyText(topic.id) &&
            isNonEmptyText(topic.title) &&
            isOptionalText(topic.description) &&
            Number.isInteger(topic.order) &&
            (topic.order as number) >= 0
        )
    })
}

export function isLessonOutlineBatchDraft(value: unknown): value is LessonOutlineBatchDraft {
    if (!value || typeof value !== "object") return false

    const batch = value as Record<string, unknown>
    if (!Array.isArray(batch.lessons) || batch.lessons.length === 0 || batch.lessons.length > 12) return false

    const titles = new Set<string>()
    return batch.lessons.every((lesson) => {
        if (!isLessonOutlineDraft(lesson)) return false
        const title = lesson.title.trim().toLowerCase()
        if (titles.has(title)) return false
        titles.add(title)
        return true
    })
}


export function isLessonTopicContentDraft(value: unknown): value is LessonTopicContentDraft {
    if (!value || typeof value !== "object") return false

    const topic = value as Record<string, unknown>
    if (!isNonEmptyText(topic.topicId)) return false
    if (!isNonEmptyTextArray(topic.objectives)) return false
    if (!Array.isArray(topic.sections) || topic.sections.length === 0) return false
    if (!isLessonMediaBlockArray(topic.media)) return false
    if (!isTeachingMediaReferenceArray(topic.documents)) return false
    if (!isTopicAssessment(topic.assessment)) return false

    return topic.sections.every((section) => isLessonSection(section, { allowEmptyContent: false }))
}

export function isLessonContentV2(value: unknown): value is LessonContentV2 {
    if (!value || typeof value !== "object") return false

    const content = value as Record<string, unknown>
    if (content.schemaVersion !== "lesson_content_v2") return false
    if (!isLessonOutlineDraft(content.outline)) return false
    const estimatedMinutes = content.estimatedMinutes
    if (
        estimatedMinutes !== undefined &&
        (typeof estimatedMinutes !== "number" || !Number.isFinite(estimatedMinutes) || estimatedMinutes < 0)
    ) return false
    if (!isLessonContentMetadata(content.metadata)) return false
    if (!Array.isArray(content.topics) || content.topics.length === 0) return false

    const outline = content.outline as LessonOutlineDraft
    const outlineTopicIds = new Set(outline.topics.map((topic) => topic.id))
    const seenTopicIds = new Set<string>()

    return content.topics.every((topicValue) => {
        if (!topicValue || typeof topicValue !== "object") return false
        const topic = topicValue as Record<string, unknown>
        const topicId = typeof topic.id === "string" ? topic.id : ""
        if (!outlineTopicIds.has(topicId) || seenTopicIds.has(topicId)) return false
        seenTopicIds.add(topicId)

        const contentStatus = topic.contentStatus
        const allowsEmptyContent = contentStatus === "empty"
        const validStatus = contentStatus === "empty" || contentStatus === "generated" || contentStatus === "edited"
        const topicAssessment = topic.assessment as TopicAssessmentV2 | undefined

        if (!isTopicAssessment(topicAssessment)) return false
        if (topicAssessment) {
            if (topicAssessment.source.sourceType !== "topic") {
                return false
            }
            const sourceTopicId = typeof topicAssessment.source.topicId === "string" ? topicAssessment.source.topicId.trim() : ""
            if (!isNonEmptyText(topicAssessment.source.lessonId) || !sourceTopicId || sourceTopicId !== topicId) {
                return false
            }
        }

        return (
            isNonEmptyText(topic.id) &&
            isNonEmptyText(topic.title) &&
            isOptionalText(topic.description) &&
            Number.isInteger(topic.order) &&
            (topic.order as number) >= 0 &&
            validStatus &&
            (allowsEmptyContent ? Array.isArray(topic.objectives) : isNonEmptyTextArray(topic.objectives)) &&
            Array.isArray(topic.sections) &&
            (allowsEmptyContent || topic.sections.length > 0) &&
            topic.sections.every((section) => isLessonSection(section, { allowEmptyContent: allowsEmptyContent })) &&
            isLessonMediaBlockArray(topic.media) &&
            isTeachingMediaReferenceArray(topic.documents)
        )
    })
}

export function getCanonicalTopicAssessments(content: LessonContentV2) {
    return content.topics.flatMap((topic) =>
        topic.assessment
            ? [
                  {
                      topicId: topic.id,
                      topicTitle: topic.title,
                      assessment: topic.assessment,
                  },
              ]
            : []
    )
}

export function getLessonTopicById(content: LessonContentV2, topicId: string) {
    return content.topics.find((topic) => topic.id === topicId) ?? null
}

export function getTopicAssessmentByTopicId(content: LessonContentV2, topicId: string) {
    const topic = getLessonTopicById(content, topicId)
    if (!topic?.assessment) return null

    return {
        topicId: topic.id,
        topicTitle: topic.title,
        assessment: topic.assessment,
    }
}

export function isLessonContentPublishReady(value: unknown) {
    return getLessonPublishReadinessIssues(value).length === 0
}

function hasPlaceholderText(value: string) {
    const normalized = value.trim().toLowerCase()
    return LESSON_PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()))
}

export function getLessonPublishReadinessIssues(
    value: unknown,
    options?: { requireTeacherConfirmation?: boolean; publishConfirmed?: boolean }
): LessonPublishReadinessIssue[] {
    if (!isLessonContentV2(value)) {
        return [
            {
                code: "INVALID_LESSON_CONTENT_V2",
                message: "Lesson must use lesson_content_v2 before publish.",
            },
        ]
    }

    const issues: LessonPublishReadinessIssue[] = []
    const curriculum = value.metadata?.curriculum

    if (!curriculum?.curriculumCode) {
        issues.push({
            code: "MISSING_CURRICULUM_CODE",
            message: "Lesson is missing curriculumCode in metadata.",
        })
    }
    if (!curriculum?.gradeLevel) {
        issues.push({
            code: "MISSING_CURRICULUM_GRADE_LEVEL",
            message: "Lesson is missing curriculum gradeLevel in metadata.",
        })
    }
    if (!curriculum?.unitId) {
        issues.push({
            code: "MISSING_CURRICULUM_UNIT_ID",
            message: "Lesson is missing curriculum unitId in metadata.",
        })
    }
    if (!curriculum?.learningOutcomeIds || curriculum.learningOutcomeIds.length === 0) {
        issues.push({
            code: "MISSING_CURRICULUM_OUTCOME_IDS",
            message: "Lesson is missing linked learningOutcomeIds in metadata.",
        })
    }

    const readyTopics = value.topics.filter((topic) => topic.contentStatus !== "empty")
    if (readyTopics.length === 0) {
        issues.push({
            code: "NO_READY_TOPIC",
            message: "Lesson needs at least one topic with generated or edited content before publish.",
        })
    }

    for (const topic of readyTopics) {
        if (!isNonEmptyTextArray(topic.objectives)) {
            issues.push({
                code: "MISSING_TOPIC_OBJECTIVES",
                message: "Each ready topic needs at least one objective.",
                topicId: topic.id,
            })
        }
        if (
            topic.sections.length === 0 ||
            !topic.sections.every((section) => isLessonSection(section, { allowEmptyContent: false }))
        ) {
            issues.push({
                code: "MISSING_TOPIC_SECTIONS",
                message: "Each ready topic needs at least one section with real content.",
                topicId: topic.id,
            })
        }

        const textPool = [
            topic.title,
            topic.description ?? "",
            ...topic.objectives,
            ...topic.sections.flatMap((section) => [section.heading, section.content]),
        ]
        if (textPool.some((entry) => hasPlaceholderText(entry))) {
            issues.push({
                code: "AI_PLACEHOLDER_FOUND",
                message: "Lesson still contains placeholder or review-needed text.",
                topicId: topic.id,
            })
        }
    }

    // ตรวจสอบว่าทุก ready topic มีวิดีโออย่างน้อย 1 ชิ้น
    for (const topic of readyTopics) {
        const hasTopicVideo = topic.media?.some((m) => m.type === "video") ?? false
        const hasSectionVideo = topic.sections.some(
            (section) => section.media?.some((m) => m.type === "video") ?? false
        )
        if (!hasTopicVideo && !hasSectionVideo) {
            issues.push({
                code: "MISSING_TOPIC_VIDEO",
                message: `หัวข้อ "${topic.title}" ยังไม่มีวิดีโอ กรุณาเพิ่มวิดีโอก่อน publish`,
                topicId: topic.id,
            })
        }
    }

    const lessonHasMediaOrDocuments =
        value.topics.some((topic) => (topic.documents?.length ?? 0) > 0 || (topic.media?.length ?? 0) > 0) ||
        value.topics.some((topic) => topic.sections.some((section) => (section.media?.length ?? 0) > 0))

    if (!lessonHasMediaOrDocuments) {
        issues.push({
            code: "MISSING_MEDIA_OR_DOCUMENT",
            message: "Lesson needs at least one media item or document before publish.",
        })
    }

    if (options?.requireTeacherConfirmation && options.publishConfirmed !== true) {
        issues.push({
            code: "TEACHER_CONFIRMATION_REQUIRED",
            message: "Teacher must confirm lesson accuracy before publish.",
        })
    }

    return issues
}
