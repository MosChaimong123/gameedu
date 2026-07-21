import { getActiveLessonTopics, type LessonContentV2, type LessonMediaBlock } from "@/lib/lessons/lesson-content"
import { resolveUnitTitleFromCurriculum } from "@/lib/lessons/lesson-runtime-meta"

import type {
    AssignedLesson,
    CurriculumLesson,
    CurriculumTopic,
    RenderLessonContent,
} from "./student-lesson-player.types"

export function parseLessonResumeMode(value: string | null) {
    const mode = value?.trim().toUpperCase()
    return mode === "CONTENT" || mode === "ASSESSMENT" || mode === "REVIEW" || mode === "DONE" ? mode : null
}

export function getLessonResumeLabel(mode: "CONTENT" | "ASSESSMENT" | "REVIEW" | "DONE") {
    if (mode === "CONTENT") return "ดูเนื้อหาต่อ"
    if (mode === "ASSESSMENT") return "ทำแบบทดสอบต่อ"
    if (mode === "DONE") return "เรียนจบแล้ว"
    return "ทบทวนบทเรียน"
}

export function isLessonContentV2(value: unknown): value is LessonContentV2 {
    return Boolean(
        value &&
            typeof value === "object" &&
            (value as { schemaVersion?: unknown }).schemaVersion === "lesson_content_v2"
    )
}

export function normalizeLessonContentForRender(content: LessonContentV2): RenderLessonContent {
    const topics = getActiveLessonTopics(content)
    const documents = topics.flatMap((topic) => topic.documents ?? [])
    const mediaTopicMap: Record<string, string> = {}

    for (const topic of topics) {
        for (const media of topic.media ?? []) mediaTopicMap[media.id] = topic.id
        for (const section of topic.sections) {
            for (const media of section.media ?? []) mediaTopicMap[media.id] = topic.id
        }
    }

    const allMedia: LessonMediaBlock[] = topics.flatMap((topic) => [
        ...(topic.media ?? []),
        ...topic.sections.flatMap((section) => section.media ?? []),
    ])
    const heroMedia = allMedia[0] ?? null

    return {
        objectives: topics
            .flatMap((topic) => topic.objectives)
            .filter((objective) => objective.trim().length > 0),
        sections: topics.flatMap((topic) =>
            topic.sections.map((section) => ({
                id: `${topic.id}:${section.id}`,
                heading: section.heading,
                content: section.content,
                media: section.media,
            }))
        ),
        topics: topics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            description: topic.description,
            documents: topic.documents,
            media: topic.media,
            objectives: topic.objectives,
            sections: topic.sections.map((section) => ({
                id: section.id,
                heading: section.heading,
                content: section.content,
                media: section.media,
            })),
        })),
        documents,
        allMedia: allMedia.slice(1),
        heroMedia,
        heroMediaId: heroMedia?.id ?? null,
        heroTopicId: heroMedia ? (mediaTopicMap[heroMedia.id] ?? null) : null,
        mediaTopicMap,
        estimatedMinutes: content.estimatedMinutes,
    }
}

export function extractCurriculumLessons(assignments: AssignedLesson[]): CurriculumLesson[] {
    return assignments.map((assignment) => {
        const content = isLessonContentV2(assignment.lesson.content) ? assignment.lesson.content : null
        const unitTitle = resolveUnitTitleFromCurriculum(content?.metadata?.curriculum?.unitId ?? undefined) ?? undefined
        const topics: CurriculumTopic[] = (content ? getActiveLessonTopics(content) : []).map((topic) => ({
            id: topic.id,
            title: topic.title,
            sectionCount: topic.sections.length,
            hasAssessment: Boolean(topic.assessment?.questionSetId),
        }))

        return {
            lessonId: assignment.lesson.id,
            title: assignment.lesson.title,
            estimatedMinutes: content?.estimatedMinutes,
            isCompleted: assignment.completions.length > 0,
            unitTitle,
            topics,
        }
    })
}
