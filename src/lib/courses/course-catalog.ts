import type { CourseContentV1 } from "@/lib/courses/course-content"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"

export type CourseCatalogMeta = {
    moduleCount: number
    lessonCount: number
    estimatedMinutes: number
    categoryIds: string[]
    tagIds: string[]
    hasVideo: boolean
    hasDocuments: boolean
}

export function getCourseCatalogMeta(content: CourseContentV1, lessons?: Array<{ content: LessonContentV2 }>) {
    const moduleCount = content.modules.length
    const lessonRefs = content.modules.flatMap((module) => module.lessons)
    const lessonCount = lessonRefs.length
    const estimatedMinutes =
        content.estimatedMinutes ?? lessonRefs.reduce((sum, lesson) => sum + (lesson.estimatedMinutes ?? 0), 0)
    const categoryIds = content.categoryIds ?? []
    const tagIds = content.tagIds ?? []
    const lessonContents = lessons?.map((lesson) => lesson.content) ?? []

    const hasVideo = lessonContents.some((lesson) =>
        lesson.topics.some(
            (topic) =>
                (topic.media ?? []).some((media) => media.type === "video") ||
                topic.sections.some((section) => (section.media ?? []).some((media) => media.type === "video"))
        )
    )
    const hasDocuments = lessonContents.some((lesson) => lesson.topics.some((topic) => (topic.documents ?? []).length > 0))

    return {
        moduleCount,
        lessonCount,
        estimatedMinutes,
        categoryIds,
        tagIds,
        hasVideo,
        hasDocuments,
    }
}

export function getCourseFallbackTheme(input: { title: string; subject?: string | null; gradeLevel?: string | null }) {
    const seed = `${input.subject ?? ""}-${input.gradeLevel ?? ""}-${input.title}`.toLowerCase()
    if (seed.includes("math")) return "from-amber-500 via-orange-500 to-rose-500"
    if (seed.includes("phys")) return "from-sky-500 via-cyan-500 to-emerald-500"
    if (seed.includes("bio")) return "from-emerald-500 via-lime-500 to-yellow-400"
    if (seed.includes("chem")) return "from-fuchsia-500 via-pink-500 to-orange-400"
    if (seed.includes("thai")) return "from-rose-500 via-red-500 to-amber-500"
    if (seed.includes("eng")) return "from-indigo-500 via-blue-500 to-cyan-400"
    return "from-slate-700 via-slate-600 to-slate-500"
}
