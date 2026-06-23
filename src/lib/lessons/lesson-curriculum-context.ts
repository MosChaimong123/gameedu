import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getCanonicalSubjectById, type CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"
import { isLessonContentV2 } from "@/lib/lessons/lesson-content"

export const CORE_SUBJECT_OPTIONS: CanonicalCoreSubjectId[] = [
    "thai",
    "mathematics",
    "science_technology",
    "social_religion_culture",
    "health_physical_education",
    "arts",
    "career",
    "foreign_languages",
]

export type LessonCurriculumContext = {
    subjectId: CanonicalCoreSubjectId | null
    unitId: string | null
}

export function isCanonicalCoreSubjectId(value: string | null | undefined): value is CanonicalCoreSubjectId {
    return Boolean(value && CORE_SUBJECT_OPTIONS.includes(value as CanonicalCoreSubjectId))
}

export function parseLessonCurriculumContext(searchParams: { get(name: string): string | null }): LessonCurriculumContext {
    const subjectIdValue = searchParams.get("subjectId")?.trim() ?? ""
    const unitIdValue = searchParams.get("unitId")?.trim() ?? ""
    return {
        subjectId: isCanonicalCoreSubjectId(subjectIdValue) ? subjectIdValue : null,
        unitId: unitIdValue || null,
    }
}

export function buildLessonCurriculumHref(
    pathname: string,
    context: LessonCurriculumContext,
    extraParams?: Record<string, string | null | undefined>
) {
    const params = new URLSearchParams()
    if (context.subjectId) params.set("subjectId", context.subjectId)
    if (context.unitId) params.set("unitId", context.unitId)
    for (const [key, value] of Object.entries(extraParams ?? {})) {
        const normalized = value?.trim()
        if (normalized) params.set(key, normalized)
    }
    const query = params.toString()
    return `${pathname}${query ? `?${query}` : ""}`
}

export function resolveCanonicalSubjectId(subjectValue: string | null | undefined) {
    const normalized = subjectValue?.trim()
    if (!normalized) return null
    return (
        CORE_SUBJECT_OPTIONS.find((subjectId) => {
            const option = getCanonicalSubjectById(subjectId)
            return option?.displayNameTh === normalized || option?.displayNameEn === normalized || subjectId === normalized
        }) ?? null
    )
}

export function resolveCurriculumUnitTitle(subjectId: CanonicalCoreSubjectId | null, unitId: string | null | undefined) {
    if (!subjectId || !unitId) return null
    const pack = getSubjectCurriculumMapPack(subjectId)
    return pack?.unitOutlines.find((unit) => unit.id === unitId)?.title ?? null
}

export function resolveLessonCurriculumContext(content: unknown, fallbackSubject?: string | null): LessonCurriculumContext {
    if (isLessonContentV2(content)) {
        const metadata = content.metadata?.curriculum
        return {
            subjectId: resolveCanonicalSubjectId(metadata?.subject ?? fallbackSubject ?? null),
            unitId: metadata?.unitId?.trim() || null,
        }
    }
    return {
        subjectId: resolveCanonicalSubjectId(fallbackSubject ?? null),
        unitId: null,
    }
}
