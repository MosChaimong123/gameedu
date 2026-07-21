import { db } from "@/lib/db"
import {
    normalizeLessonContentCurriculumForWrite,
    withLessonNormalizedCurriculumSummary,
} from "@/lib/lessons/lesson-curriculum-metadata"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"
import { syncTeachingMediaUsageForOwner } from "@/lib/actions/teaching-media-actions"
import { getLessonMediaBlockUsageReferences, getTeachingMediaUsageReferences } from "@/lib/teaching-media-reference"

type CreateLessonInput = {
    title?: unknown
    subject?: unknown
    gradeLevel?: unknown
    description?: unknown
    sourceFileName?: unknown
    content?: unknown
}

export type CreateLessonResult =
    | { ok: false; reason: "title_required" }
    | { ok: false; reason: "invalid_content" }
    | { ok: true; lesson: unknown }

function trimOptionalString(value: unknown) {
    return typeof value === "string" ? value.trim() : undefined
}

export async function listLessonsForTeacher(ownerUserId: string) {
    const lessons = await db.lesson.findMany({
        where: { ownerUserId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            subject: true,
            gradeLevel: true,
            description: true,
            status: true,
            sourceFileName: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            classroomAssignments: {
                select: {
                    classId: true,
                    classroom: { select: { id: true, name: true } },
                },
            },
        },
    })

    return lessons.map((lesson) => withLessonNormalizedCurriculumSummary(lesson))
}

export async function createDraftLessonForTeacher(
    ownerUserId: string,
    input: CreateLessonInput
): Promise<CreateLessonResult> {
    const title = trimOptionalString(input.title)
    if (!title) {
        return { ok: false, reason: "title_required" }
    }
    if (!isLessonContentV2(input.content)) {
        return { ok: false, reason: "invalid_content" }
    }

    const subject = trimOptionalString(input.subject)
    const normalizedContent = normalizeLessonContentCurriculumForWrite(input.content, subject)

    const lesson = await db.lesson.create({
        data: {
            title,
            subject: subject || null,
            gradeLevel: trimOptionalString(input.gradeLevel) || null,
            description: trimOptionalString(input.description) || null,
            sourceFileName: trimOptionalString(input.sourceFileName) || null,
            content: normalizedContent,
            status: "DRAFT",
            ownerUserId,
        },
    })

    const documentUsage = getTeachingMediaUsageReferences(
        normalizedContent.topics.flatMap((topic) => topic.documents ?? [])
    )
    const mediaUsage = getLessonMediaBlockUsageReferences(
        normalizedContent.topics.flatMap((topic) => [
            ...(topic.media ?? []),
            ...topic.sections.flatMap((section) => section.media ?? []),
        ])
    )

    await syncTeachingMediaUsageForOwner(ownerUserId, {
        mediaIds: [...new Set([...documentUsage.mediaIds, ...mediaUsage.mediaIds])],
        urls: [...new Set([...documentUsage.urls, ...mediaUsage.urls])],
        linkUrls: [...new Set([...documentUsage.linkUrls, ...mediaUsage.linkUrls])],
        youtubeIds: [...new Set([...documentUsage.youtubeIds, ...mediaUsage.youtubeIds])],
    })

    return {
        ok: true,
        lesson: withLessonNormalizedCurriculumSummary(lesson, {
            content: normalizedContent,
            subject: subject || null,
        }),
    }
}
